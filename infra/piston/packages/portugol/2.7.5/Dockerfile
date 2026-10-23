# Pacote Piston "portugol" 2.7.5 — provisionamento.
#
# Por que uma imagem propria: a API de pacotes do Piston so instala
# do indice oficial; pacotes customizados sao provisionados copiando
# a arvore pronta para o volume compartilhado (ver provision.sh).
# O servico piston-portugol-init (docker-compose.yml) roda esta
# imagem uma vez; o servico piston sobe depois dela.

FROM debian:bookworm-slim AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /pkg
COPY metadata.json environment run build.sh ./
RUN chmod +x build.sh run && ./build.sh

FROM debian:bookworm-slim
WORKDIR /payload
COPY --from=build /pkg/ ./
COPY provision.sh /provision.sh
RUN chmod +x /provision.sh /payload/run
ENTRYPOINT ["/provision.sh"]
