# syntax=docker/dockerfile:1.6

# ──────────────────────────────────────────────────────────────────────────
# Stage 1 — Build
# Instala dependências, compila TS e roda Vite build.
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifestos primeiro pra aproveitar cache Docker
COPY package.json package-lock.json* ./
RUN npm ci

# Copia o resto do código
COPY . .

# Build do frontend (Vite → dist/client)
RUN npm run build

# Remove devDependencies para reduzir imagem final
RUN npm prune --omit=dev

# ──────────────────────────────────────────────────────────────────────────
# Stage 2 — Runner (imagem final)
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copia node_modules de produção
COPY --from=builder /app/node_modules ./node_modules
# Build do client
COPY --from=builder /app/dist ./dist
# Código do server e schema
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Pasta de uploads (será montada como volume persistente em prod)
RUN mkdir -p /app/data/uploads

EXPOSE 4000

# Healthcheck para o EasyPanel
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:4000/api/health || exit 1

# Roda direto via tsx (suporta TS sem build do server)
CMD ["npx", "tsx", "server/index.ts"]
