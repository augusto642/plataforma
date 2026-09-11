FROM node:22-alpine
WORKDIR /app

RUN npm install -g pnpm@11.22.0

# Dependências primeiro (camada cacheável). Copiar todos os package.json do
# workspace + lockfile para que `--frozen-lockfile` valide corretamente.
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --filter @plataforma/api --frozen-lockfile

COPY apps/api ./apps/api

EXPOSE 3000
# Gera o cliente Prisma e aplica migrations antes de subir (primeiro boot reprodutível)
CMD ["sh", "-c", "pnpm --filter @plataforma/api exec prisma generate && pnpm --filter @plataforma/api exec prisma migrate deploy && pnpm --filter @plataforma/api dev"]
