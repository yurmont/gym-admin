import { createClient } from "npm:@supabase/supabase-js@2";
import type { ZodType } from "npm:zod@3.24.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

type Config<T> = {
  schema: ZodType<T>;
  rpc: string;
  args: (body: T, userId: string) => Record<string, unknown>;
  message: string | ((data: unknown) => string);
};

export function rpcHandler<T>(config: Config<T>) {
  return async (request: Request) => {
    if (request.method === "OPTIONS")
      return new Response("ok", { headers: cors });
    if (request.method !== "POST")
      return json(
        { success: false, message: "Método no permitido", data: null },
        405,
      );
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization)
        return json(
          { success: false, message: "Sesión no válida", data: null },
          401,
        );
      const url = Deno.env.get("SUPABASE_URL")!;
      const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const authClient = createClient(url, anon, {
        global: { headers: { Authorization: authorization } },
      });
      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser();
      if (authError || !user)
        return json(
          {
            success: false,
            message: "Tu sesión venció. Vuelve a ingresar.",
            data: null,
          },
          401,
        );
      const parsed = config.schema.safeParse(await request.json());
      if (!parsed.success)
        return json(
          {
            success: false,
            message: "Revisa los datos enviados.",
            data: null,
            errors: parsed.error.flatten().fieldErrors,
          },
          422,
        );
      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false },
      });
      const { data, error } = await admin.rpc(
        config.rpc,
        config.args(parsed.data, user.id),
      );
      if (error) throw error;
      return json({
        success: true,
        message:
          typeof config.message === "function"
            ? config.message(data)
            : config.message,
        data,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación";
      return json({ success: false, message, data: null }, 400);
    }
  };
}
