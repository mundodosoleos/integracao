import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logger } from './logger.js';

let client: SupabaseClient | null = null;
let attempted = false;

/**
 * Retorna um client Supabase usando a service role key, ou null se as
 * variáveis não estiverem configuradas. Nunca lança — falha de Supabase
 * não deve quebrar o atendimento.
 */
export function getSupabase(): SupabaseClient | null {
  if (attempted) return client;
  attempted = true;

  const { url, serviceRoleKey } = config.supabase;
  if (!url || !serviceRoleKey) {
    logger.warn('Supabase não configurado; logs e sinônimos desativados');
    return null;
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
