import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),

    AI_PROVIDER: z.enum(["groq", "gemini"]).optional().default("groq"),
    AI_FALLBACK_PROVIDER: z.enum(["groq", "gemini"]).optional().default("gemini"),
    ENABLE_AI_FALLBACK: z
      .enum(["true", "false"])
      .optional()
      .default("true")
      .transform((value) => value === "true"),
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL: z.string().optional().default("llama-3.3-70b-versatile"),
    GROQ_BASE_URL: z
      .string()
      .url()
      .optional()
      .default("https://api.groq.com/openai/v1"),
    GROQ_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .default(60_000),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional().default("gemini-2.0-flash"),

    AI_MAX_CONTEXT_CHARS: z.coerce
      .number()
      .int()
      .min(10_000)
      .optional()
      .default(50_000),
    AI_MAX_OUTPUT_TOKENS: z.coerce
      .number()
      .int()
      .min(500)
      .max(16_000)
      .optional()
      .default(4_000),
    AI_DOCUMENT_DAILY_LIMIT: z.coerce.number().int().positive().optional().default(5),
    AI_REGENERATE_DAILY_LIMIT: z.coerce.number().int().positive().optional().default(2),
    LAW_RETRIEVAL_TOP_K: z.coerce.number().int().positive().max(20).optional().default(4),
    AI_USE_LEGAL_RETRIEVAL: z.enum(["true", "false"]).optional().default("true"),
    AI_USE_EMBEDDINGS: z.enum(["true", "false"]).optional().default("true"),
    AI_USE_FALLBACK: z.enum(["true", "false"]).optional().default("true"),
    AI_USE_CACHE: z.enum(["true", "false"]).optional().default("true"),

    EMBEDDING_PROVIDER: z.literal("fastapi"),
    EMBEDDING_SERVICE_URL: z.string().url(),
    EMBEDDING_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .default(90_000),
    HEALTHCHECK_SECRET: z.string().optional(),
    LOG_LEVEL: z.string().optional(),
    SERVICE_NAME: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.AI_PROVIDER === "groq" && !value.GROQ_API_KEY?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["GROQ_API_KEY"],
        message: "GROQ_API_KEY is required when AI_PROVIDER=groq.",
      });
    }
    if (value.AI_PROVIDER === "gemini" && !value.GEMINI_API_KEY?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["GEMINI_API_KEY"],
        message: "GEMINI_API_KEY is required when AI_PROVIDER=gemini.",
      });
    }
    if (
      value.ENABLE_AI_FALLBACK &&
      value.AI_FALLBACK_PROVIDER === "groq" &&
      !value.GROQ_API_KEY?.trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["GROQ_API_KEY"],
        message: "GROQ_API_KEY is required for the enabled Groq fallback.",
      });
    }
    if (
      value.ENABLE_AI_FALLBACK &&
      value.AI_FALLBACK_PROVIDER === "gemini" &&
      !value.GEMINI_API_KEY?.trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["GEMINI_API_KEY"],
        message: "GEMINI_API_KEY is required for the enabled Gemini fallback.",
      });
    }
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
