# OAuth 2.0 real — Google e GitHub (setup)

Login social da Nexus Code: o aluno clica em **Continuar com Google** ou
**Continuar com GitHub** na tela de login (ou no passo 1 do cadastro) e é
levado ao provedor; na volta, a API cria ou vincula a conta e grava os
mesmos cookies httpOnly do login por senha. Nada aqui é demo: sem os apps
criados abaixo, os botões respondem 503 com mensagem honesta.

> **Bloqueio de produção (ler antes de criar os apps):** a produção hoje é
> **HTTP puro** e os dois provedores exigem **redirect URI HTTPS em
> produção** (só `localhost` aceita HTTP — Google e GitHub rejeitam
> `http://` não-localhost no callback). Ou seja: o OAuth funciona
> **localmente** com os passos abaixo, e em produção só depois da decisão
> de HTTPS (Let's Encrypt ou Cloudflare Tunnel, pendente do Augusto).
> O código já está pronto para os dois casos: basta trocar as URLs de
> callback para HTTPS quando o HTTPS existir. Enquanto não houver HTTPS,
> **não adianta criar os apps de produção** — o provedor recusaria o
> callback HTTP.

## URLs de callback que o código espera

| Ambiente | Google | GitHub |
|---|---|---|
| Dev (localhost) | `http://localhost:3000/auth/google/callback` | `http://localhost:3000/auth/github/callback` |
| Produção (após HTTPS) | `https://<DOMINIO-DA-API>/auth/google/callback` | `https://<DOMINIO-DA-API>/auth/github/callback` |

- `<DOMINIO-DA-API>` é o domínio (ou host) onde a API responde em
  produção, com HTTPS. Hoje a API está em `http://209.50.229.238:443`
  (HTTP puro, sem domínio) — **essa URL não serve como callback**: crie
  os apps de produção só depois de definir o domínio + HTTPS.
- As URLs acima são os **defaults de dev** do código
  (`GOOGLE_CALLBACK_URL` / `GITHUB_CALLBACK_URL` só precisam ser definidas
  quando forem diferentes — em produção, defina-as com os valores HTTPS
  exatos).
- A URL tem que ser **idêntica** à registrada (sem `/` no final, mesmo
  host, mesma porta): divergência dá `redirect_uri_mismatch` no Google
  e erro de callback no GitHub.

## 1. Google — criar o OAuth Client ID

1. Acesse [Google Cloud Console](https://console.cloud.google.com/) com a
   conta Google da Nexus.
2. Crie (ou escolha) um projeto — ex.: `Nexus Code`.
3. Menu **APIs & Services → OAuth consent screen**:
   - **User Type: External** (qualquer conta Google pode entrar).
   - Preencha **App name** (`Nexus Code`), **User support email** e
     **Developer contact information** (e-mail do Augusto).
   - **Scopes:** nenhum escopo sensível é necessário — o código pede só
     `email` e `profile` no fluxo. Não adicione outros.
   - **Test users:** não é necessário (app External sem publicação pede
     test users só em modo de teste; para liberar geral, o app precisa
     ser publicado — ver "Publicação" abaixo).
   - Salve.
4. Menu **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**:
   - **Application type: Web application**, nome ex.: `Nexus Code Web`.
   - **Authorized JavaScript origins:** `http://localhost:3001` (dev) e,
     depois do HTTPS, `https://<DOMINIO-DO-WEB-APP>`.
   - **Authorized redirect URIs:** adicione as duas (o mesmo client aceita
     várias URIs):
     - `http://localhost:3000/auth/google/callback`
     - `https://<DOMINIO-DA-API>/auth/google/callback` (só após o HTTPS)
   - Create. Copie o **Client ID** e o **Client Secret**.
5. Variáveis de ambiente (API):
   ```bash
   GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=<client-secret>
   # GOOGLE_CALLBACK_URL=  # só em produção (HTTPS); em dev o default vale
   ```
6. **Publicação:** enquanto o app estiver em modo **Testing**, só contas
   listadas em Test users conseguem entrar (limite de 100). Para liberar
   para qualquer aluno, em **OAuth consent screen → Publish app** (o
   Google pode pedir verificação do app se pedir escopos sensíveis — não
   é o caso: `email`/`profile` são não-sensíveis).

## 2. GitHub — criar o OAuth App

> O GitHub aceita **uma só** Authorization callback URL por OAuth App.
> Por isso são **dois apps**: um para dev e outro para produção (com
> Client ID/Secret diferentes). O Google, ao contrário, aceita várias
> redirect URIs no mesmo client.

### 2a. App de dev

1. GitHub → foto do perfil → **Settings → Developer settings → OAuth
   Apps → New OAuth App**.
2. Preencha:
   - **Application name:** `Nexus Code (dev)`.
   - **Homepage URL:** `http://localhost:3001`
   - **Application description:** (opcional) `Login social da Nexus Code — ambiente de desenvolvimento.`
   - **Authorization callback URL:** `http://localhost:3000/auth/github/callback`
3. **Register application**. Na página do app, copie o **Client ID** e
   clique em **Generate a new client secret** para gerar o **Client
   Secret** (ele só é exibido uma vez — guarde-o na hora).
4. Variáveis de ambiente (API, dev):
   ```bash
   GITHUB_CLIENT_ID=<client-id-do-app-dev>
   GITHUB_CLIENT_SECRET=<client-secret-do-app-dev>
   # GITHUB_CALLBACK_URL=  # em dev o default vale
   ```

### 2b. App de produção (só após o HTTPS)

Repita os passos com:

- **Application name:** `Nexus Code`.
- **Homepage URL:** `https://<DOMINIO-DO-WEB-APP>`
- **Authorization callback URL:** `https://<DOMINIO-DA-API>/auth/github/callback`

e troque `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` pelos do app de
produção, mais:

```bash
GITHUB_CALLBACK_URL=https://<DOMINIO-DA-API>/auth/github/callback
```

## 3. Variáveis de ambiente — resumo

```bash
# Dev (localhost) — só estas 4; as *_CALLBACK_URL têm default de dev.
GOOGLE_CLIENT_ID=<...>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<...>
GITHUB_CLIENT_ID=<...>
GITHUB_CLIENT_SECRET=<...>

# Produção (após HTTPS) — some as 2 de callback, com os domínios reais.
GOOGLE_CALLBACK_URL=https://<DOMINIO-DA-API>/auth/google/callback
GITHUB_CALLBACK_URL=https://<DOMINIO-DA-API>/auth/github/callback
```

Regras de habilitação (código):

- **Nenhuma var** do provedor → OAuth daquele provedor **desabilitado**;
  as rotas respondem 503 e o login por senha não é afetado.
- **Só uma** das duas vars (ID sem secret ou vice-versa) → o boot da API
  **recusa subir** (fail-closed). Defina as duas ou nenhuma.
- Segredos **nunca** vão para o repositório: só via variável de ambiente
  (`.env` local, secrets do deploy).

## 4. Como testar

### 4a. Sem credenciais reais (mocks — já coberto por testes)

```bash
cd apps/api
npx jest src/auth --runInBand   # strategies, vínculo, guards, filtro, controller
```

Os specs mockam o perfil do provedor e o Prisma: vínculo por e-mail,
login na conta já vinculada, criação de conta nova, recusa de e-mail não
verificado/ausente, e-mail primário do GitHub via `/user/emails` mockado,
503 quando não configurado e redirect do callback.

### 4b. Local, com os OAuth Apps de dev criados

1. Suba o Postgres/Redis (ou o compose de dev) e aplique a migration
   `20261110120000_oauth_accounts` num banco **de dev**
   (`prisma migrate deploy` — nunca em produção sem autorização).
2. No `.env` da API, defina as 4 vars de dev. Na web,
   `NEXT_PUBLIC_API_URL=http://localhost:3000`.
3. Suba API (`pnpm --filter @plataforma/api dev`) e web
   (`pnpm --filter @plataforma/web dev`).
4. Abra `http://localhost:3001/login` e clique em **Continuar com Google**:
   - autorize no Google → volta para `http://localhost:3001/dashboard`
     já logado (confira em DevTools → Application → Cookies:
     `access_token` e `refresh_token` httpOnly; nada no corpo da resposta).
5. Repita com **GitHub** (use uma conta com e-mail primário verificado;
   para testar o erro, use uma conta sem e-mail verificado — o retorno é
   `/login?oauth_error=email_unverified` com a mensagem na tela).
6. Teste o vínculo: crie uma conta por senha com o mesmo e-mail do Google
   (e confirme o código), depois entre com o Google — deve logar na
   **mesma** conta (sem duplicata). Confira no banco: uma linha em
   `oauth_accounts` para aquele `user_id`.
7. Teste o 503: remova as 4 vars, reinicie a API e abra
   `http://localhost:3000/auth/google` — deve voltar para o login com
   `?oauth_error=oauth_unavailable`.

### 4c. Produção (só após HTTPS + apps de produção)

Repita 4b contra o domínio com HTTPS, com as 6 vars (incluindo as
`*_CALLBACK_URL` HTTPS) e os apps de produção. Atenção ao cookie: com
web e API em domínios diferentes, `COOKIE_SAME_SITE=none` exige
`secure: true` (o HTTPS resolve isso — ver `.env.example`).

## 5. Comportamento e limites conhecidos

- **E-mail verificado é exigência, não opção.** Google sem
  `email_verified` e GitHub sem e-mail primário verificado são recusados
  com erro claro. Conta GitHub com e-mail privado e nenhum e-mail
  verificado não consegue entrar via GitHub — o aluno usa e-mail/senha
  (ou torna um e-mail público/verificado no GitHub).
- **Conta por senha continua exigindo o código (C5).** Só a conta criada
  ou vinculada via OAuth nasce verificada — o provedor já verificou o
  e-mail. Não há caminho que crie sessão por senha sem verificação.
- **Conta só-OAuth não tem senha.** O login por senha numa conta criada
  via OAuth responde "credenciais inválidas" (sem revelar o motivo).
  Hoje não há fluxo de "definir senha depois" — decisão futura do Augusto
  se quiser oferecer.
- **Um provedor por vez por conta, os dois juntos por usuário.** O mesmo
  usuário pode vincular Google e GitHub (um registro por provedor); o
  mesmo `providerId` nunca pertence a dois usuários.
- **Sem `state` com verificação server-side.** O fluxo usa o Authorization
  Code Flow do Passport sem validação de `state` em sessão (a API é
  stateless/cookie-only e não há store de sessão para guardar o `state`).
  O risco residual é login CSRF (um atacante iniciar um login OAuth pela
  vítima) — baixo, mas registrado como follow-up: se o Augusto quiser,
  o próximo passo é guardar o `state` num cookie assinado ou em sessão.
- **Cookies no redirect.** Os cookies são gravados na resposta do
  redirect do callback; o navegador os guarda antes de seguir para o web
  app. Não há token na URL nem no corpo.
- **Throttle:** as 4 rotas OAuth têm teto de 10 req/min (por IP, anônimo)
  — igual às demais rotas de auth.
