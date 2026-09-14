"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const expect_1 = require("expect");
const fixture_cjs_1 = require("./fixture.cjs");
(0, node_test_1.describe)("Attendance service", () => {
  (0, node_test_1.it)(
    "allows a paid membership, consumes a session, and records checkout",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, run, row }) => {
        const id = await create({ pay_now: true });
        const result = await run("attendance-check-in", {
          identifier: "TEST-A",
        });
        (0, expect_1.expect)(result.allowed).toBe(true);
        (0, expect_1.expect)(
          Number((await row("memberships", id)).sessions_used),
        ).toBe(1);
        (0, expect_1.expect)(
          await run("attendance-check-out", { attendance_id: result.id }),
        ).toBe(result.id);
        const attendance = await row("attendances", result.id);
        (0, expect_1.expect)(attendance.check_out).not.toBe(null);
        (0, expect_1.expect)(
          Number(attendance.minutes_stayed),
        ).toBeGreaterThanOrEqual(0);
        await (0, expect_1.expect)(
          run("attendance-check-out", { attendance_id: result.id }),
        ).rejects.toThrow("Registro de ingreso no disponible");
      }),
  );
  (0, node_test_1.it)(
    "rejects duplicate open check-in without consuming another session",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, run, row }) => {
        const id = await create({ pay_now: true });
        await run("attendance-check-in", { identifier: "TEST-A" });
        await (0, expect_1.expect)(
          run("attendance-check-in", { identifier: "TEST-A" }),
        ).rejects.toThrow("El socio ya registró su ingreso");
        (0, expect_1.expect)(
          Number((await row("memberships", id)).sessions_used),
        ).toBe(1);
      }),
  );
  (0, node_test_1.it)(
    "records denied attendance when there is no membership",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ run, row }) => {
        const result = await run("attendance-check-in", {
          identifier: "TEST-NONE",
        });
        (0, expect_1.expect)(result.allowed).toBe(false);
        (0, expect_1.expect)(result.reason).toBe(
          "No tiene una membresía vigente",
        );
        (0, expect_1.expect)((await row("attendances", result.id)).result).toBe(
          "denegado",
        );
        await (0, expect_1.expect)(
          run("attendance-check-out", { attendance_id: result.id }),
        ).rejects.toThrow("Registro de ingreso no disponible");
      }),
  );
  (0, node_test_1.it)("denies attendance for unpaid membership", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, run, row }) => {
      const id = await create();
      const result = await run("attendance-check-in", {
        identifier: "TEST-A",
      });
      (0, expect_1.expect)(result.allowed).toBe(false);
      (0, expect_1.expect)(result.reason).toBe(
        "La membresía tiene saldo pendiente",
      );
      (0, expect_1.expect)(
        Number((await row("memberships", id)).sessions_used),
      ).toBe(0);
    }),
  );
  (0, node_test_1.it)("denies expired membership", () =>
    (0, fixture_cjs_1.withFixture)(
      async ({ create, run, fixture, addDays }) => {
        await create({
          start_date: addDays(fixture.today, -31),
          pay_now: true,
        });
        (0, expect_1.expect)(
          (await run("attendance-check-in", { identifier: "TEST-A" })).reason,
        ).toBe("La membresía está vencida");
      },
    ),
  );
  (0, node_test_1.it)("allows membership on its inclusive end date", () =>
    (0, fixture_cjs_1.withFixture)(
      async ({ create, run, fixture, addDays }) => {
        await create({
          start_date: addDays(fixture.today, -30),
          pay_now: true,
        });
        (0, expect_1.expect)(
          (await run("attendance-check-in", { identifier: "TEST-A" })).allowed,
        ).toBe(true);
      },
    ),
  );
  (0, node_test_1.it)("denies frozen membership", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, run, db }) => {
      const id = await create({ pay_now: true });
      await db.query(
        `update public.memberships set status = 'congelada' where id = $1`,
        [id],
      );
      (0, expect_1.expect)(
        (await run("attendance-check-in", { identifier: "TEST-A" })).reason,
      ).toBe("La membresía está congelada");
    }),
  );
  (0, node_test_1.it)("denies removed members", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, run, db, fixture }) => {
      await create({ pay_now: true });
      await db.query(
        `update public.members set status = 'baja' where id = $1`,
        [fixture.member],
      );
      (0, expect_1.expect)(
        (await run("attendance-check-in", { identifier: "TEST-A" })).reason,
      ).toBe("El socio está dado de baja");
    }),
  );
  (0, node_test_1.it)(
    "denies exhausted sessions without increasing the count",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, run, row, db }) => {
        const id = await create({ pay_now: true });
        await db.query(
          `update public.memberships set sessions_used = 2 where id = $1`,
          [id],
        );
        (0, expect_1.expect)(
          (await run("attendance-check-in", { identifier: "TEST-A" })).reason,
        ).toBe("Agotó las sesiones incluidas");
        (0, expect_1.expect)(
          Number((await row("memberships", id)).sessions_used),
        ).toBe(2);
      }),
  );
  (0, node_test_1.it)("denies attendance outside plan access hours", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, run, db, fixture }) => {
      await create({ pay_now: true });
      await db.query(
        `update public.membership_plans
        set
          access_from = (localtime + interval '1 hour')::time,
          access_to = (localtime + interval '1 hour')::time
        where id = $1`,
        [fixture.plan],
      );
      (0, expect_1.expect)(
        (await run("attendance-check-in", { identifier: "TEST-A" })).reason,
      ).toBe("Está fuera del horario de su plan");
    }),
  );
  (0, node_test_1.it)("rejects other tenant identifiers and checkouts", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, run, fixture }) => {
      await create({ pay_now: true });
      const result = await run("attendance-check-in", {
        identifier: "TEST-A",
      });
      await (0, expect_1.expect)(
        run("attendance-check-in", { identifier: "TEST-B" }),
      ).rejects.toThrow("No se encontró un socio");
      await (0, expect_1.expect)(
        run(
          "attendance-check-out",
          { attendance_id: result.id },
          fixture.otherAdmin,
        ),
      ).rejects.toThrow("Registro de ingreso no disponible");
    }),
  );
  (0, node_test_1.it)("ignores soft-deleted members", () =>
    (0, fixture_cjs_1.withFixture)(async ({ run, db, fixture }) => {
      await db.query(
        `update public.members set deleted_at = now() where id = $1`,
        [fixture.member],
      );
      await (0, expect_1.expect)(
        run("attendance-check-in", { identifier: "TEST-A" }),
      ).rejects.toThrow("No se encontró un socio");
    }),
  );
  (0, node_test_1.it)(
    "serializes simultaneous check-ins so exactly one is admitted",
    () =>
      (0, fixture_cjs_1.withCommittedFixture)(
        async ({ create, run, row, db, fixture }) => {
          const id = await create({ pay_now: true });
          const results = await Promise.allSettled([
            run("attendance-check-in", { identifier: "TEST-A" }),
            run("attendance-check-in", { identifier: "TEST-A" }),
          ]);
          (0, expect_1.expect)(
            results.filter((value) => value.status === "fulfilled"),
          ).toHaveLength(1);
          (0, expect_1.expect)(
            Number((await row("memberships", id)).sessions_used),
          ).toBe(1);
          (0, expect_1.expect)(
            Number(
              (
                await db.query(
                  `select count(*)
                  from public.attendances
                  where tenant_id = $1 and result = 'permitido'`,
                  [fixture.tenant],
                )
              )[0].count,
            ),
          ).toBe(1);
        },
      ),
  );
});
(0, node_test_1.describe)("Service authorization", () => {
  for (const role of ["instructor", "inactive"])
    (0, node_test_1.it)(`rejects ${role} operators`, () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, run, fixture }) => {
        const id = await create();
        await (0, expect_1.expect)(
          run("cancel-membership", { membership_id: id }, fixture[role]),
        ).rejects.toThrow("Usuario sin permisos");
      }),
    );
  (0, node_test_1.it)("allows reception operators", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, run, fixture, row }) => {
      const id = await create();
      await run(
        "register-payment",
        {
          member_id: fixture.member,
          membership_id: id,
          amount: 100,
          concept: "membresia",
          method: "efectivo",
          reference: null,
        },
        fixture.reception,
      );
      (0, expect_1.expect)((await row("memberships", id)).status).toBe(
        "activa",
      );
    }),
  );
});
