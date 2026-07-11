import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDevelopment ? "debug" : "info"),
  base: {
    service: process.env.SERVICE_NAME ?? "crimegpt-app",
    environment: process.env.NODE_ENV ?? "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    isDevelopment && process.env.PINO_PRETTY !== "false"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  redact: {
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "headers.authorization",
      "headers.cookie",
      "DATABASE_URL",
      "REDIS_URL",
      "GEMINI_API_KEY",
      "AUTH_SECRET",
      "OPENAI_API_KEY",
      "GOOGLE_CLIENT_SECRET",
      "NEXTAUTH_SECRET",
      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.authorization",
      "*.cookie",
    ],
    censor: "[REDACTED]",
  },
});