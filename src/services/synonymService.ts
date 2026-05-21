import { getSupabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { stripAccents } from '../lib/normalize.js';

/**
 * Resolve a busca limpa contra a tabela product_synonyms.
 * Se encontrar correspondência (em term ou normalized_term), usa preferred_query.
 * Caso contrário, ou se o Supabase falhar, devolve a própria busca limpa.
 */
export async function resolveSynonym(cleanedQuery: string): Promise<string> {
  const fallback = cleanedQuery;
  const supabase = getSupabase();
  if (!supabase || !cleanedQuery) return fallback;

  const normalized = stripAccents(cleanedQuery);

  try {
    const { data, error } = await supabase
      .from('product_synonyms')
      .select('term, normalized_term, preferred_query, active')
      .eq('active', true);

    if (error) {
      logger.warn('Falha ao consultar sinônimos; usando busca original', {
        error: error.message,
      });
      return fallback;
    }

    const match = (data ?? []).find(
      (row) =>
        stripAccents(String(row.term ?? '')).toLowerCase() === normalized.toLowerCase() ||
        stripAccents(String(row.normalized_term ?? '')).toLowerCase() ===
          normalized.toLowerCase(),
    );

    return match?.preferred_query ? String(match.preferred_query) : fallback;
  } catch (err) {
    logger.warn('Exceção ao consultar sinônimos; usando busca original', {
      error: (err as Error).message,
    });
    return fallback;
  }
}
