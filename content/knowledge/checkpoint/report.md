# Checkpoint de viabilidade da transcrição (D1) — RELATÓRIO PARCIAL: BLOQUEADO

> Status: **não executado** — bloqueado por Q1 (credencial Drive) e Q4 (hardware/ASR).
> Nenhum vídeo foi baixado, nenhum ASR rodou, nenhuma projeção de escala é
> apresentada como fato (o desenho proíbe projetar antes de medir). O que está
> pronto: lista da amostra (commitada antes de qualquer ASR), pipeline mínimo
> (`scripts/knowledge-extract.mjs`: download→ASR→resumo via LLM→lição validada)
> e todos os gates de validação.

## Amostra (§7.1) — `content/knowledge/checkpoint/sample.json`

- Curso: Trilha Python (Curso em Vídeo Mundo 1–3), 137 vídeos no inventário.
- Seleção estratificada ANTES de qualquer ASR: 5 por Mundo, posições 1, ~25%,
  ~50%, ~75% e última da ordem do inventário (1 início, 3 meio, 1 fim por Mundo).
- 15 vídeos, **2,23 GB no total**: Mundo 1 = 0,61 GB · Mundo 2 = 0,66 GB ·
  Mundo 3 = 0,95 GB. Cada entrada traz `driveFileId` real do inventário
  (`videos_full.json`, 2026-10-24), `sizeBytes` e `drivePath`.
- Exclusão aplicada: nenhuma vinheta de abertura/encerramento isolada entrou
  (a amostra contém aulas e exercícios reais do curso).

## Medições do ambiente (2026-10-24, esta VM)

| Item | Medido |
|---|---|
| CPUs | 2 (`nproc`) |
| GPU | **ausente** — `nvidia-smi` não existe nesta VM |
| ffmpeg | presente (8.1.2) — extração de áudio viável |
| faster-whisper | **não instalado** (`import faster_whisper` falha); `whisper` também ausente; sem torch |
| Credencial Drive no repo | **ausente** — 0 ocorrências de `GOOGLE_DRIVE_CREDENTIALS` em `.env` e no ambiente; nada no `.env.example` |
| Conexão Drive utilizável pelo repo | **não** — o Drive conectado ao assistente não é credencial do repo; o desenho não assume nenhuma forma de acesso |
| Comportamento do pipeline sem credencial | `knowledge-extract.mjs` sai 2 com "BLOQUEADOR Q1" explícito; `drive-rescan.mjs` sem fixture sai 1 fail-closed |

## Métricas do §7.3 — estado

| Métrica | Estado |
|---|---|
| Tempo de ASR por vídeo / RTF | **não medido** (sem vídeo, sem ASR) |
| Tempo total por vídeo | **não medido** |
| Custo por vídeo / projetado | **não medido**; ASR local teria custo marginal zero, mas isso é premissa, não medição |
| Qualidade do resumo | **não avaliada** (0 resumos produzidos) |
| Taxa de falha | **não aplicável** (0 tentativas) |
| Duração média real | **não medida** — o tamanho (2,23 GB / 15) não é duração e não é usado como proxy de horas |
| Projeção para 5.972 vídeos | **deliberadamente ausente** — sem duração média e sem RTF, qualquer número seria invenção |

## Decisão recomendada

**Não escalar, não prometer prazo, até D2 completo.** Próximos passos, em ordem:

1. **Q1 (Augusto):** fornecer service account (menor privilégio, só pastas do
   escopo Python) ou OAuth com refresh token; registrar o escopo.
2. **Q4 (Augusto):** indicar o hardware real do checkpoint. Se for esta VM
   (só CPU, 2 cores), o passo seguinte é instalar faster-whisper e medir RTF
   em CPU em 1 vídeo da amostra antes de qualquer promessa; se RTF em CPU for
   inviável, decidir entre GPU externa ou passo 3 (API paga, com chave e
   orçamento aprovados — sem aprovação, o passo 3 não existe).
3. Com Q1+Q4 resolvidos: rodar o pipeline nos 15 vídeos, preencher a tabela
   do §7.3, e só então D2/D3 (decisão do Augusto: escalar / parcial / não escalar).
4. Se a escala total for inviável, o fallback ordenado do §7.4 já está
   desenhado (cursos estruturados primeiro: Impressionador → Trilha Python →
   Rocketseat → Análise de Dados → Office → AI com Python).

## O que NÃO foi feito (e por quê)

- Nenhuma credencial foi improvisada, buscada em outro sistema ou contornada.
- Nenhum download do Drive foi tentado sem credencial.
- Nenhuma estimativa de horas/custo totais foi fabricada a partir do tamanho em GB.
