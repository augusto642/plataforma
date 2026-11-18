import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEBHOOK_PLACEHOLDER = '__ALERTMANAGER_WEBHOOK_URL__';

export function renderAlertmanagerConfig(template, webhookUrl) {
  const value = webhookUrl?.trim();
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('ALERTMANAGER_WEBHOOK_URL must be a valid HTTPS URL.');
  }

  if (
    url.protocol !== 'https:' ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error(
      'ALERTMANAGER_WEBHOOK_URL must use HTTPS and cannot contain credentials or a fragment.',
    );
  }

  if (template.split(WEBHOOK_PLACEHOLDER).length !== 2) {
    throw new Error('Alertmanager template must contain exactly one webhook placeholder.');
  }

  return template.replace(WEBHOOK_PLACEHOLDER, JSON.stringify(url.toString()));
}

async function main() {
  const templatePath =
    process.env.ALERTMANAGER_TEMPLATE_PATH ?? '/templates/alertmanager.yml';
  const outputPath =
    process.env.ALERTMANAGER_CONFIG_OUTPUT ?? '/config/alertmanager.yml';
  const template = await readFile(templatePath, 'utf8');
  const config = renderAlertmanagerConfig(
    template,
    process.env.ALERTMANAGER_WEBHOOK_URL,
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, config, { encoding: 'utf8', mode: 0o644 });
  console.log('Alertmanager webhook configuration generated.');
}

const entrypoint = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (entrypoint) await main();
