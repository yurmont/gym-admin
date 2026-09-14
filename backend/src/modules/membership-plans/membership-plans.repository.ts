import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { TenantWritesRepository } from "../../database/tenant-writes.repository";

@Injectable()
export class MembershipPlansRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly writes: TenantWritesRepository,
  ) {}
  plans(tenant: string) {
    return this.db.query(
      "select * from public.membership_plans where tenant_id=$1 order by sort_order,id",
      [tenant],
    );
  }
  save(tenant: string, payload: Record<string, unknown>, id?: string) {
    return this.writes.save("membership_plans", tenant, payload, id);
  }
}
