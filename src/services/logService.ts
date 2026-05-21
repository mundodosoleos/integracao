import { getSupabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { ResponseStatus } from '../lib/types.js';

export interface SearchLogEntry {
  source?: string;
  conversation_id?: string | null;
  contact_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  raw_message: string;
  cleaned_query?: string | null;
  detected_intent?: string | null;
  shopify_result_count?: number;
  response_status?: ResponseStatus | string;
  response_text?: string | null;
  error_message?: string | null;
  payload?: unknown;
  shopify_response?: unknown;
}

/**
 * Grava um log de busca em product_search_logs.
 * Nunca lança: falha de log não pode quebrar o atendimento.
 */
export async function saveSearchLog(entry: SearchLogEntry): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('product_search_logs').insert({
      source: entry.source ?? 'rd_conversas',
      conversation_id: entry.conversation_id ?? null,
      contact_id: entry.contact_id ?? null,
      customer_name: entry.customer_name ?? null,
      customer_phone: entry.customer_phone ?? null,
      customer_email: entry.customer_email ?? null,
      raw_message: entry.raw_message,
      cleaned_query: entry.cleaned_query ?? null,
      detected_intent: entry.detected_intent ?? null,
      shopify_result_count: entry.shopify_result_count ?? 0,
      response_status: entry.response_status ?? null,
      response_text: entry.response_text ?? null,
      error_message: entry.error_message ?? null,
      payload: entry.payload ?? null,
      shopify_response: entry.shopify_response ?? null,
    });

    if (error) {
      logger.warn('Falha ao gravar log no Supabase', { error: error.message });
    }
  } catch (err) {
    logger.warn('Exceção ao gravar log no Supabase', { error: (err as Error).message });
  }
}
