import { config } from './config.js';
import type { Money, NormalizedProduct, ShopifyProduct } from './types.js';

/** Formata um Money da Shopify em "R$ 49,90". Retorna null se não houver preço. */
export function formatPrice(money: Money | null | undefined): string | null {
  if (!money || money.amount == null) return null;
  const amount = Number(money.amount);
  if (Number.isNaN(amount)) return null;

  if (money.currencyCode === 'BRL' || !money.currencyCode) {
    return `R$ ${amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${money.currencyCode} ${amount.toFixed(2)}`;
}

/** Converte um ShopifyProduct em um NormalizedProduct pronto para exibir. */
export function toNormalizedProduct(p: ShopifyProduct): NormalizedProduct {
  const url =
    p.onlineStoreUrl ?? `${config.shopify.publicStoreUrl}/products/${p.handle}`;
  return {
    title: p.title,
    url,
    price: formatPrice(p.priceRange?.minVariantPrice),
    availableForSale: p.availableForSale,
  };
}

/**
 * Seleciona até MAX_PRODUCTS_RETURNED produtos, priorizando disponíveis.
 */
export function selectProducts(products: ShopifyProduct[]): NormalizedProduct[] {
  const normalized = products.map(toNormalizedProduct).filter((p) => p.title);
  const available = normalized.filter((p) => p.availableForSale);
  const chosen = available.length > 0 ? available : normalized;
  return chosen.slice(0, config.maxProductsReturned);
}

const SUPPORT_LINE = `Em caso de dúvidas, entre em contato com o nosso WhatsApp: ${config.supportWhatsApp}`;

function priceLabel(price: string | null): string {
  return price ?? 'consultar';
}

/** Resposta quando todos os resultados vieram indisponíveis ou nenhum produto. */
export function formatNotFound(): string {
  return [
    'Não localizei esse produto automaticamente no momento.',
    '',
    'Podemos verificar uma opção semelhante para você 😊',
    'Por favor, envie o nome do produto ou a finalidade de uso desejada.',
    '',
    SUPPORT_LINE,
  ].join('\n');
}

/** Resposta para erro técnico (Shopify/Supabase/RD indisponível). */
export function formatError(): string {
  return [
    'Não consegui consultar os produtos automaticamente agora.',
    '',
    'Nossa equipe pode verificar para você 😊',
    SUPPORT_LINE,
  ].join('\n');
}

/**
 * Formata a resposta de produtos encontrados.
 * Recebe a lista já selecionada (1 a MAX). Se vazia, retorna not-found.
 */
export function formatProducts(products: NormalizedProduct[]): string {
  const available = products.filter((p) => p.availableForSale);

  // Se nada está disponível, não destacar "esgotado": encaminhar ao humano.
  if (available.length === 0) {
    return formatNotFound();
  }

  if (available.length === 1) {
    const p = available[0];
    return [
      'Encontrei este produto para você 😊',
      '',
      p.title,
      `Valor: ${priceLabel(p.price)}`,
      `Link: ${p.url}`,
      '',
      'Posso te ajudar a finalizar o pedido?',
    ].join('\n');
  }

  const lines = ['Encontrei algumas opções para você 😊', ''];
  available.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.title} — ${priceLabel(p.price)}`);
    lines.push(p.url);
    lines.push('');
  });
  lines.push('Qual deles você deseja?');
  return lines.join('\n');
}
