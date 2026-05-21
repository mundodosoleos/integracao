/**
 * Configuração central. Lê variáveis de ambiente uma única vez.
 * Não loga nem expõe tokens. Validação preguiçosa: cada serviço valida
 * apenas as variáveis que realmente usa, para não derrubar o webhook inteiro.
 */

function env(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : undefined;
}

function envBool(key: string, fallback = false): boolean {
  const value = env(key);
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

function envInt(key: string, fallback: number): number {
  const value = env(key);
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  nodeEnv: env('NODE_ENV') ?? 'development',
  isProduction: (env('NODE_ENV') ?? 'development') === 'production',

  shopify: {
    storeDomain: env('SHOPIFY_STORE_DOMAIN'),
    storefrontAccessToken: env('SHOPIFY_STOREFRONT_ACCESS_TOKEN'),
    apiVersion: env('SHOPIFY_API_VERSION') ?? '2026-04',
    publicStoreUrl: env('PUBLIC_STORE_URL') ?? 'https://www.mundodosoleos.com',
  },

  supabase: {
    url: env('SUPABASE_URL'),
    serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  },

  rd: {
    baseUrl: env('RD_BASE_URL') ?? 'https://api.tallos.com.br/v2',
    apiToken: env('RD_API_TOKEN'),
    webhookSecret: env('RD_WEBHOOK_SECRET'),
    sendMessageEndpointTemplate:
      env('RD_SEND_MESSAGE_ENDPOINT_TEMPLATE') ?? '/messages/{contact_id}/send',
    sentBy: env('RD_SENT_BY') ?? 'bot',
    autoSend: envBool('AUTO_SEND_RD_MESSAGE', false),
  },

  maxProductsReturned: envInt('MAX_PRODUCTS_RETURNED', 3),

  /** WhatsApp de atendimento humano usado nas mensagens ao cliente. */
  supportWhatsApp: '(61) 98400-6932',

  /** Timeout padrão para chamadas externas (ms). */
  externalTimeoutMs: 10_000,
} as const;
