import { membership } from "../memberships/memberships.lookup";
import type { Input } from "./dto/memberships.schemas";
import {
  type Context,
  cents,
  money,
  code,
  addDays,
  required,
} from "../../common/business/context";
import { registerPayment } from "../payments/payments.transactions";
export async function createMembership(
  ctx: Context,
  input: Input<"create-membership">,
): Promise<string> {
  const plan = await required(
    ctx.db,
    `select *
    from public.membership_plans
    where id = $1 and tenant_id = $2 and is_active
    for share`,
    [input.membership_plan_id, ctx.tenant],
    "Plan no disponible",
  );
  await required(
    ctx.db,
    `select id
    from public.members
    where id = $1 and tenant_id = $2 and status <> 'baja'`,
    [input.member_id, ctx.tenant],
    "Socio no disponible",
  );
  const total = Math.max(0, cents(plan.price) - cents(input.discount));
  const id = crypto.randomUUID();
  await ctx.db.query(
    `insert into public.memberships
      (
        id,
        tenant_id,
        member_id,
        membership_plan_id,
        code,
        start_date,
        end_date,
        price,
        discount,
        total,
        paid_amount,
        status,
        auto_renew,
        sold_by_user_id,
        notes
      )
    values
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        0,
        'pendiente_pago',
        $11,
        $12,
        $13
      )`,
    [
      id,
      ctx.tenant,
      input.member_id,
      input.membership_plan_id,
      code("MEM", id),
      input.start_date,
      addDays(input.start_date, Number(plan.duration_days)),
      plan.price,
      money(cents(input.discount)),
      money(total),
      input.auto_renew,
      ctx.actor,
      input.notes ?? null,
    ],
  );
  if (input.pay_now && total > 0) {
    await registerPayment(ctx, {
      member_id: input.member_id,
      membership_id: id,
      concept: "membresia",
      amount: Number(plan.price),
      discount: input.discount,
      method: input.method,
      reference: null,
    });
  } else {
    await ctx.db.query(
      `update public.members
      set
        status = 'moroso',
        updated_at = now()
      where
        id = $1
        and tenant_id = $2
        and status in ('activo', 'inactivo', 'moroso')`,
      [input.member_id, ctx.tenant],
    );
  }
  if (total === 0) {
    await ctx.db.query(
      `update public.memberships
      set status = 'activa'
      where id = $1 and tenant_id = $2`,
      [id, ctx.tenant],
    );
    await ctx.db.query(
      `update public.members
      set status = 'activo'
      where id = $1 and tenant_id = $2`,
      [input.member_id, ctx.tenant],
    );
  }
  return id;
}
export async function renewMembership(
  ctx: Context,
  input: Input<"renew-membership">,
) {
  const old = await membership(ctx, input.membership_id);
  const nextDay = addDays(String(old.end_date), 1);
  return await createMembership(ctx, {
    member_id: String(old.member_id),
    membership_plan_id: String(old.membership_plan_id),
    start_date: nextDay > ctx.today ? nextDay : ctx.today,
    discount: input.discount,
    pay_now: input.pay_now,
    method: input.method,
    auto_renew: Boolean(old.auto_renew),
    notes: `Renovación de ${old.code}`,
  });
}
export async function cancelMembership(
  ctx: Context,
  input: Input<"cancel-membership">,
) {
  await required(
    ctx.db,
    `update public.memberships
    set
      status = 'cancelada',
      updated_at = now()
    where id = $1 and tenant_id = $2 and status not in ('cancelada', 'vencida')
    returning id`,
    [input.membership_id, ctx.tenant],
    "Membresía no disponible",
  );
  return input.membership_id;
}
