import { z } from "npm:zod@3.24.2";
import { rpcHandler } from "../_shared/handler.ts";

const schema = z.object({
  member_id: z.string().uuid(),
  membership_plan_id: z.string().uuid(),
  start_date: z.string().date(),
  discount: z.number().min(0).default(0),
  pay_now: z.boolean().default(false),
  method: z
    .enum(["efectivo", "tarjeta", "transferencia", "yape", "plin"])
    .default("efectivo"),
  auto_renew: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});
Deno.serve(
  rpcHandler({
    schema,
    rpc: "rpc_create_membership",
    args: (v, u) => ({
      p_actor: u,
      p_member: v.member_id,
      p_plan: v.membership_plan_id,
      p_start: v.start_date,
      p_discount: v.discount,
      p_pay_now: v.pay_now,
      p_method: v.method,
      p_auto_renew: v.auto_renew,
      p_notes: v.notes ?? null,
    }),
    message: "Membresía creada correctamente.",
  }),
);
