import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService, type Row } from "../database/database";

@Injectable()
export class ResourcesRepository {
  constructor(private readonly db: DatabaseService) {}
  members(tenant: string, q = "", limit = 100) {
    return this.db.query(
      "select id,code,first_name,last_name,document_number,phone,email,status,joined_at::text,photo_path from public.members where tenant_id=$1 and ($2='' or first_name ilike $3 or last_name ilike $3 or code ilike $3 or document_number ilike $3 or phone ilike $3) order by last_name,id limit $4",
      [tenant, q, `%${q}%`, limit],
    );
  }
  memberOptions(tenant: string) {
    return this.db.query(
      "select id,code,first_name,last_name from public.members where tenant_id=$1 and status<>'baja' order by last_name,id",
      [tenant],
    );
  }
  plans(tenant: string) {
    return this.db.query(
      "select * from public.membership_plans where tenant_id=$1 order by sort_order,id",
      [tenant],
    );
  }
  memberships(tenant: string, pending = false) {
    return this.db.query(
      `select ms.id,ms.code,ms.member_id,ms.start_date::text,ms.end_date::text,ms.total,ms.paid_amount,ms.status,
      json_build_object('id',m.id,'code',m.code,'first_name',m.first_name,'last_name',m.last_name) as member,
      json_build_object('first_name',m.first_name,'last_name',m.last_name) as members,
      json_build_object('id',p.id,'name',p.name,'color',p.color) as plan
      from public.memberships ms join public.members m on m.id=ms.member_id and m.tenant_id=ms.tenant_id join public.membership_plans p on p.id=ms.membership_plan_id and p.tenant_id=ms.tenant_id
      where ms.tenant_id=$1 and ($2=false or ms.status='pendiente_pago') order by ms.start_date desc,ms.id ${pending ? "" : "limit 100"}`,
      [tenant, pending],
    );
  }
  payments(tenant: string, recent = false) {
    return this.db.query(
      `select p.id,p.code,p.concept,p.total,p.method,p.reference,p.status,p.paid_at,
      case when m.id is null then null else json_build_object('first_name',m.first_name,'last_name',m.last_name) end as members
      from public.payments p left join public.members m on m.id=p.member_id and m.tenant_id=p.tenant_id where p.tenant_id=$1 and ($2=false or p.status='pagado') order by p.paid_at desc,p.id limit $3`,
      [tenant, recent, recent ? 5 : 100],
    );
  }
  attendance(tenant: string, since: string) {
    return this.db.query(
      "select a.id,a.check_in,a.check_out,a.minutes_stayed,a.result,a.denied_reason,json_build_object('code',m.code,'first_name',m.first_name,'last_name',m.last_name) as members from public.attendances a join public.members m on m.id=a.member_id and m.tenant_id=a.tenant_id where a.tenant_id=$1 and a.check_in>=$2::timestamptz order by a.check_in desc,a.id limit 100",
      [tenant, since],
    );
  }
  async dashboard(tenant: string, today: string, month: string) {
    const [[counts], [attendance], [income], recent] = await Promise.all([
      this.db.query(
        "select count(*) filter (where status='activo')::int as active,count(*) filter (where status='moroso')::int as overdue from public.members where tenant_id=$1",
        [tenant],
      ),
      this.db.query(
        "select count(*)::int as attendance from public.attendances where tenant_id=$1 and result='permitido' and check_in>=$2::timestamptz",
        [tenant, today],
      ),
      this.db.query(
        "select coalesce(sum(total),0) as income from public.payments where tenant_id=$1 and status='pagado' and paid_at>=$2::timestamptz",
        [tenant, month],
      ),
      this.payments(tenant, true),
    ]);
    return { ...counts, ...attendance, income: Number(income.income), recent };
  }
  async save(
    table: "members" | "membership_plans",
    tenant: string,
    payload: Record<string, unknown>,
    id?: string,
  ) {
    const allowed =
      table === "members"
        ? ["first_name", "last_name", "document_number", "phone", "email"]
        : [
            "name",
            "price",
            "duration_days",
            "sessions_included",
            "color",
            "is_active",
          ];
    const entries = Object.entries(payload).filter(([key]) =>
      allowed.includes(key),
    );
    const columns = entries.map(([key]) => key);
    const values = entries.map(([, value]) => value);
    let rows: Row[];
    if (id) {
      rows = await this.db.query(
        `update public.${table} set ${columns.map((key, i) => `${key}=$${i + 1}`).join(",")},updated_at=now() where id=$${values.length + 1} and tenant_id=$${values.length + 2} returning *`,
        [...values, id, tenant],
      );
    } else {
      rows = await this.db.query(
        `insert into public.${table} (${columns.join(",")},tenant_id) values (${values.map((_, i) => `$${i + 1}`).join(",")},$${values.length + 1}) returning *`,
        [...values, tenant],
      );
    }
    if (!rows[0]) throw new NotFoundException("Recurso no disponible");
    return rows[0];
  }
}
