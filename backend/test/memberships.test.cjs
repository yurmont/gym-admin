"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const expect_1 = require("expect");
const fixture_cjs_1 = require("./fixture.cjs");
(0, node_test_1.describe)("Membership service", () => {
  (0, node_test_1.it)(
    "creates a discounted pending membership and marks the member moroso",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, row, fixture }) => {
        const id = await create({ discount: 10 });
        const ms = await row("memberships", id);
        (0, expect_1.expect)(Number(ms.total)).toBe(90);
        (0, expect_1.expect)(Number(ms.paid_amount)).toBe(0);
        (0, expect_1.expect)(ms.status).toBe("pendiente_pago");
        (0, expect_1.expect)(ms.end_date).toBe(
          new Date(Date.parse(fixture.today) + 30 * 86400000)
            .toISOString()
            .slice(0, 10),
        );
        (0, expect_1.expect)(
          (await row("members", fixture.member)).status,
        ).toBe("moroso");
      }),
  );
  (0, node_test_1.it)(
    "pay-now creates one payment and activates the membership atomically",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, row, db }) => {
        const id = await create({ pay_now: true, discount: 10 });
        (0, expect_1.expect)((await row("memberships", id)).status).toBe(
          "activa",
        );
        (0, expect_1.expect)(
          Number((await row("memberships", id)).paid_amount),
        ).toBe(90);
        (0, expect_1.expect)(
          Number(
            (
              await db.query(
                "select count(*) from public.payments where membership_id=$1",
                [id],
              )
            )[0].count,
          ),
        ).toBe(1);
      }),
  );
  (0, node_test_1.it)(
    "activates a fully discounted membership without a zero payment",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, row, db }) => {
        const id = await create({ discount: 100, pay_now: true });
        (0, expect_1.expect)((await row("memberships", id)).status).toBe(
          "activa",
        );
        (0, expect_1.expect)(
          Number(
            (
              await db.query(
                "select count(*) from public.payments where membership_id=$1",
                [id],
              )
            )[0].count,
          ),
        ).toBe(0);
      }),
  );
  (0, node_test_1.it)("rejects a plan belonging to another tenant", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, fixture }) => {
      await (0, expect_1.expect)(
        create({ membership_plan_id: fixture.otherPlan }),
      ).rejects.toThrow("Plan no disponible");
    }),
  );
  (0, node_test_1.it)("rejects a member belonging to another tenant", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, fixture }) => {
      await (0, expect_1.expect)(
        create({ member_id: fixture.otherMember }),
      ).rejects.toThrow("Socio no disponible");
    }),
  );
  (0, node_test_1.it)("rejects an inactive plan", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, fixture, db }) => {
      await db.query(
        "update public.membership_plans set is_active=false where id=$1",
        [fixture.plan],
      );
      await (0, expect_1.expect)(create()).rejects.toThrow(
        "Plan no disponible",
      );
    }),
  );
  (0, node_test_1.it)("rejects a removed member", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, fixture, db }) => {
      await db.query("update public.members set status='baja' where id=$1", [
        fixture.member,
      ]);
      await (0, expect_1.expect)(create()).rejects.toThrow(
        "Socio no disponible",
      );
    }),
  );
  (0, node_test_1.it)(
    "renews after the old end date and preserves auto-renew",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, run, row, addDays }) => {
        const old = await create({ auto_renew: true });
        const oldRow = await row("memberships", old);
        const renewal = String(
          await run("renew-membership", { membership_id: old, pay_now: true }),
        );
        const ms = await row("memberships", renewal);
        (0, expect_1.expect)(ms.start_date).toBe(
          addDays(String(oldRow.end_date), 1),
        );
        (0, expect_1.expect)(ms.auto_renew).toBe(true);
        (0, expect_1.expect)(ms.status).toBe("activa");
        (0, expect_1.expect)(ms.notes).toBe(`Renovación de ${oldRow.code}`);
      }),
  );
  (0, node_test_1.it)("renews an expired membership from today", () =>
    (0, fixture_cjs_1.withFixture)(
      async ({ create, run, row, fixture, addDays }) => {
        const old = await create({ start_date: addDays(fixture.today, -60) });
        const renewal = String(
          await run("renew-membership", { membership_id: old }),
        );
        (0, expect_1.expect)(
          (await row("memberships", renewal)).start_date,
        ).toBe(fixture.today);
      },
    ),
  );
  (0, node_test_1.it)(
    "cancels a membership and rejects repeated cancellation",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, run, row }) => {
        const id = await create();
        (0, expect_1.expect)(
          await run("cancel-membership", { membership_id: id }),
        ).toBe(id);
        (0, expect_1.expect)((await row("memberships", id)).status).toBe(
          "cancelada",
        );
        await (0, expect_1.expect)(
          run("cancel-membership", { membership_id: id }),
        ).rejects.toThrow("Membresía no disponible");
      }),
  );
  (0, node_test_1.it)(
    "prevents another tenant from renewing or cancelling",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, run, fixture }) => {
        const id = await create();
        await (0, expect_1.expect)(
          run("renew-membership", { membership_id: id }, fixture.otherAdmin),
        ).rejects.toThrow("Membresía no encontrada");
        await (0, expect_1.expect)(
          run("cancel-membership", { membership_id: id }, fixture.otherAdmin),
        ).rejects.toThrow("Membresía no disponible");
      }),
  );
  (0, node_test_1.it)("rejects invalid payloads before any writes", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, fixture, db }) => {
      await (0, expect_1.expect)(create({ discount: -1 })).rejects.toThrow();
      (0, expect_1.expect)(
        Number(
          (
            await db.query(
              "select count(*) from public.memberships where tenant_id=$1",
              [fixture.tenant],
            )
          )[0].count,
        ),
      ).toBe(0);
    }),
  );
  (0, node_test_1.it)(
    "rolls back membership creation if its payment write fails",
    () =>
      (0, fixture_cjs_1.withCommittedFixture)(
        async ({ create, database, fixture, db }) => {
          // A local trigger forces the second write to fail, exercising the real outer transaction.
          const trigger = `test_payment_failure_${fixture.tenant.replaceAll("-", "")}`;
          const functionName = trigger;
          await db.query(
            `create function public.${functionName}() returns trigger language plpgsql as $$ begin if NEW.tenant_id='${fixture.tenant}'::uuid then raise exception 'Forced payment failure'; end if; return NEW; end $$`,
          );
          await db.query(
            `create trigger ${trigger} before insert on public.payments for each row execute function public.${functionName}()`,
          );
          try {
            await (0, expect_1.expect)(
              create({ pay_now: true }),
            ).rejects.toThrow("Forced payment failure");
            (0, expect_1.expect)(
              Number(
                (
                  await db.query(
                    "select count(*) from public.memberships where tenant_id=$1",
                    [fixture.tenant],
                  )
                )[0].count,
              ),
            ).toBe(0);
            (0, expect_1.expect)(
              Number(
                (
                  await db.query(
                    "select count(*) from public.payments where tenant_id=$1",
                    [fixture.tenant],
                  )
                )[0].count,
              ),
            ).toBe(0);
          } finally {
            await database.transaction(async (connection) => {
              await connection.query(
                `drop trigger ${trigger} on public.payments`,
              );
              await connection.query(`drop function public.${functionName}()`);
            });
          }
        },
      ),
  );
});
