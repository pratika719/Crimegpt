export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
    password: process.env.REDIS_PASSWORD,
  },
  auth: {
    secret: process.env.AUTH_SECRET,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
  },
  ai: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    },
    embedding: {
      serviceUrl: process.env.EMBEDDING_SERVICE_URL,
      provider: process.env.EMBEDDING_PROVIDER || 'fastapi',
    },
  },
  worker: {
    enabled: process.env.ENABLE_WORKER === 'true',
    healthcheckSecret: process.env.HEALTHCHECK_SECRET,
  },
});
