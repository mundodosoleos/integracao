import { config } from './config.js';

export interface AuthResult {
  ok: boolean;
  reason?: string;
}

/**
 * Valida o segredo do webhook.
 * - Header preferencial: x-webhook-secret
 * - Fallback documentado: query string ?secret=VALOR
 *
 * Regras:
 * - Se RD_WEBHOOK_SECRET está definido, exige que header/query bata.
 * - Se não está definido e NODE_ENV=production → 401.
 * - Se não está definido e NODE_ENV=development → libera (facilita teste local).
 */
export function verifyWebhookAuth(
  headerSecret: string | undefined,
  querySecret: string | undefined,
): AuthResult {
  const expected = config.rd.webhookSecret;

  if (!expected) {
    if (config.isProduction) {
      return { ok: false, reason: 'RD_WEBHOOK_SECRET não configurado em produção' };
    }
    return { ok: true };
  }

  const provided = headerSecret ?? querySecret;
  if (provided && provided === expected) {
    return { ok: true };
  }
  return { ok: false, reason: 'Segredo do webhook inválido ou ausente' };
}
