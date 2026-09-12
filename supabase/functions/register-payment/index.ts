import { z } from "npm:zod@3.24.2";
import { rpcHandler } from "../_shared/handler.ts";
const schema = z.object({
  member_id: z.string().uuid().nullable(),
  membership_id: z.string().uuid().nullable(),
  concept: z.enum([
    "membresia",
    "matricula",
    "clase_suelta",
    "producto",
    "servicio",
    "penalidad",
    "otro",
  ]),
  amount: z.number().positive(),
  discount: z.number().min(0).default(0),
  method: z.enum(["efectivo", "tarjeta", "transferencia", "yape", "plin"]),
  reference: z.string().max(80).nullable(),
});
Deno.serve(
  rpcHandler({
    schema,
    rpc: "rpc_register_payment",
    args: (v, u) => ({
      p_actor: u,
      p_member: v.member_id,
      p_membership: v.membership_id,
      p_concept: v.concept,
      p_amount: v.amount,
      p_discount: v.discount,
      p_method: v.method,
      p_reference: v.reference,
    }),
    message: "Pago registrado correctamente.",
  }),
);
