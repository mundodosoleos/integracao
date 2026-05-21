export interface Money {
  amount: string;
  currencyCode: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money | null;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  onlineStoreUrl: string | null;
  availableForSale: boolean;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  } | null;
  variants: ProductVariant[];
}

/** Produto já normalizado para uso na resposta (link sempre resolvido). */
export interface NormalizedProduct {
  title: string;
  url: string;
  price: string | null;
  availableForSale: boolean;
}

/** Dados extraídos de um payload variável do RD/Tallos. */
export interface ExtractedPayload {
  rawMessage: string | null;
  contactId: string | null;
  conversationId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
}

export type ResponseStatus = 'found' | 'not_found' | 'error';

export interface WebhookResult {
  ok: boolean;
  query: string;
  resultsCount: number;
  responseText: string;
  autoSent: boolean;
}
