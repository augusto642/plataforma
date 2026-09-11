---
name: secrets-failfast
description: Use when removing hardcoded secret defaults, adding fail-fast config validation at boot, and hardening Gitea credentials (random passwords, minimal token scopes). Não use para outras mudanças.
---

# Skill: secrets-failfast

## Objetivo

Nenhum segredo com valor padrão previsível em código, compose ou seeds; o app **recusa subir** sem os segredos essenciais; contas Gitea com credenciais fortes e escopos mínimos.

## Regras

1. **Remover todos os defaults de segredo**:
   - `jwt.strategy.ts` e `auth.service.ts`: remover `'dev_access_secret_change_me'`; lançar ConfigError claro se ausente.
   - `docker-compose.yml`: não deixar fallback de JWT (a integração com `.env` é do orquestrador — **você não edita compose**; apenas remova defaults do código).
2. **Validação de configuração no boot** (config module): exigir `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, e, quando `GITEA_ENABLED != 'false'`, `GITEA_TOKEN` e `GITEA_WEBHOOK_SECRET`. Regra: `NODE_ENV === 'test'` dispensa (para testes unitários), mas **nenhum outro ambiente** tolera ausência. Função exportada e pura (ex.: `validateRequiredSecrets(env)`) para ser testável em unit test.
3. **Gitea device passwords**: `gitea.service.ts` — nunca `Student@123456` padrão. Gerar senha aleatória (crypto.randomBytes(24).toString('base64url')) por aluno, com `must_change_password: true`. Se a operação falhar, logar sem expor a senha.
4. **Logs**: não imprimir senhas/tokens em stdout (revisar `seed-gitea.mjs` — mas seed é do orquestrador; aqui: revisar `gitea.service.ts`).
5. **Não remover** comportamento funcional existente (criação de user/repo/hook).

## Testes obrigatórios

1. Unit: `validateRequiredSecrets({})` lança; com só `JWT_ACCESS_SECRET` lança; com todos + `NODE_ENV=test` passa.
2. Grep para `change_me`/`Student@123456`/`admin12345`/`bot12345` em `apps/api/src` → zero.
3. Unit: senha gerada difere entre chamadas e tem comprimento ≥ 24.

## Critérios de aceite

- `apps/api/src` não contém nenhum segredo literal.
- Boot com env incompleto falha com mensagem nomeando a variável faltante.
- Testes acima verdes.