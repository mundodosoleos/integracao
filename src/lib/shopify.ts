import { config } from './config.js';
import { logger } from './logger.js';
import type { ShopifyProduct } from './types.js';

/**
 * Consulta a Shopify Storefront API (GraphQL) por produtos.
 * Tenta primeiro com argumentos opcionais (prefix / unavailableProducts);
 * se a versão da API rejeitar esses argumentos, refaz sem eles e filtra no código.
 */

interface SearchOptions {
  /** Termo já normalizado/preferido. */
  query: string;
  first?: number;
}

const PRODUCT_FIELDS = `
  ... on Product {
    id
    title
    handle
    onlineStoreUrl
    availableForSale
    featuredImage { url altText }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    variants(first: 10) {
      nodes {
        id
        title
        availableForSale
        price { amount currencyCode }
      }
    }
  }
`;

function buildQuery(withOptionalArgs: boolean): string {
  const optional = withOptionalArgs ? ', prefix: LAST, unavailableProducts: HIDE' : '';
  return `
    query ProductSearch($query: String!, $first: Int!) {
      search(query: $query, first: $first, types: PRODUCT${optional}) {
        nodes {
          ${PRODUCT_FIELDS}
        }
      }
    }
  `;
}

interface ShopifyRawResult {
  data?: {
    search?: {
      nodes?: Array<Record<string, any>>;
    };
  };
  errors?: Array<{ message: string }>;
}

export class ShopifyError extends Error {}

function endpoint(): string {
  const { storeDomain, apiVersion } = config.shopify;
  return `https://${storeDomain}/api/${apiVersion}/graphql.json`;
}

async function postGraphQL(
  query: string,
  variables: Record<string, unknown>,
): Promise<ShopifyRawResult> {
  const { storeDomain, storefrontAccessToken } = config.shopify;
  if (!storeDomain || !storefrontAccessToken) {
    throw new ShopifyError('Shopify não configurado (domínio ou token ausente)');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.externalTimeoutMs);

  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ShopifyError(`Shopify respondeu HTTP ${res.status}`);
    }
    return (await res.json()) as ShopifyRawResult;
  } finally {
    clearTimeout(timeout);
  }
}

function mapNode(node: Record<string, any>): ShopifyProduct | null {
  if (!node || !node.title) return null;
  const handle = node.handle ?? '';
  const onlineStoreUrl: string | null =
    node.onlineStoreUrl ?? (handle ? `${config.shopify.publicStoreUrl}/products/${handle}` : null);

  return {
    id: node.id,
    title: node.title,
    handle,
    onlineStoreUrl,
    availableForSale: Boolean(node.availableForSale),
    featuredImage: node.featuredImage ?? null,
    priceRange: node.priceRange ?? null,
    variants: (node.variants?.nodes ?? []).map((v: any) => ({
      id: v.id,
      title: v.title,
      availableForSale: Boolean(v.availableForSale),
      price: v.price ?? null,
    })),
  };
}

/**
 * Busca produtos. Retorna a lista mapeada (sem limitar quantidade — quem
 * consome aplica MAX_PRODUCTS_RETURNED e prioriza disponíveis).
 */
export async function searchProducts({ query, first = 5 }: SearchOptions): Promise<ShopifyProduct[]> {
  let raw: ShopifyRawResult;

  try {
    raw = await postGraphQL(buildQuery(true), { query, first });
    if (raw.errors?.length) {
      logger.warn('Shopify rejeitou argumentos opcionais; refazendo sem eles', {
        errors: raw.errors.map((e) => e.message),
      });
      raw = await postGraphQL(buildQuery(false), { query, first });
    }
  } catch (err) {
    // Pode ser erro de argumento opcional já no transporte; tenta fallback.
    logger.warn('Falha na busca Shopify; tentando query simplificada', {
      error: (err as Error).message,
    });
    raw = await postGraphQL(buildQuery(false), { query, first });
  }

  if (raw.errors?.length) {
    throw new ShopifyError(raw.errors.map((e) => e.message).join('; '));
  }

  const nodes = raw.data?.search?.nodes ?? [];
  return nodes
    .map(mapNode)
    .filter((p): p is ShopifyProduct => p !== null);
}
