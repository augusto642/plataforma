#!/bin/bash
# Build do pacote Piston "portugol" — roda na etapa de build da
# imagem de provisionamento (Dockerfile deste diretorio), NUNCA na
# maquina de producao diretamente. Monta, no diretorio atual, o
# layout que o Piston espera de um pacote instalado:
#
#   jdk/                  JDK 8 (Temurin) — java + javac
#   portugol-console.jar  console oficial headless (UNIVALI-LITE)
#   lib/                  dependencias do console (o JAR nao e "fat":
#                         o Class-Path do manifesto aponta para lib/)
#   run, environment      copiados do repositorio pela imagem
#
# Fontes oficiais:
# - Portugol Studio v2.7.5 (LGPL-3.0):
#   https://github.com/UNIVALI-LITE/Portugol-Studio/releases/tag/v2.7.5
# - Eclipse Temurin JDK 8 (GPLv2 + Classpath Exception):
#   https://adoptium.net/temurin/releases/?version=8
set -euo pipefail

PORTUGOL_VERSION="2.7.5"
PORTUGOL_ASSET="portugol-studio-${PORTUGOL_VERSION}-linux-x64.run.zip"
PORTUGOL_URL="https://github.com/UNIVALI-LITE/Portugol-Studio/releases/download/v${PORTUGOL_VERSION}/${PORTUGOL_ASSET}"
TEMURIN_JDK8_URL="https://api.adoptium.net/v3/binary/latest/8/ga/linux/x64/jdk/hotspot/normal/eclipse"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Baixando o JDK 8 (Temurin)"
curl -fsSL -o "$WORK/jdk.tar.gz" "$TEMURIN_JDK8_URL"
mkdir -p jdk
tar -xzf "$WORK/jdk.tar.gz" -C jdk --strip-components=1

echo "==> Baixando o Portugol Studio ${PORTUGOL_VERSION} (distribuicao oficial)"
curl -fsSL -o "$WORK/ps.zip" "$PORTUGOL_URL"
unzip -q "$WORK/ps.zip" -d "$WORK/ps"
INSTALLER="$(ls "$WORK"/ps/*.run | head -n 1)"
chmod +x "$INSTALLER"

echo "==> Instalando a distribuicao oficial (modo unattended)"
# O instalador (InstallBuilder) instala a arvore completa; a etapa
# pos-instalacao de desktop (update-desktop-database) pode falhar em
# imagens slim — e irrelevante para o console headless. O que vale e
# a arvore instalada existir; conferida logo abaixo, com falha dura.
"$INSTALLER" --mode unattended --prefix "$WORK/portugol-studio" || true
STUDIO_DIR="$WORK/portugol-studio"
if [ ! -f "$STUDIO_DIR/aplicacao/portugol-console.jar" ] && [ -f /usr/local/portugol-studio/aplicacao/portugol-console.jar ]; then
    STUDIO_DIR="/usr/local/portugol-studio"
fi

cp "$STUDIO_DIR/aplicacao/portugol-console.jar" .
cp -r "$STUDIO_DIR/aplicacao/lib" .

echo "==> Conferindo o layout final"
test -x jdk/bin/java
test -x jdk/bin/javac
test -f portugol-console.jar
test -d lib
jdk/bin/java -version
echo "Build do pacote portugol ${PORTUGOL_VERSION} OK."
