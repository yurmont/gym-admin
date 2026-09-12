import { z } from "npm:zod@3.24.2";
import { rpcHandler } from "../_shared/handler.ts";
const schema = z.object({ payment_id: z.string().uuid() });
Deno.serve(
  rpcHandler({
    schema,
    rpc: "rpc_void_payment",
    args: (v, u) => ({ p_actor: u, p_payment: v.payment_id }),
    message: "Pago anulado y saldo revertido.",
  }),
);
