import { normalizeProductQuery } from '../lib/normalize.js';
import { searchProducts } from '../lib/shopify.js';
import {
  formatError,
  formatNotFound,
  formatProducts,
  selectProducts,
} from '../lib/responseFormatter.js';
import { resolveSynonym } from './synonymService.js';
import type { ResponseStatus, ShopifyProduct } from '../lib/types.js';

export interface SearchOutcome {
  cleanedQuery: string;
  finalQuery: string;
  resultsCount: number;
  responseText: string;
  responseStatus: ResponseStatus;
  shopifyResponse: ShopifyProduct[] | null;
  errorMessage: string | null;
}

/**
 * Pipeline completo de busca: normaliza → resolve sinônimo → consulta Shopify
 * → formata resposta. Trata erros retornando uma resposta humana de fallback.
 */
export async function runProductSearch(rawMessage: string): Promise<SearchOutcome> {
  const cleanedQuery = normalizeProductQuery(rawMessage);

  if (!cleanedQuery) {
    return {
      cleanedQuery,
      finalQuery: cleanedQuery,
      resultsCount: 0,
      responseText: formatNotFound(),
      responseStatus: 'not_found',
      shopifyResponse: null,
      errorMessage: null,
    };
  }

  const finalQuery = await resolveSynonym(cleanedQuery);

  try {
    const products = await searchProducts({ query: finalQuery, first: 5 });
    const selected = selectProducts(products);
    const available = selected.filter((p) => p.availableForSale);

    if (available.length === 0) {
      return {
        cleanedQuery,
        finalQuery,
        resultsCount: 0,
        responseText: formatNotFound(),
        responseStatus: 'not_found',
        shopifyResponse: products,
        errorMessage: null,
      };
    }

    return {
      cleanedQuery,
      finalQuery,
      resultsCount: available.length,
      responseText: formatProducts(selected),
      responseStatus: 'found',
      shopifyResponse: products,
      errorMessage: null,
    };
  } catch (err) {
    return {
      cleanedQuery,
      finalQuery,
      resultsCount: 0,
      responseText: formatError(),
      responseStatus: 'error',
      shopifyResponse: null,
      errorMessage: (err as Error).message,
    };
  }
}
