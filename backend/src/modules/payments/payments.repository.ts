import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class PaymentsRepository {
  constructor(private readonly db: DatabaseService) {}
  payments(tenant: string, recent = false) {
    return this.db.query(
      `select p.id,p.code,p.concept,p.total,p.method,p.reference,p.status,p.paid_at,
      case when m.id is null then null else json_build_object('first_name',m.first_name,'last_name',m.last_name) end as members
      from public.payments p left join public.members m on m.id=p.member_id and m.tenant_id=p.tenant_id where p.tenant_id=$1 and ($2=false or p.status='pagado') order by p.paid_at desc,p.id limit $3`,
      [tenant, recent, recent ? 5 : 100],
    );
  }
}
