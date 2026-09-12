import { z } from "npm:zod@3.24.2";
import { rpcHandler } from "../_shared/handler.ts";
const schema = z.object({ attendance_id: z.string().uuid() });
Deno.serve(
  rpcHandler({
    schema,
    rpc: "rpc_attendance_check_out",
    args: (v, u) => ({ p_actor: u, p_attendance: v.attendance_id }),
    message: "Salida registrada correctamente.",
  }),
);
