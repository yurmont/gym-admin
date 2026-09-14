import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { TenantWritesRepository } from "../../database/tenant-writes.repository";

@Injectable()
export class MembersRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly writes: TenantWritesRepository,
  ) {}

  members(tenant: string, q = "", limit = 100) {
    return this.db.query(
      `select
        id,
        code,
        first_name,
        last_name,
        document_number,
        phone,
        email,
        status,
        joined_at::text,
        photo_path
      from public.members
      where
        tenant_id = $1
        and (
          $2 = ''
          or first_name ilike $3
          or last_name ilike $3
          or code ilike $3
          or document_number ilike $3
          or phone ilike $3
        )
      order by last_name, id
      limit $4`,
      [tenant, q, `%${q}%`, limit],
    );
  }

  memberOptions(tenant: string) {
    return this.db.query(
      `select id, code, first_name, last_name
      from public.members
      where tenant_id = $1 and status <> 'baja'
      order by last_name, id`,
      [tenant],
    );
  }

  save(tenant: string, payload: Record<string, unknown>, id?: string) {
    return this.writes.save("members", tenant, payload, id);
  }
}
