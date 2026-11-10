# Pacote Piston `portugol` — Portugol executável na Nexus Code (Sprint 23)

Pacote customizado que ensina o nosso Piston auto-hospedado a
executar programas **Portugol** (`.por`) com o **console oficial
headless do Portugol Studio** (UNIVALI-LITE, LGPL-3.0), no modelo
programa inteiro **entrada→saída**: o runner da API
(`apps/api/src/submissions/runner/runner.service.ts`) executa o
programa completo uma vez por caso de teste, alimentando o `leia`
com o `stdin` do caso e comparando o `stdout` com o esperado.

## Layout

```
infra/piston/packages/portugol/
  README.md            <- este arquivo
  2.7.5/
    metadata.json      linguagem/versão/aliases (formato-fonte do Piston)
    environment        PATH (JDK do pacote) + PORTUGOL_HOME p/ o job
    run                executa o console oficial sobre o arquivo dado
    build.sh           monta jdk/ + portugol-console.jar + lib/
    Dockerfile         imagem de provisionamento (build + payload)
    provision.sh       instala a árvore no volume do Piston
    LICENSE.md         LGPL-3.0 integral (do repositório oficial)
    NOTICE.md          atribuição dos componentes de terceiros
```

O diretório instalado no volume (`/piston/packages/portugol/2.7.5/`)
é a árvore acima **sem** `build.sh`/`Dockerfile`/`provision.sh`, com
`jdk/`, `portugol-console.jar`, `lib/` montados pelo build, e com
`pkg-info.json`, `.env` e o marcador `.ppman-installed` gerados pelo
`provision.sh` — o mesmo formato que o instalador do Piston gera
para os pacotes oficiais. `pkg-info.json` declara `limit_overrides`
de 20s (a partida da JVM é lenta; ver "Tempo" abaixo).

## Provisionamento

A API de pacotes do Piston (`POST /api/v2/packages`, usada pelo
serviço `piston-init` para node/python/java) **só instala do índice
oficial** — pacote customizado não passa por ela. Por isso o
`docker-compose.yml` tem o serviço **`piston-portugol-init`**, que
builda a imagem deste diretório, copia a árvore para o volume
`piston-packages` e termina; o serviço `piston` só sobe depois
(`depends_on: service_completed_successfully`). Para reprovisionar
(ex.: troca de versão), suba a versão em `metadata.json`/diretório e
rode `docker compose up --build piston-portugol-init`.

## Contrato de execução (verificado no spike da Sprint 23)

- O Piston invoca `bash <pkgdir>/run programa.por` com o stdin do
  job; o `run` chama
  `java -Dfile.encoding=UTF-8 -Djava.io.tmpdir=$PWD -jar portugol-console.jar programa.por`.
- **`javac` externo é pré-requisito**: o núcleo compila o `.por`
  para Java chamando `javac` do PATH. Por isso o pacote embute um
  JDK 8 completo (Temurin) e o exporta no PATH (`environment` +
  `run`). Sem isso, toda execução falha com
  `ERRO: Cannot run program "javac"`.
- **Stdout tem sufixo próprio**: em sucesso, o console anexa
  `"\nPrograma finalizado\n\nPressione ENTER para continuar\n"`; em
  erro, `"\nPressione ENTER para continuar\n"`. O runner remove esse
  sufixo antes de comparar (e ignora whitespace no fim das saídas).
  O "Pressione ENTER" é literal: ao terminar, o console lê uma linha
  do stdin — com stdin fechado (EOF), ele sai na hora. É o caso do
  Piston, que escreve o stdin do job e fecha o pipe
  (`job.js: proc.stdin.end()`), então nenhuma execução trava nesse
  prompt. (Num terminal interativo, sem EOF, ele esperaria o ENTER.)
- **`leia` lê UMA LINHA inteira por variável** (não separa por
  espaço): casos de teste usam **um valor por linha** no `stdin`.
  Valores a menos ⇒ `NoSuchElementException` (erro de execução);
  a mais ⇒ ignorados pelo programa.
- **Erros**: sintaxe ⇒ stderr `ERRO: <mensagem>. Linha: X, Coluna: Y`,
  exit 1 (o runner classifica `compile_error`); execução ⇒ stderr
  `Erro de execução: <mensagem>` + `Linha: X, Coluna: Y`, exit 1
  (`runtime_error`). Em alguns erros de execução, a `<mensagem>` do
  console é o nome cru da exceção Java; o **runner traduz as
  exceções conhecidas na mensagem ao aluno** (Correção 23.1, D1),
  mantendo linha/coluna: fim da entrada no `leia`
  (`java.util.NoSuchElementException`) ⇒ "o programa tentou ler um
  valor, mas a entrada do caso acabou"; valor não numérico em `leia`
  de número (`java.lang.NumberFormatException`) ⇒ "o valor lido não
  é um número válido". Exceções fora desse mapa seguem com a primeira
  linha do console.
- **UTF-8**: garantido por `-Dfile.encoding=UTF-8` no `run` (sem a
  flag, acentos viram `?`).
- **`limpa()`** injeta a sequência ESC `c` no stdout — autores de
  atividades devem evitá-la em programas com saída comparada. Se
  aparecer na saída do aluno, a divergência é mantida (a regra de
  comparação não muda), mas o runner exibe os caracteres de controle
  escapados (`<ESC>`, `<0xNN>`) na mensagem de divergência, com uma
  observação explicando a presença deles (Correção 23.1, D3).

## Tempo

A partida da JVM + a compilação interna dominam: medido no spike
~4s por execução a quente (mais a frio/sob carga). O runner impõe
piso de **12s** por execução Portugol (teto da plataforma: 15s) e o
pacote declara `limit_overrides` de 20s no Piston (que por sua vez
tem teto próprio via `PISTON_TIMEOUT_MS`, 30s por default na API).

## Licença

Portugol Studio é **LGPL-3.0** (texto em `2.7.5/LICENSE.md`,
atribuição em `2.7.5/NOTICE.md`). Ele roda como **processo separado**
dentro do Piston — nenhum código do núcleo é linkado ou copiado para
a plataforma; a plataforma apenas envia o arquivo `.por` e lê
stdin/stdout/exit code do processo. O JDK Temurin 8 é GPLv2 +
Classpath Exception, também executado como processo separado.

## Smoke (deploy — item B11)

Com a stack no ar (`docker compose up`), conferir:

1. `GET http://piston:2000/api/v2/runtimes` lista `portugol 2.7.5`.
2. `POST /api/v2/execute` com `language: "portugol"`,
   `files: [{name: "programa.por", content: <programa soma>}]` e
   `stdin: "3\n4\n"` devolve stdout `Soma: 7` + sufixo do console,
   exit 0.
3. Submissão real de uma atividade Portugol pela API passa nos casos
   visíveis e ocultos; erro de sintaxe do aluno aparece como erro de
   compilação com linha/coluna; loop infinito termina em timeout.
