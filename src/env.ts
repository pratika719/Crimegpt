import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NESTJS_API_URL: z.string().url().default("http://127.0.0.1:3001/api"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missingOrInvalid = parsed.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  console.error("Invalid frontend environment configuration:", missingOrInvalid);
  throw new Error("Invalid frontend environment configuration.");
}

export const env = parsed.data;
export default env;
