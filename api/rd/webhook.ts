import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../src/lib/config.js';
import { logger } from '../../src/lib/logger.js';
import { verifyWebhookAuth } from '../../src/lib/security.js';
import { extractPayload } from '../../src/lib/extractPayload.js';
import { formatError } from '../../src/lib/responseFormatter.js';
import { runProductSearch } from '../../src/services/productSearchService.js';
import { saveSearchLog } from '../../src/services/logService.js';
import { sendMessageToRD } from '../../src/lib/rd.js';
import type { WebhookResult } from '../../src/lib/types.js';

function headerValue(req: VercelRequest, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

function queryValue(req: VercelRequest, name: string): string | undefined {
  const v = req.query[name];
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método não permitido. Use POST.' });
    return;
  }

  // 1. Segurança
  const auth = verifyWebhookAuth(
    headerValue(req, 'x-webhook-secret'),
    queryValue(req, 'secret'),
  );
  if (!auth.ok) {
    logger.warn('Webhook rejeitado', { reason: auth.reason });
    res.status(401).json({ ok: false, error: 'Não autorizado' });
    return;
  }

  const body = req.body ?? {};

  // 2. Extração flexível
  const extracted = extractPayload(body);

  if (!extracted.rawMessage) {
    // Sem mensagem não há o que buscar; loga e responde com fallback humano.
    await saveSearchLog({
      conversation_id: extracted.conversationId,
      contact_id: extracted.contactId,
      customer_name: extracted.customerName,
      customer_phone: extracted.customerPhone,
      customer_email: extracted.customerEmail,
      raw_message: '',
      response_status: 'error',
      response_text: formatError(),
      error_message: 'Mensagem não encontrada no payload',
      payload: body,
    });
    res.status(200).json({
      ok: false,
      query: '',
      resultsCount: 0,
      responseText: formatError(),
      autoSent: false,
    } satisfies WebhookResult);
    return;
  }

  // 3. Pipeline de busca
  const outcome = await runProductSearch(extracted.rawMessage);

  // 4. Envio automático ao RD/Tallos (opcional)
  let autoSent = false;
  let autoSendError: string | null = null;

  if (config.rd.autoSend) {
    if (!extracted.contactId) {
      autoSendError = 'contactId não encontrado; mensagem não enviada ao RD/Tallos';
      logger.warn(autoSendError);
    } else {
      try {
        await sendMessageToRD({
          contactId: extracted.contactId,
          message: outcome.responseText,
        });
        autoSent = true;
      } catch (err) {
        autoSendError = (err as Error).message;
        logger.error('Falha ao enviar mensagem ao RD/Tallos', { error: autoSendError });
      }
    }
  }

  // 5. Log
  await saveSearchLog({
    conversation_id: extracted.conversationId,
    contact_id: extracted.contactId,
    customer_name: extracted.customerName,
    customer_phone: extracted.customerPhone,
    customer_email: extracted.customerEmail,
    raw_message: extracted.rawMessage,
    cleaned_query: outcome.cleanedQuery,
    detected_intent: outcome.finalQuery,
    shopify_result_count: outcome.resultsCount,
    response_status: outcome.responseStatus,
    response_text: outcome.responseText,
    error_message: outcome.errorMessage ?? autoSendError,
    payload: body,
    shopify_response: outcome.shopifyResponse,
  });

  // 6. Resposta HTTP
  res.status(200).json({
    ok: true,
    query: outcome.finalQuery,
    resultsCount: outcome.resultsCount,
    responseText: outcome.responseText,
    autoSent,
  } satisfies WebhookResult);
}
