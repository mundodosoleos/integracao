import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Integração de envio de mensagem ao RD Station Conversas / Tallos.
 * Endpoint: POST {RD_BASE_URL}{RD_SEND_MESSAGE_ENDPOINT_TEMPLATE}
 * com {contact_id} substituído pelo contactId.
 *
 * Função isolada e fácil de ajustar caso a API exija outro formato de body.
 */

export class RDError extends Error {}

interface SendParams {
  contactId: string;
  message: string;
}

function buildUrl(contactId: string): string {
  const path = config.rd.sendMessageEndpointTemplate.replace(
    '{contact_id}',
    encodeURIComponent(contactId),
  );
  return `${config.rd.baseUrl}${path}`;
}

export async function sendMessageToRD({ contactId, message }: SendParams): Promise<void> {
  if (!contactId) {
    throw new RDError('contactId ausente; não é possível enviar mensagem');
  }
  if (!config.rd.apiToken) {
    throw new RDError('RD_API_TOKEN não configurado');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.externalTimeoutMs);

  try {
    const res = await fetch(buildUrl(contactId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.rd.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sent_by: config.rd.sentBy,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new RDError(`RD/Tallos respondeu HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }
    logger.info('Mensagem enviada ao RD/Tallos', { contactId });
  } finally {
    clearTimeout(timeout);
  }
}
