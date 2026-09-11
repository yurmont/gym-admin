import { z } from "npm:zod@3.24.2";
import { rpcHandler } from "../_shared/handler.ts";
const schema=z.object({membership_id:z.string().uuid()});
Deno.serve(rpcHandler({schema,rpc:"rpc_cancel_membership",args:(v,u)=>({p_actor:u,p_membership:v.membership_id}),message:"Membresía cancelada."}));
