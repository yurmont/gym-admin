import { createClient } from "@/lib/supabase/client";

export type ApiResult<T> = {
  success: boolean;
  message: string;
  data: T | null;
  errors?: Record<string, string[]>;
};

export async function invokeEdge<T = unknown>(
  name: string,
  payload: Record<string, unknown>,
): Promise<ApiResult<T>> {
  const { data, error } = await createClient().functions.invoke<ApiResult<T>>(
    name,
    { body: payload },
  );
  if (error) {
    try {
      const response = (error as { context?: Response }).context;
      const detail = response
        ? ((await response.clone().json()) as ApiResult<T>)
        : null;
      throw new Error(
        detail?.message ||
          "No se pudo completar la operación. Intenta nuevamente.",
      );
    } catch (cause) {
      if (cause instanceof Error && !cause.message.includes("JSON"))
        throw cause;
      throw new Error("No se pudo completar la operación. Intenta nuevamente.");
    }
  }
  if (!data?.success)
    throw new Error(data?.message || "No se pudo completar la operación");
  return data;
}
