import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService, Row } from "./database.service";

@Injectable()
export class TenantWritesRepository {
  constructor(private readonly db: DatabaseService) {}

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
      const assignments = columns.map((key, i) => `${key}=$${i + 1}`).join(",");
      rows = await this.db.query(
        `update public.${table}
         set ${assignments},updated_at=now()
         where id=$${values.length + 1}
           and tenant_id=$${values.length + 2}
         returning *`,
        [...values, id, tenant],
      );
    } else {
      const placeholders = values.map((_, i) => `$${i + 1}`).join(",");
      rows = await this.db.query(
        `insert into public.${table} (${columns.join(",")},tenant_id)
         values (${placeholders},$${values.length + 1})
         returning *`,
        [...values, tenant],
      );
    }
    if (!rows[0]) throw new NotFoundException("Recurso no disponible");
    return rows[0];
  }
}
