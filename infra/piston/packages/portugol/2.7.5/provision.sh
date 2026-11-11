#!/bin/bash
# Provisiona o pacote "portugol" no volume de pacotes do Piston.
#
# A API de pacotes do Piston (POST /api/v2/packages, usada pelo
# servico piston-init para node/python/java) so instala pacotes do
# indice oficial — um pacote customizado como este e instalado
# copiando a arvore para <data>/packages/portugol/2.7.5 com os
# mesmos marcadores que o instalador do Piston (ppman) gera:
# pkg-info.json, .env e .ppman-installed. Na subida, o Piston carrega
# todo pacote que tem o marcador (runtime.load_package).
set -euo pipefail

DEST="/piston/packages/portugol/2.7.5"
mkdir -p "$DEST"
cp -r /payload/. "$DEST"/
# build.sh e artefato de build, nao de execucao.
rm -f "$DEST/build.sh"

# Mesmos limites que a metadata do pacote declara (o runner da
# plataforma tambem impoe o piso de 12s por execucao Portugol).
cat > "$DEST/pkg-info.json" <<'EOF'
{
    "language": "portugol",
    "version": "2.7.5",
    "build_platform": "docker",
    "aliases": ["por", "portugol-studio"],
    "limit_overrides": {
        "run_timeout": 20000,
        "run_cpu_time": 20000,
        "compile_timeout": 20000,
        "compile_cpu_time": 20000
    }
}
EOF

# .env no mesmo formato do install do Piston: roda `env` apos aplicar
# o arquivo `environment` do pacote num shell limpo e grava o
# resultado (o job injeta essas variaveis na execucao).
(
    cd "$DEST"
    env -i bash -c 'source ./environment; env' \
        | grep -Ev '^(_|PWD|OLDPWD|SHLVL)=' > .env.tmp
    mv .env.tmp .env
)

touch "$DEST/.ppman-installed"
echo "Pacote Piston portugol 2.7.5 provisionado em $DEST"
