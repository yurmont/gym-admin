"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const expect_1 = require("expect");
const fixture_cjs_1 = require("./fixture.cjs");
(0, node_test_1.describe)("Payment service", () => {
  (0, node_test_1.it)(
    "tracks partial and full payments and updates member status",
    () =>
      (0, fixture_cjs_1.withFixture)(async ({ create, pay, row, fixture }) => {
        const id = await create({ discount: 10 });
        await pay(id, 40);
        (0, expect_1.expect)(
          Number((await row("memberships", id)).paid_amount),
        ).toBe(40);
        (0, expect_1.expect)((await row("memberships", id)).status).toBe(
          "pendiente_pago",
        );
        await pay(id, 50);
        (0, expect_1.expect)(
          Number((await row("memberships", id)).paid_amount),
        ).toBe(90);
        (0, expect_1.expect)((await row("memberships", id)).status).toBe(
          "activa",
        );
        (0, expect_1.expect)(
          (await row("members", fixture.member)).status,
        ).toBe("activo");
      }),
  );
  (0, node_test_1.it)(
    "handles decimal money without floating point balance errors",
    () =>
      (0, fixture_cjs_1.withFixture)(
        async ({ create, pay, row, fixture, db }) => {
          await db.query(
            `update public.membership_plans set price = 0.30 where id = $1`,
            [fixture.plan],
          );
          const id = await create();
          await pay(id, 0.1);
          await pay(id, 0.2);
          (0, expect_1.expect)(
            Number((await row("memberships", id)).paid_amount),
          ).toBe(0.3);
          (0, expect_1.expect)((await row("memberships", id)).status).toBe(
            "activa",
          );
        },
      ),
  );
  (0, node_test_1.it)("caps paid amount at the membership total", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, pay, row }) => {
      const id = await create();
      await pay(id, 120);
      (0, expect_1.expect)(
        Number((await row("memberships", id)).paid_amount),
      ).toBe(100);
    }),
  );
  (0, node_test_1.it)("records discounted standalone payments", () =>
    (0, fixture_cjs_1.withFixture)(async ({ pay, row }) => {
      const id = await pay(null, 50, { discount: 10, concept: "otro" });
      (0, expect_1.expect)(Number((await row("payments", id)).total)).toBe(40);
      (0, expect_1.expect)((await row("payments", id)).membership_id).toBe(
        null,
      );
    }),
  );
  (0, node_test_1.it)("can infer the member from a membership", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, pay, row, fixture }) => {
      const id = await create();
      const payment = await pay(id, 10, { member_id: null });
      (0, expect_1.expect)((await row("payments", payment)).member_id).toBe(
        fixture.member,
      );
    }),
  );
  for (const overrides of [
    { amount: 0 },
    { discount: -1 },
    { method: "invalid" },
  ])
    (0, node_test_1.it)(
      `rejects invalid payment ${JSON.stringify(overrides)}`,
      () =>
        (0, fixture_cjs_1.withFixture)(async ({ pay }) => {
          await (0, expect_1.expect)(
            pay(null, 10, overrides),
          ).rejects.toThrow();
        }),
    );
  (0, node_test_1.it)("rejects cross-tenant members and memberships", () =>
    (0, fixture_cjs_1.withFixture)(async ({ create, pay, run, fixture }) => {
      const id = await create();
      await (0, expect_1.expect)(
        pay(null, 10, { member_id: fixture.otherMember }),
      ).rejects.toThrow("Socio no encontrado");
      await (0, expect_1.expect)(
        run(
          "register-payment",
          {
            member_id: null,
            membership_id: id,
            amount: 10,
            concept: "membresia",
            method: "efectivo",
            reference: null,
          },
          fixture.otherAdmin,
        ),
      ).rejects.toThrow("Membresía no encontrada");
    }),
  );
  (0, node_test_1.it)(
    "voids payment, restores debt, and records audit fields",
    () =>
      (0, fixture_cjs_1.withFixture)(
        async ({ create, pay, run, row, fixture }) => {
          const id = await create();
          await pay(id, 40);
          const payment = await pay(id, 60);
          (0, expect_1.expect)(
            await run("void-payment", { payment_id: payment }),
          ).toBe(payment);
          const result = await row("payments", payment);
          (0, expect_1.expect)(result.status).toBe("anulado");
          (0, expect_1.expect)(result.voided_by).toBe(fixture.admin);
          (0, expect_1.expect)(result.voided_at).not.toBe(null);
          (0, expect_1.expect)(
            Number((await row("memberships", id)).paid_amount),
          ).toBe(40);
          (0, expect_1.expect)((await row("memberships", id)).status).toBe(
            "pendiente_pago",
          );
          (0, expect_1.expect)(
            (await row("members", fixture.member)).status,
          ).toBe("moroso");
          await (0, expect_1.expect)(
            run("void-payment", { payment_id: payment }),
          ).rejects.toThrow("Pago no disponible para anulación");
        },
      ),
  );
  (0, node_test_1.it)("prevents other tenants from voiding payments", () =>
    (0, fixture_cjs_1.withFixture)(async ({ pay, run, fixture }) => {
      const payment = await pay(null, 10);
      await (0, expect_1.expect)(
        run("void-payment", { payment_id: payment }, fixture.otherAdmin),
      ).rejects.toThrow("Pago no disponible para anulación");
    }),
  );
  (0, node_test_1.it)(
    "serializes simultaneous payments without losing balance updates",
    () =>
      (0, fixture_cjs_1.withCommittedFixture)(async ({ create, pay, row }) => {
        const id = await create();
        await Promise.all([pay(id, 40), pay(id, 60)]);
        (0, expect_1.expect)(
          Number((await row("memberships", id)).paid_amount),
        ).toBe(100);
        (0, expect_1.expect)((await row("memberships", id)).status).toBe(
          "activa",
        );
      }),
  );
  (0, node_test_1.it)(
    "serializes concurrent voids so only one request succeeds",
    () =>
      (0, fixture_cjs_1.withCommittedFixture)(
        async ({ create, pay, run, row }) => {
          const id = await create();
          const payment = await pay(id, 100);
          const outcomes = await Promise.allSettled([
            run("void-payment", { payment_id: payment }),
            run("void-payment", { payment_id: payment }),
          ]);
          (0, expect_1.expect)(
            outcomes.filter((result) => result.status === "fulfilled"),
          ).toHaveLength(1);
          (0, expect_1.expect)(
            Number((await row("memberships", id)).paid_amount),
          ).toBe(0);
        },
      ),
  );
});
