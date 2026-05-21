/**
 * Logger simples. Nunca loga tokens nem secrets — só mensagens e metadados seguros.
 */

const TOKEN_KEYS = /token|secret|key|authorization|password/i;

function sanitize(meta: unknown): unknown {
  if (!meta || typeof meta !== 'object') return meta;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    out[k] = TOKEN_KEYS.test(k) ? '[redacted]' : v;
  }
  return out;
}

export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(JSON.stringify({ level: 'info', message, meta: sanitize(meta) }));
  },
  warn(message: string, meta?: unknown): void {
    console.warn(JSON.stringify({ level: 'warn', message, meta: sanitize(meta) }));
  },
  error(message: string, meta?: unknown): void {
    console.error(JSON.stringify({ level: 'error', message, meta: sanitize(meta) }));
  },
};
