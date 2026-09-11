#!/usr/bin/env node
// Seed de dev do Gitea: instala a instancia (se necessario), cria uma org de
// exemplo, uma service account (bot) e gera um token para a plataforma usar
// como GITEA_TOKEN. Idempotente: pode rodar quantas vezes quiser.
//
// Uso:
//   node scripts/seed-gitea.mjs
//   GITEA_URL=http://localhost:3030 node scripts/seed-gitea.mjs
//
// Variaveis de ambiente (todas tem default de dev):
//   GITEA_URL, GITEA_ADMIN_USER, GITEA_ADMIN_PASSWORD, GITEA_ADMIN_EMAIL,
//   GITEA_DB_HOST, GITEA_DB_USER, GITEA_DB_PASSWORD, GITEA_DB_NAME,
//   GITEA_ORG, GITEA_BOT_USER, GITEA_BOT_PASSWORD, GITEA_BOT_EMAIL

const base = (process.env.GITEA_URL || 'http://localhost:3030').replace(/\/+$/, '');

const adminUser = process.env.GITEA_ADMIN_USER || 'admin';
const adminPassword = process.env.GITEA_ADMIN_PASSWORD || 'admin12345';
const adminEmail = process.env.GITEA_ADMIN_EMAIL || 'admin@plataforma.local';

const dbHost = process.env.GITEA_DB_HOST || 'postgres:5432';
const dbUser = process.env.GITEA_DB_USER || 'plataforma';
const dbPassword = process.env.GITEA_DB_PASSWORD || 'plataforma_dev';
const dbName = process.env.GITEA_DB_NAME || 'gitea';

const orgName = process.env.GITEA_ORG || 'plataforma';
const botUser = process.env.GITEA_BOT_USER || 'plataforma-bot';
const botPassword = process.env.GITEA_BOT_PASSWORD || 'bot12345';
const botEmail = process.env.GITEA_BOT_EMAIL || 'plataforma-bot@plataforma.local';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(msg) {
  console.log(`[seed-gitea] ${msg}`);
}

function basicAuth(user, pass) {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

async function request(path, { method = 'GET', body, auth, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = auth;
  if (token) headers.Authorization = `token ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  return res;
}

async function waitReady(timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // Qualquer resposta HTTP (200 ou 404 de "nao instalado") indica que o
      // servidor ja esta de pe; apenas erro de rede significa "ainda subindo".
      await fetch(`${base}/api/v1/version`);
      log('Gitea respondendo.');
      return;
    } catch {
      // ainda subindo
    }
    await sleep(2000);
  }
  throw new Error(`Gitea nao ficou pronto em ${timeoutMs / 1000}s em ${base}`);
}

async function isInstalled() {
  // /api/v1/settings/api responde 200 so quando a instancia ja foi instalada.
  const res = await request('/api/v1/settings/api');
  return res.status === 200;
}

async function install() {
  log('Instancia ainda nao instalada. Executando instalacao inicial...');
  const params = new URLSearchParams({
    db_type: 'postgres',
    db_host: dbHost,
    db_user: dbUser,
    db_passwd: dbPassword,
    db_name: dbName,
    ssl_mode: 'disable',
    charset: 'utf8',
    app_name: 'Plataforma Gitea',
    repo_root_path: '/data/git/repositories',
    lfs_root_path: '/data/git/lfs',
    run_user: 'git',
    domain: 'localhost',
    ssh_port: '2222',
    http_port: '3000',
    app_url: `${base}/`,
    log_root_path: '/data/gitea/log',
    offline_mode: 'on',
    disable_registration: 'on',
    enable_captcha: 'off',
    admin_name: adminUser,
    admin_passwd: adminPassword,
    admin_confirm_passwd: adminPassword,
    admin_email: adminEmail,
  });

  const res = await fetch(`${base}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    redirect: 'manual',
  });

  if (![200, 302, 303].includes(res.status)) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha na instalacao do Gitea (HTTP ${res.status}): ${text.slice(0, 500)}`);
  }
  log('Instalacao submetida. Aguardando migracao do banco...');

  // Espera a instancia concluir a migracao e responder como instalada. Durante
  // a migracao o Gitea reinicia o servidor web, entao erros de rede sao esperados.
  const start = Date.now();
  while (Date.now() - start < 120000) {
    try {
      if (await isInstalled()) {
        log('Instancia instalada com sucesso.');
        return;
      }
    } catch {
      // gitea reiniciando durante a migracao
    }
    await sleep(2000);
  }
  throw new Error('Timeout aguardando a instalacao do Gitea concluir.');
}

async function getAdminToken() {
  // Token de seed com escopos mínimos e nome fixo (idempotente).
  const auth = basicAuth(adminUser, adminPassword);
  const listRes = await request(`/api/v1/users/${adminUser}/tokens`, { auth });
  if (listRes.ok) {
    const tokens = await listRes.json();
    const existing = (tokens || []).find((t) => t.name === 'seed-admin');
    if (existing) {
      await request(`/api/v1/users/${adminUser}/tokens/${existing.id}`, {
        method: 'DELETE',
        auth,
      });
    }
  }
  const res = await request(`/api/v1/users/${adminUser}/tokens`, {
    method: 'POST',
    body: {
      name: 'seed-admin',
      scopes: ['write:organization', 'write:user', 'write:admin'],
    },
    auth,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao criar token do admin (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.sha1;
}

async function createOrg(token) {
  const existing = await request(`/api/v1/orgs/${orgName}`, { token });
  if (existing.status === 200) {
    log(`Org "${orgName}" ja existe.`);
    return;
  }

  const res = await request('/api/v1/orgs', {
    method: 'POST',
    body: { username: orgName, full_name: 'Plataforma', visibility: 'limited' },
    token,
  });
  if (!res.ok && res.status !== 409 && res.status !== 422) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao criar org (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  log(`Org "${orgName}" criada.`);
}

async function createBotUser(token) {
  const existing = await request(`/api/v1/users/${botUser}`, { token });
  if (existing.status === 200) {
    log(`Service account "${botUser}" ja existe.`);
    return;
  }

  const res = await request('/api/v1/admin/users', {
    method: 'POST',
    body: {
      login_name: botUser,
      username: botUser,
      email: botEmail,
      password: botPassword,
      must_change_password: false,
      send_notify: false,
      visibility: 'public',
    },
    token,
  });
  if (!res.ok && res.status !== 422) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao criar service account (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  log(`Service account "${botUser}" criada.`);
}

async function addBotToOrgOwners(token) {
  const teamsRes = await request(`/api/v1/orgs/${orgName}/teams/search?q=Owners`, { token });
  if (!teamsRes.ok) {
    const text = await teamsRes.text().catch(() => '');
    throw new Error(`Falha ao listar times da org (HTTP ${teamsRes.status}): ${text.slice(0, 300)}`);
  }
  const teams = await teamsRes.json();
  const owners = (teams.data || teams).find((t) => t.name === 'Owners');
  if (!owners) throw new Error('Time "Owners" nao encontrado na org.');

  const res = await request(`/api/v1/teams/${owners.id}/members/${botUser}`, {
    method: 'PUT',
    token,
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao adicionar bot ao time Owners (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  log(`Service account "${botUser}" adicionada ao time Owners.`);
}

async function createBotToken() {
  const auth = basicAuth(botUser, botPassword);

  // Remove token antigo com o mesmo nome para manter o seed idempotente
  // (o Gitea nao permite dois tokens com o mesmo nome por usuario).
  const listRes = await request(`/api/v1/users/${botUser}/tokens`, { auth });
  if (listRes.ok) {
    const tokens = await listRes.json();
    const existing = (tokens || []).find((t) => t.name === 'service-account');
    if (existing) {
      await request(`/api/v1/users/${botUser}/tokens/${existing.id}`, {
        method: 'DELETE',
        auth,
      });
    }
  }

  // Escopos mínimos para a operação da plataforma: repositórios (repos, hooks,
  // colaboradores), organização (criar repos na org) e administração de usuários
  // (criar/desativar alunos). NÃO usa 'all': sem issues/packages/notificações.
  const res = await request(`/api/v1/users/${botUser}/tokens`, {
    method: 'POST',
    body: {
      name: 'service-account',
      scopes: ['write:repository', 'write:organization', 'write:user', 'write:admin'],
    },
    auth,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao criar token da service account (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.sha1;
}

async function main() {
  await waitReady();

  if (!(await isInstalled())) {
    await install();
  } else {
    log('Instancia ja instalada.');
  }

  const adminToken = await getAdminToken();
  await createOrg(adminToken);
  await createBotUser(adminToken);
  await addBotToOrgOwners(adminToken);
  const botToken = await createBotToken();

  console.log('');
  console.log('=== Gitea seed concluido ===');
  console.log(`URL:            ${base}`);
  console.log(`Admin user:     ${adminUser}`);
  console.log(`Org:            ${orgName}`);
  console.log(`Service account: ${botUser}`);
  console.log(`GITEA_TOKEN:    ${botToken}`);
  console.log('');
  console.log('Copie o GITEA_TOKEN para o seu .env (GITEA_TOKEN=<valor>).');
  console.log('');
  console.log('Ao configurar webhooks no Gitea (UI), use o mesmo valor de');
  console.log('GITEA_WEBHOOK_SECRET definido no .env — a API recusa entregas sem HMAC válido.');
}

main().catch((err) => {
  console.error(`[seed-gitea] Erro: ${err.message}`);
  process.exit(1);
});
