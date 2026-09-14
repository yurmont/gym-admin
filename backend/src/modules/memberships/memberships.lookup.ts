import { required, type Context } from "../../common/business/context";
import type { Row } from "../../database/database.service";
export function membership(ctx: Context, id: string): Promise<Row> {
  return required(
    ctx.db,
    "select *, start_date::text, end_date::text from public.memberships where id=$1 and tenant_id=$2 for update",
    [id, ctx.tenant],
    "Membresía no encontrada",
  );
}
