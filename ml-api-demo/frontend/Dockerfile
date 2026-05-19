# syntax=docker/dockerfile:1
# Three-stage build for the Next.js frontend using standalone output.
#   1. deps    — install npm dependencies (cached layer)
#   2. builder — compile the Next.js app
#   3. runtime — minimal alpine image with just the standalone bundle, non-root

# ---------------------------------------------------------------------------
# Stage 1: deps
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: builder
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .

# CNA 14 with App Router doesn't always create a public/ directory; the
# runtime COPY requires it to exist, so ensure it does even when empty.
RUN mkdir -p public && npm run build

# ---------------------------------------------------------------------------
# Stage 3: runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user. Group name `nodejs` matches the Next.js Docker convention.
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs -s /sbin/nologin nextjs

# Standalone bundle ships its own pruned node_modules; we only copy the
# three artifact directories Next.js produces (no devDependencies leak in).
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
