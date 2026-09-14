import { required, type Context } from "../../common/business/context";
import type { Row } from "../../database/database.service";
export function member(ctx: Context, id: string): Promise<Row> {
  return required(
    ctx.db,
    "select * from public.members where id=$1 and tenant_id=$2",
    [id, ctx.tenant],
    "Socio no encontrado",
  );
}
