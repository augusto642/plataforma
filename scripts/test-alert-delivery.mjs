import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function sendTestAlert(port = 9093, fetchImpl = fetch) {
  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error('Porta do Alertmanager inválida.');
  }
  const id = randomUUID();
  const start = new Date();
  const end = new Date(start.getTime() + 5 * 60_000);
  const alert = {
    labels: { alertname: 'NexusDeliveryTest', job: `manual-${id}`, severity: 'info' },
    annotations: {
      summary: 'Teste manual de entrega de alertas',
      description: 'Alerta sintético; confirme o recebimento no destino configurado.',
    },
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
  const response = await fetchImpl(`http://127.0.0.1:${parsedPort}/api/v2/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([alert]),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Alertmanager recusou o alerta (HTTP ${response.status}).`);
  return id;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const id = await sendTestAlert(process.env.ALERTMANAGER_PORT || 9093);
    console.log(`Alerta ${id} aceito pelo Alertmanager. Confirme a entrega no webhook; aceite não comprova recebimento.`);
  } catch (error) {
    console.error(`Teste de alerta falhou: ${error.message}`);
    process.exitCode = 1;
  }
}
