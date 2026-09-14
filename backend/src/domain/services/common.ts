import { NotFoundException } from "@nestjs/common";
import type { Connection, Row } from "../../database/database";
export type Context = {
  db: Connection;
  actor: string;
  tenant: string;
  today: string;
  time: string;
};
export const cents = (value: unknown) => Math.round(Number(value) * 100);
export const money = (value: number) => (value / 100).toFixed(2);
export const code = (prefix: string, id: string) =>
  `${prefix}-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export async function required(
  db: Connection,
  sql: string,
  values: unknown[],
  message: string,
): Promise<Row> {
  const [row] = await db.query(sql, values);
  if (!row) throw new NotFoundException(message);
  return row;
}
export function membership(ctx: Context, id: string): Promise<Row> {
  return required(
    ctx.db,
    "select *, start_date::text, end_date::text from public.memberships where id=$1 and tenant_id=$2 for update",
    [id, ctx.tenant],
    "Membresía no encontrada",
  );
}
export function member(ctx: Context, id: string): Promise<Row> {
  return required(
    ctx.db,
    "select * from public.members where id=$1 and tenant_id=$2",
    [id, ctx.tenant],
    "Socio no encontrado",
  );
}
