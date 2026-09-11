---
name: sandbox-piston
description: Use when implementing code execution for student submissions via the Piston engine, mapping normalized runner results, or removing in-process execution. Não use para outras tarefas de backend.
---

# Skill: sandbox-piston

## Objetivo

Executar código de aluno (JS/TS/Python/Java) **fora do processo da API**, via serviço **Piston** (container Docker com Isolate: namespaces, chroot, usuário unprivileged, cgroups, rede off, limites). NUNCA executar código do aluno in-process.

## Regras inegociáveis

1. **Nenhum `new Function`, `eval`, `execSync`/`spawn` com código do aluno** no processo da API. Código do aluno só vai para `POST http://{PISTON_URL}/api/v2/execute`.
2. Fail-closed: se o Piston estiver inacessível ou o limite de tempo de rede for atingido → resultado `status: 'error'`, `kind: 'sandbox_unavailable'`, mensagem genérica. **Nunca** fallback para execução local "otimista".
3. `memoryLimitMb` e `timeLimitMs` do banco são **aplicados de verdade**: `run_memory_limit` (bytes), `run_timeout`/`run_cpu_time` (ms), `compile_timeout`/`compile_cpu_time`.
4. Saída limitada: truncar stdout/stderr no cliente a `PISTON_MAX_OUTPUT_CHARS` (default 4096) e **sempre** antes de persistir (colunas do banco não são ilimitadas).
5. Código, stdout/stderr e `errorMessage` são **dados hostis** (podem conter PII/segredos/controle de logs): sanitizar CR/LF e limitar tamanho antes de persistir/exibir.

## Contrato Piston (`POST /api/v2/execute`)

```json
{
  "language": "javascript" | "python" | "java",
  "version": "*",
  "files": [{ "name": "main.js", "content": "<code>" }],
  "stdin": "",
  "compile_timeout": 10000, "run_timeout": 5000,
  "compile_cpu_time": 10000, "run_cpu_time": 5000,
  "compile_memory_limit": 268435456, "run_memory_limit": 268435456
}
```

Resposta: `{ "compile"?: {stdout,stderr,code,signal,message,status}, "run": {stdout,stderr,code,signal,message,status,cpu_time,wall_time,memory} }`.

## Mapeamento de status (normalização obrigatória)

| Piston status | RunnerResult kind |
|---|---|
| `null` + code 0 | `passed` |
| `RE` / code != 0 | `runtime_error` |
| `SG` / signal | `signal` |
| `TO` | `timeout` |
| `OL` / `EL` | `output_limit` |
| `XX` ou erro de rede/HTTP | `sandbox_unavailable` (status `error`) |
| linguagem sem runtime instalado / não suportada | `unsupported` (ex.: portugol sem executor — **nunca** `passed` silencioso) |

O tipo `SandboxExecutionResult` deve ganhar `kind?: 'passed'|'failed'|'compile_error'|'runtime_error'|'timeout'|'signal'|'output_limit'|'sandbox_unavailable'|'unsupported'` mantendo compatibilidade com `status: 'passed'|'failed'|'error'`. O evaluator deve traduzir kinds em mensagens pedagógicas e **não conceder XP** em `unsupported`/`sandbox_unavailable`/`compile_error`.

## Implementação mínima

- `runner.service.ts` (renomear/reescrever `docker-runner.service.ts`): injeção de `HttpService` (ou fetch com AbortController timeout), função `execute(language, code, { timeLimitMs, memoryLimitMb })` assíncrona.
- Config: `PISTON_URL` (default `http://piston:2000`), `PISTON_TIMEOUT_MS` (default 30000), `PISTON_MAX_OUTPUT_CHARS` (default 4096) — validados no config module.
- TypeScript: usar runtime `typescript` do Piston (compilação + run) se estiver disponível; senão `unsupported`.
- Portugol: NUNCA checar só palavras-chave. Retornar `unsupported` com mensagem clara e sem XP.
- Java: preservar wrapper `public class Solution` apenas quando o código não declara classe própria (regra atual) — mas validar com teste recebendo entrada/saída real via Piston.
- Manter interface `RunnerService` (execute) para permitir mock em testes: **tests unitários obrigatórios** com HTTP mockado cobrindo: sucesso, timeout(TO), output cap(OL), runtime error(RE), rede indisponível, `unsupported` (portugol), limite de memória aplicado no payload.
- Nenhum teste pode depender de Docker/Piston real (mock HTTP).

## Critérios de aceite

- grep: zero `new Function`/`execSync`/`eval(` com variável de código de aluno em `apps/api/src`.
- Payload para Piston contém `run_memory_limit` e `run_timeout` derivados do banco.
- Saídas truncadas; CR/LF sanitizados.
- Portugol → `unsupported`, sem XP.
- Suíte unitária do runner cliente verde (mocks).