#!/bin/sh
set -e

# Em produção desacoplada, RUN_MIGRATIONS é gerenciado por jobs de release ou pelo container db-migrate.
if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "==> [Release Entrypoint] Aplicando migrações do banco de dados (Prisma)..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma
  echo "==> [Release Entrypoint] Migrações aplicadas com sucesso."
fi

exec "$@"
