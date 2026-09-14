import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class MembershipsRepository {
  constructor(private readonly db: DatabaseService) {}
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
}
