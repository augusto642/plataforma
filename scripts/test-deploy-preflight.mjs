import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvironment } from './alpha-preflight.mjs';

function url(value, protocols) {
  try {
    const parsed = new URL(value);
    return protocols.includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function databaseIdentity(value) {
  const parsed = url(value, ['postgres:', 'postgresql:']);
  if (!parsed || !parsed.hostname || !parsed.pathname || parsed.pathname === '/') return null;
  return `${parsed.hostname.toLowerCase()}:${parsed.port || '5432'}${parsed.pathname}`;
}

export function checkTestDeploy(env) {
  const checks = [];
  function check(id, passed, detail) {
    checks.push({ id, passed: Boolean(passed), detail });
  }
  check('compose-project', /^nexus-test-[a-z0-9][a-z0-9_-]*$/.test(env.TEST_COMPOSE_PROJECT || ''),
    'Defina TEST_COMPOSE_PROJECT como um nome exclusivo iniciado por nexus-test- e use-o com docker compose -p.');
  const database = databaseIdentity(env.TEST_DATABASE_URL);
  const otherDatabase = env.DATABASE_URL ? databaseIdentity(env.DATABASE_URL) : null;
  const composeDatabase = `postgres:5432/${env.POSTGRES_DB || 'plataforma'}`;
  check('test-database', database && database !== otherDatabase && database !== composeDatabase,
    'Configure TEST_DATABASE_URL para um banco de teste distinto do banco Compose e de DATABASE_URL.');
  check('test-database-confirmed', env.TEST_DATABASE_CONFIRMED === 'true',
    'Confirme manualmente que o banco de teste é isolado: TEST_DATABASE_CONFIRMED=true.');

  const runner = url(env.PISTON_URL, ['http:', 'https:']);
  check('runner-url', runner && runner.hostname && !runner.username && !runner.password && !runner.search && !runner.hash &&
    !['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(runner.hostname.toLowerCase()),
    'Configure PISTON_URL para o gateway da VM acessível pela VPN, sem credenciais na URL.');
  check('runner-confirmed', env.PISTON_NETWORK_CONFIRMED === 'true',
    'Confirme manualmente a VM dedicada, VPN e firewall: PISTON_NETWORK_CONFIRMED=true.');
  check('runner-token', /^[a-f0-9]{64}$/i.test(env.PISTON_AUTH_TOKEN || ''),
    'Configure PISTON_AUTH_TOKEN como token hexadecimal de 32 bytes, igual ao do gateway.');

  const api = url(env.NEXT_PUBLIC_API_URL, ['http:', 'https:']);
  const web = url(env.WEB_PUBLIC_URL, ['http:', 'https:']);
  const origins = (env.CORS_ORIGIN || '').split(',').map((item) => item.trim());
  check('browser-origins', api && web && !api.username && !api.password && !web.username && !web.password &&
    !(web.protocol === 'https:' && api.protocol !== 'https:') && origins.includes(web.origin),
    'Configure URLs acessíveis de API e web e inclua a origem da web em CORS_ORIGIN; web HTTPS exige API HTTPS.');
  check('test-billing', env.BILLING_MODE === 'test' && env.BILLING_PROVIDER === 'simulated' && env.ALPHA_FREE_MODE === 'true',
    'Use ALPHA_FREE_MODE=true, BILLING_MODE=test e BILLING_PROVIDER=simulated.');

  const secrets = [
    'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CERTIFICATE_HMAC_SECRET', 'BILLING_WEBHOOK_SECRET',
    'POSTGRES_PASSWORD', 'REDIS_PASSWORD', 'GITEA_WEBHOOK_SECRET', 'METRICS_TOKEN',
  ];
  for (const name of secrets) {
    const value = env[name];
    check(`secret-${name}`, typeof value === 'string' && value.length >= 32 && !/change_me|changeme/i.test(value),
      `Configure ${name} com pelo menos 32 caracteres e sem placeholder.`);
  }
  check('unique-secrets', new Set(secrets.map((name) => env[name]).filter(Boolean)).size === secrets.length,
    'Use segredos distintos para cada finalidade.');
  check('gitea-token', env.GITEA_ENABLED === 'false' || Boolean(env.GITEA_TOKEN?.trim()),
    'Configure GITEA_TOKEN para a conta de serviço de teste ou desabilite Gitea explicitamente.');
  return checks;
}

export function parseTestDeployArguments(args) {
  if (args.length === 0) return { envFile: '.env' };
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (args.length === 2 && args[0] === '--env-path' && args[1] && !args[1].startsWith('--')) {
    return { envFile: args[1] };
  }
  throw new Error('Uso: node scripts/test-deploy-preflight.mjs [--env-path .env]');
}

function main() {
  let options;
  try {
    options = parseTestDeployArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    console.log('Uso: node scripts/test-deploy-preflight.mjs [--env-path .env]');
    return;
  }
  if (!existsSync(options.envFile)) {
    console.error('Arquivo de ambiente não encontrado; nenhum valor foi exibido.');
    process.exitCode = 1;
    return;
  }
  const checks = checkTestDeploy(loadEnvironment(options.envFile));
  for (const item of checks) console.log(`[${item.passed ? 'OK' : 'BLOQUEADO'}] ${item.detail}`);
  const blocked = checks.filter((item) => !item.passed).length;
  console.log(blocked
    ? `PREPARAÇÃO BLOQUEADA: ${blocked} item(ns).`
    : 'CONFIGURAÇÃO LOCAL VERIFICADA; não comprova isolamento, acesso ou funcionamento remoto.');
  if (blocked) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
