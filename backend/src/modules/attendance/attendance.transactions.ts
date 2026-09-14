import type { Row } from "../../database/database.service";
import type { Input } from "./dto/attendance.schemas";
import { type Context, cents, required } from "../../common/business/context";
export function attendanceDenial(
  person: Row,
  ms: Row | undefined,
  plan: Row | undefined,
  today: string,
  time: string,
): string | null {
  if (person.status === "baja") return "El socio está dado de baja";
  if (person.status === "congelado" || ms?.status === "congelada")
    return "La membresía está congelada";
  if (!ms) return "No tiene una membresía vigente";
  if (ms.status === "pendiente_pago" || cents(ms.paid_amount) < cents(ms.total))
    return "La membresía tiene saldo pendiente";
  if (String(ms.end_date) < today) return "La membresía está vencida";
  if (
    plan?.sessions_included != null &&
    Number(ms.sessions_used) >= Number(plan.sessions_included)
  )
    return "Agotó las sesiones incluidas";
  if (
    plan?.access_from &&
    plan.access_to &&
    (time < String(plan.access_from) || time > String(plan.access_to))
  )
    return "Está fuera del horario de su plan";
  return null;
}
export async function checkIn(
  ctx: Context,
  input: Input<"attendance-check-in">,
) {
  const person = await required(
    ctx.db,
    `select *
    from public.members
    where
      tenant_id = $1
      and deleted_at is null
      and (code = $2 or document_number = $2)
    limit 1`,
    [ctx.tenant, input.identifier],
    "No se encontró un socio con ese código o documento",
  );
  const existing = await ctx.db.query(
    `select id
    from public.attendances
    where
      tenant_id = $1
      and member_id = $2
      and result = 'permitido'
      and check_out is null
      and check_in::date = current_date`,
    [ctx.tenant, person.id],
  );
  if (existing.length) throw new Error("El socio ya registró su ingreso");
  const [ms] = await ctx.db.query(
    `select *, end_date::text
    from public.memberships
    where
      tenant_id = $1
      and member_id = $2
      and status in ('activa', 'pendiente_pago', 'congelada')
    order by public.memberships.end_date desc
    limit 1
    for update`,
    [ctx.tenant, person.id],
  );
  const [plan] = ms
    ? await ctx.db.query(
        `select * from public.membership_plans where id = $1 and tenant_id = $2`,
        [ms.membership_plan_id, ctx.tenant],
      )
    : [];
  const reason = attendanceDenial(person, ms, plan, ctx.today, ctx.time);
  const id = crypto.randomUUID();
  await ctx.db.query(
    `insert into public.attendances
      (
        id,
        tenant_id,
        member_id,
        membership_id,
        method,
        result,
        denied_reason,
        user_id
      )
    values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      ctx.tenant,
      person.id,
      ms?.id ?? null,
      input.method,
      reason ? "denegado" : "permitido",
      reason,
      ctx.actor,
    ],
  );
  if (!reason && plan?.sessions_included != null)
    await ctx.db.query(
      `update public.memberships
      set sessions_used = sessions_used + 1
      where id = $1 and tenant_id = $2`,
      [ms!.id, ctx.tenant],
    );
  return {
    id,
    allowed: !reason,
    member_name: `${person.first_name} ${person.last_name}`,
    reason,
  };
}
export async function checkOut(
  ctx: Context,
  input: Input<"attendance-check-out">,
) {
  const attendance = await required(
    ctx.db,
    `select check_in
    from public.attendances
    where
      id = $1
      and tenant_id = $2
      and result = 'permitido'
      and check_out is null
    for update`,
    [input.attendance_id, ctx.tenant],
    "Registro de ingreso no disponible",
  );
  const [clock] = await ctx.db.query(`select now() as now`);
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(String(clock.now)).getTime() -
        new Date(String(attendance.check_in)).getTime()) /
        60000,
    ),
  );
  await ctx.db.query(
    `update public.attendances
    set
      check_out = now(),
      minutes_stayed = $1
    where id = $2 and tenant_id = $3`,
    [minutes, input.attendance_id, ctx.tenant],
  );
  return input.attendance_id;
}
