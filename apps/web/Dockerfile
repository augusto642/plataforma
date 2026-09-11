FROM node:22-alpine
WORKDIR /app

RUN npm install -g pnpm@11.22.0

# Dependências primeiro (camada cacheável). Copiar todos os package.json do
# workspace + lockfile para que `--frozen-lockfile` valide corretamente.
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --filter @plataforma/web --frozen-lockfile

COPY apps/web ./apps/web

EXPOSE 3001
CMD ["pnpm", "--filter", "@plataforma/web", "dev"]
