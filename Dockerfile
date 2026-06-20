# syntax=docker/dockerfile:1
# Ameris portal — TanStack Start (Nitro node-server). Build → run on Node 24.

# ---- Build stage ----
FROM node:24-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_APP_URL is inlined into the CLIENT bundle at build time, so it must be the
# real public URL. In Coolify, set VITE_APP_URL as a *Build Variable*.
ARG VITE_APP_URL=http://localhost:3000
ENV VITE_APP_URL=${VITE_APP_URL}
RUN npm run build

# ---- Runtime stage ----
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Production deps so modules kept external from the bundle resolve at runtime.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Built server + SQL migrations (applied on boot against DATABASE_URL).
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000

# Container health → reuses the app's /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
