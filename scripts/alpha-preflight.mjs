import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_ALPHA_EVIDENCE = [
  ['stagingMigrations', 'Staging migrations applied and smoke-tested'],
  ['pistonIsolation', 'Dedicated Piston isolation verified'],
  ['publicEdge', 'Public HTTPS edge and direct-port restrictions verified'],
  ['monitoringAlertRouting', 'Alerts routed and delivery tested'],
  ['backupRestore', 'Backup restoration drill completed'],
  ['dependencyTriage', 'Dependency alerts triaged'],
  ['pilotConsent', 'Pilot consent process approved'],
  ['agePolicyReview', 'Age policy reviewed by qualified counsel'],
  ['publicSmokeTests', 'Public alpha user journeys smoke-tested'],
];

const REQUIRED_SECRETS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CERTIFICATE_HMAC_SECRET',
  'BILLING_WEBHOOK_SECRET',
  'POSTGRES_PASSWORD',
  'REDIS_PASSWORD',
];

function result(id, label, passed, detail) {
  return { id, label, status: passed ? 'ready' : 'blocked', detail };
}

function isLocalHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0'
  );
}

function parseUrl(value) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function publicHttpsUrl(value) {
  const url = parseUrl(value);
  return Boolean(
    url &&
      url.protocol === 'https:' &&
      url.hostname &&
      !isLocalHost(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash,
  );
}

function publicHttpsEndpoint(value) {
  const url = parseUrl(value);
  return Boolean(
    url &&
      url.protocol === 'https:' &&
      url.hostname &&
      !isLocalHost(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.hash,
  );
}

export function parseEnvFile(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;

    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    values[match[1]] = value;
  }
  return values;
}

export function checkAlphaConfiguration(env) {
  const checks = [];
  checks.push(
    result(
      'free-mode',
      'Free alpha enabled for API and web build',
      env.ALPHA_FREE_MODE === 'true' &&
        (env.NEXT_PUBLIC_ALPHA_FREE_MODE === undefined ||
          env.NEXT_PUBLIC_ALPHA_FREE_MODE === env.ALPHA_FREE_MODE),
      'Set ALPHA_FREE_MODE=true; the Compose build forwards it to the frontend.',
    ),
    result(
      'billing-mode',
      'Billing explicitly locked to test/simulated',
      env.BILLING_MODE === 'test' && env.BILLING_PROVIDER === 'simulated',
      'Set BILLING_MODE=test and BILLING_PROVIDER=simulated.',
    ),
  );

  for (const key of ['NEXT_PUBLIC_API_URL', 'WEB_PUBLIC_URL']) {
    checks.push(
      result(
        `public-url-${key.toLowerCase()}`,
        `${key} is a public HTTPS URL`,
        publicHttpsUrl(env[key]),
        `Set ${key} to its public HTTPS URL; local and loopback URLs are not launch-ready.`,
      ),
    );
  }

  const webUrl = parseUrl(env.WEB_PUBLIC_URL);
  const apiUrl = parseUrl(env.NEXT_PUBLIC_API_URL);
  const corsOrigins = (env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(parseUrl);
  checks.push(
    result(
      'cors-origin',
      'CORS includes the public web origin',
      Boolean(
        webUrl &&
          corsOrigins.length > 0 &&
          corsOrigins.every(
            (origin) =>
              origin &&
              origin.protocol === 'https:' &&
              !origin.username &&
              !origin.password &&
              origin.origin === origin.href.replace(/\/$/, ''),
          ) &&
          corsOrigins.some((origin) => origin.origin === webUrl.origin),
      ),
      'Set CORS_ORIGIN to comma-separated HTTPS origins including WEB_PUBLIC_URL origin.',
    ),
  );

  const giteaEnabled = env.GITEA_ENABLED !== 'false';
  const giteaUrl = parseUrl(env.GITEA_PUBLIC_URL);
  checks.push(
    result(
      'public-edge-domains',
      'Caddy domains match the public application URLs',
      Boolean(
        env.ACME_EMAIL &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ACME_EMAIL) &&
          webUrl &&
          apiUrl &&
          giteaEnabled &&
          env.WEB_DOMAIN?.toLowerCase() === webUrl.hostname.toLowerCase() &&
          env.API_DOMAIN?.toLowerCase() === apiUrl.hostname.toLowerCase() &&
          env.GITEA_DOMAIN?.toLowerCase() === giteaUrl?.hostname.toLowerCase(),
      ),
      'Set ACME_EMAIL and align WEB_DOMAIN, API_DOMAIN, and GITEA_DOMAIN with the public HTTPS URLs; keep Gitea enabled.',
    ),
    result(
      'alertmanager-webhook-url',
      'HTTPS Alertmanager webhook destination configured',
      publicHttpsEndpoint(env.ALERTMANAGER_WEBHOOK_URL),
      'Set ALERTMANAGER_WEBHOOK_URL to an HTTPS endpoint that accepts Alertmanager webhook payloads; its value is never printed.',
    ),
  );

  if (giteaEnabled) {
    checks.push(
      result(
        'gitea-public-url',
        'Gitea public URL and domains configured',
        Boolean(
          publicHttpsUrl(env.GITEA_PUBLIC_URL) &&
            giteaUrl &&
            env.GITEA_DOMAIN === giteaUrl.hostname &&
            env.GITEA_SSH_DOMAIN &&
            !isLocalHost(env.GITEA_SSH_DOMAIN),
        ),
        'Set GITEA_PUBLIC_URL to HTTPS and align GITEA_DOMAIN/GITEA_SSH_DOMAIN with public routing.',
      ),
    );
  }

  const secretKeys = [...REQUIRED_SECRETS];
  if (giteaEnabled) secretKeys.push('GITEA_WEBHOOK_SECRET');
  for (const key of secretKeys) {
    const value = env[key];
    checks.push(
      result(
        `secret-${key.toLowerCase()}`,
        `${key} is configured with sufficient strength`,
        Boolean(value && value.length >= 32 && !/change_me|changeme/i.test(value)),
        `Set ${key} to a unique secret of at least 32 characters; values are never printed.`,
      ),
    );
  }
  if (giteaEnabled) {
    checks.push(
      result(
        'gitea-token',
        'Gitea API token configured',
        Boolean(env.GITEA_TOKEN?.trim()),
        'Set GITEA_TOKEN to the dedicated least-privilege service account token.',
      ),
    );
  }

  const pistonUrl = parseUrl(env.PISTON_URL);
  checks.push(
    result(
      'piston-enabled',
      'Code execution explicitly enabled for release',
      env.PISTON_ENABLED === 'true',
      'Set PISTON_ENABLED=true only after the dedicated runner and isolation evidence are ready.',
    ),
    result(
      'piston-url',
      'Piston points to a non-loopback runner',
      Boolean(pistonUrl && !isLocalHost(pistonUrl.hostname)),
      'Set PISTON_URL to the dedicated runner reachable over the private network.',
    ),
    result(
      'piston-token',
      'Piston gateway token matches the 32-byte hex format',
      /^[a-f0-9]{64}$/i.test(env.PISTON_AUTH_TOKEN ?? ''),
      'Set PISTON_AUTH_TOKEN to the same 64-character hex token on the API and gateway.',
    ),
    result(
      'metrics-token',
      'Authenticated monitoring scrape token configured',
      Boolean(env.METRICS_TOKEN && env.METRICS_TOKEN.length >= 32),
      'Set METRICS_TOKEN to a unique value of at least 32 characters.',
    ),
  );

  return checks;
}

export function checkAlphaEvidence(evidence) {
  const gates = evidence?.version === 1 && evidence.gates ? evidence.gates : {};
  return REQUIRED_ALPHA_EVIDENCE.map(([key, label]) => {
    const entry = gates[key];
    const passed =
      entry?.status === 'passed' &&
      typeof entry.evidence === 'string' &&
      entry.evidence.trim().length > 0;
    return result(
      `evidence-${key}`,
      label,
      passed,
      `Record a completed result and evidence reference in .alpha-evidence.json (${key}).`,
    );
  });
}

export function loadEnvironment(envFile, processEnv = process.env) {
  const fileEnv = envFile && existsSync(envFile)
    ? parseEnvFile(readFileSync(envFile, 'utf8'))
    : {};
  return { ...fileEnv, ...processEnv };
}

async function probeLiveServices(env) {
  const checks = [];
  const apiUrl = parseUrl(env.NEXT_PUBLIC_API_URL);
  if (apiUrl) {
    try {
      const healthUrl = new URL('/health', apiUrl);
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
      checks.push(
        result(
          'probe-api',
          'Public API health endpoint responds',
          response.ok,
          'Check the public API deployment and /health route.',
        ),
      );
    } catch {
      checks.push(
        result(
          'probe-api',
          'Public API health endpoint responds',
          false,
          'Could not reach the public API health endpoint.',
        ),
      );
    }
  } else {
    checks.push(
      result('probe-api', 'Public API health endpoint responds', false, 'NEXT_PUBLIC_API_URL is invalid.'),
    );
  }

  const pistonUrl = parseUrl(env.PISTON_URL);
  if (
    env.PISTON_ENABLED !== 'true' ||
    !pistonUrl ||
    !/^[a-f0-9]{64}$/i.test(env.PISTON_AUTH_TOKEN ?? '')
  ) {
    checks.push(
      result(
        'probe-piston',
        'Authenticated Piston execution works',
        false,
        'Set PISTON_ENABLED=true and configure PISTON_URL and PISTON_AUTH_TOKEN first.',
      ),
    );
    return checks;
  }

  try {
    const response = await fetch(new URL('/api/v2/execute', pistonUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.PISTON_AUTH_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        language: 'javascript',
        version: '20.11.1',
        files: [{ name: 'main.js', content: 'console.log("alpha-preflight")' }],
        run_timeout: 5000,
        run_memory_limit: 268435456,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = response.ok ? await response.json() : null;
    const passed =
      response.ok &&
      payload?.run?.code === 0 &&
      payload?.run?.stdout?.trim() === 'alpha-preflight';
    checks.push(
      result(
        'probe-piston',
        'Authenticated Piston execution works',
        passed,
        'Verify the gateway token, runner runtime, and private network connectivity.',
      ),
    );
  } catch {
    checks.push(
      result(
        'probe-piston',
        'Authenticated Piston execution works',
        false,
        'Could not complete the authenticated Piston smoke execution.',
      ),
    );
  }
  return checks;
}

export function parseArguments(args) {
  const options = { envFile: '.env', evidenceFile: '.alpha-evidence.json', probe: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--probe') {
      options.probe = true;
    } else if (argument === '--env-path' || argument === '--evidence-file') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a path.`);
      options[argument === '--env-path' ? 'envFile' : 'evidenceFile'] = value;
      index += 1;
    } else if (argument === '--help') {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
}

async function main(args = process.argv.slice(2)) {
  let options;
  try {
    options = parseArguments(args);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    console.log(
      'Usage: pnpm alpha:preflight -- [--env-path .env] [--evidence-file .alpha-evidence.json] [--probe]',
    );
    return;
  }

  const env = loadEnvironment(options.envFile);
  let evidence;
  let evidenceError = false;
  try {
    evidence = existsSync(options.evidenceFile)
      ? JSON.parse(readFileSync(options.evidenceFile, 'utf8'))
      : undefined;
  } catch {
    evidenceError = true;
  }

  const checks = [
    ...checkAlphaConfiguration(env),
    ...checkAlphaEvidence(evidence),
  ];
  if (evidenceError) {
    checks.push(
      result(
        'evidence-file',
        'Launch evidence manifest is valid JSON',
        false,
        'The configured evidence manifest could not be parsed.',
      ),
    );
  }
  if (options.probe) checks.push(...(await probeLiveServices(env)));

  for (const check of checks) {
    const status = check.status === 'ready' ? 'READY' : 'BLOCKED';
    console.log(`[${status}] ${check.label} — ${check.detail}`);
  }
  const blocked = checks.filter((check) => check.status !== 'ready').length;
  console.log(
    blocked === 0
      ? 'ALPHA PREFLIGHT PASSED.'
      : `ALPHA PREFLIGHT BLOCKED: ${blocked} gate(s) require action.`,
  );
  if (blocked > 0) process.exitCode = 1;
}

const entrypoint = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (entrypoint) await main();
