# NOTICE — Componentes de terceiros do pacote Piston `portugol`

Este pacote executa código de terceiros como **processo separado**
(através do Piston), sem linkar nenhum núcleo ao código da
plataforma:

- **Portugol Studio 2.7.5** — UNIVALI-LITE / Universidade do Vale do
  Itajaí (UNIVALI). Licença **GNU LGPL-3.0** (texto integral em
  `LICENSE.md` neste diretório). Distribuição oficial inalterada:
  `portugol-console.jar` + `lib/` extraídos do instalador Linux x64
  da release v2.7.5
  (https://github.com/UNIVALI-LITE/Portugol-Studio/releases/tag/v2.7.5).
  Código-fonte correspondente: mesmo repositório, tag `v2.7.5`.

- **Eclipse Temurin JDK 8** — Eclipse Foundation / Adoptium.
  Licença GPLv2 + Classpath Exception. Binários oficiais:
  https://adoptium.net/temurin/releases/?version=8
  (o JDK é necessário porque o núcleo do Portugol compila o programa
  do aluno para Java chamando `javac` em tempo de execução).
