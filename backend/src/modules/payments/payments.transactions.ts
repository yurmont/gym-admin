import { membership } from "../memberships/memberships.lookup";
import { member } from "../members/members.lookup";
import type { Input } from "./dto/payments.schemas";
import {
  type Context,
  cents,
  money,
  code,
  required,
} from "../../common/business/context";
export async function registerPayment(
  ctx: Context,
  input: Input<"register-payment">,
): Promise<string> {
  if (input.member_id) await member(ctx, input.member_id);
  const ms = input.membership_id
    ? await membership(ctx, input.membership_id)
    : undefined;
  const total = Math.max(0, cents(input.amount) - cents(input.discount));
  const id = crypto.randomUUID();
  await ctx.db.query(
    `insert into public.payments
      (
        id,
        tenant_id,
        member_id,
        membership_id,
        code,
        concept,
        amount,
        discount,
        total,
        method,
        reference,
        status,
        paid_at,
        user_id
      )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pagado', now(), $12)`,
    [
      id,
      ctx.tenant,
      input.member_id ?? ms?.member_id ?? null,
      input.membership_id,
      code("PAG", id),
      input.concept,
      money(cents(input.amount)),
      money(cents(input.discount)),
      money(total),
      input.method,
      input.reference,
      ctx.actor,
    ],
  );
  if (ms) {
    const paid = Math.min(cents(ms.total), cents(ms.paid_amount) + total);
    const active = cents(ms.paid_amount) + total >= cents(ms.total);
    await ctx.db.query(
      `update public.memberships
      set
        paid_amount = $1,
        status = $2,
        updated_at = now()
      where id = $3 and tenant_id = $4`,
      [money(paid), active ? "activa" : "pendiente_pago", ms.id, ctx.tenant],
    );
    await ctx.db.query(
      `update public.members
      set
        status = $1,
        updated_at = now()
      where
        id = $2
        and tenant_id = $3
        and status in ('activo', 'inactivo', 'moroso')`,
      [active ? "activo" : "moroso", ms.member_id, ctx.tenant],
    );
  }
  return id;
}
export async function voidPayment(
  ctx: Context,
  paymentId: string,
): Promise<string> {
  const payment = await required(
    ctx.db,
    `select *
    from public.payments
    where id = $1 and tenant_id = $2 and status = 'pagado'
    for update`,
    [paymentId, ctx.tenant],
    "Pago no disponible para anulación",
  );
  await ctx.db.query(
    `update public.payments
    set
      status = 'anulado',
      voided_at = now(),
      voided_by = $1,
      updated_at = now()
    where id = $2 and tenant_id = $3`,
    [ctx.actor, paymentId, ctx.tenant],
  );
  if (payment.membership_id) {
    const ms = await membership(ctx, String(payment.membership_id));
    await ctx.db.query(
      `update public.memberships
      set
        paid_amount = $1,
        status = 'pendiente_pago',
        updated_at = now()
      where id = $2 and tenant_id = $3`,
      [
        money(Math.max(0, cents(ms.paid_amount) - cents(payment.total))),
        ms.id,
        ctx.tenant,
      ],
    );
    await ctx.db.query(
      `update public.members
      set
        status = 'moroso',
        updated_at = now()
      where id = $1 and tenant_id = $2 and status <> 'baja'`,
      [payment.member_id, ctx.tenant],
    );
  }
  return paymentId;
}
