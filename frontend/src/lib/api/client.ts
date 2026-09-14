import { firebaseAuth } from "@/lib/firebase/client";

export type ApiResult<T> = {
  success: boolean;
  message: string;
  data: T | null;
  errors?: Record<string, string[]>;
};
export async function apiRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<ApiResult<T>> {
  const auth = firebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Tu sesión venció. Vuelve a ingresar.");
  const base =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
  const send = async (refresh: boolean) =>
    fetch(`${base.replace(/\/$/, "")}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await user.getIdToken(refresh)}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  let response = await send(false);
  if (response.status === 401) response = await send(true);
  let result: ApiResult<T>;
  try {
    result = (await response.json()) as ApiResult<T>;
  } catch {
    throw new Error("No se pudo contactar al servidor. Intenta nuevamente.");
  }
  if (!response.ok || !result.success)
    throw new Error(result.message || "No se pudo completar la operación");
  if (auth.currentUser?.uid !== user.uid)
    throw new Error("La sesión cambió. Vuelve a intentar.");
  return result;
}
export async function apiData<T>(path: string): Promise<T> {
  const result = await apiRequest<T>(path);
  if (result.data === null) throw new Error("Respuesta no válida del servidor");
  return result.data;
}
