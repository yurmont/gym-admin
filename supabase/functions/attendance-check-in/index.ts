import { z } from "npm:zod@3.24.2";
import { rpcHandler } from "../_shared/handler.ts";
const schema=z.object({identifier:z.string().trim().min(1).max(60),method:z.enum(["qr","huella","tarjeta","pin","manual","facial"]).default("manual")});
Deno.serve(rpcHandler({schema,rpc:"rpc_attendance_check_in",args:(v,u)=>({p_actor:u,p_identifier:v.identifier,p_method:v.method}),message:(data:any)=>data?.allowed?`Acceso permitido: ${data.member_name}`:`Acceso denegado: ${data?.reason??"sin autorización"}`}));
