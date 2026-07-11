import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  AUTH_SECRET: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),

  EMBEDDING_PROVIDER: z.literal("fastapi"),
  EMBEDDING_SERVICE_URL: z.string().url(),

  HEALTHCHECK_SECRET: z.string().optional(),

  LOG_LEVEL: z.string().optional(),
  SERVICE_NAME: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missingOrInvalid = parsed.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  console.error("Invalid environment configuration:", missingOrInvalid);

  throw new Error("Invalid environment configuration.");
}

if (parsed.data.NODE_ENV === "production" && !parsed.data.HEALTHCHECK_SECRET) {
  throw new Error("HEALTHCHECK_SECRET is required in production.");
}

export const env = parsed.data;
export default env;
