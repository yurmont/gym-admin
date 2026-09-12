import { z } from "npm:zod@3.24.2";
import { rpcHandler } from "../_shared/handler.ts";
const schema = z.object({
  membership_id: z.string().uuid(),
  discount: z.number().min(0).default(0),
  pay_now: z.boolean().default(false),
  method: z
    .enum(["efectivo", "tarjeta", "transferencia", "yape", "plin"])
    .default("efectivo"),
});
Deno.serve(
  rpcHandler({
    schema,
    rpc: "rpc_renew_membership",
    args: (v, u) => ({
      p_actor: u,
      p_membership: v.membership_id,
      p_discount: v.discount,
      p_pay_now: v.pay_now,
      p_method: v.method,
    }),
    message: "Membresía renovada correctamente.",
  }),
);
