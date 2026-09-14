import { z } from "zod";

export function validateConfig(env: Record<string, unknown>) {
  const schema = z.object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    DATABASE_URL: z
      .string()
      .url()
      .refine((s) => /^postgres(ql)?:/.test(s)),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(10).default(3),
    FIREBASE_PROJECT_ID: z.string().min(1),
    GCS_BUCKET_NAME: z.string().min(1),
    CORS_ORIGINS: z.string().min(1).default("http://localhost:3000"),
    FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  });
  const result = schema.safeParse(env);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid backend configuration: ${fields}`);
  }
  if (
    result.data.NODE_ENV === "production" &&
    result.data.FIREBASE_AUTH_EMULATOR_HOST
  )
    throw new Error("Auth emulator cannot be used in production");
  const origins = result.data.CORS_ORIGINS.split(",").map((s) => s.trim());
  if (
    origins.some((s) => {
      try {
        return new URL(s).origin !== s;
      } catch {
        return true;
      }
    })
  )
    throw new Error("CORS_ORIGINS must contain explicit origins");
  return { ...env, ...result.data };
}
