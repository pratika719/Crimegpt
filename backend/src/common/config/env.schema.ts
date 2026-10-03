import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Database
  DATABASE_URL: z.string({
    required_error: 'DATABASE_URL is required',
  }).min(1),

  // Redis
  REDIS_URL: z.string({
    required_error: 'REDIS_URL is required',
  }).min(1),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Auth & Security
  AUTH_SECRET: z.string({
    required_error: 'AUTH_SECRET is required',
  }).min(1),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Google OAuth (Optional in dev/test, required for Google signin)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // AI & Embeddings
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  EMBEDDING_SERVICE_URL: z.string().optional(),
  EMBEDDING_PROVIDER: z.string().default('fastapi'),

  // Background Workers & Platform
  ENABLE_WORKER: z.string().default('false'),
  HEALTHCHECK_SECRET: z.string().optional(),
  DOCGEN_REPAIR_RETRY: z.string().default('true'),
  VERCEL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.errors
      .map((err) => `  [${err.path.join('.')}] ${err.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}
