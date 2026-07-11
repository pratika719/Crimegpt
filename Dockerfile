# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --no-audit --no-fund


FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Build-time placeholders only. Real runtime values come from docker-compose or the deployment platform.
ENV DATABASE_URL="postgresql://crimegpt:crimegpt@postgres:5432/crimegpt?schema=public"
ENV REDIS_URL="redis://redis:6379"
ENV AUTH_SECRET="docker-build-placeholder-auth-secret"
ENV GEMINI_API_KEY="docker-build-placeholder-gemini-key"
ENV EMBEDDING_PROVIDER="fastapi"
ENV EMBEDDING_SERVICE_URL="http://host.docker.internal:8000"
ENV HEALTHCHECK_SECRET="docker-build-placeholder-health-secret"
ENV SERVICE_NAME="crimegpt-app"
ENV LOG_LEVEL="info"

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npx prisma generate
RUN npm run build


FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Keep only the Prisma CLI/runtime pieces needed for `npx prisma migrate deploy` in the standalone image.
COPY --from=deps /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p .next node_modules/.bin
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]