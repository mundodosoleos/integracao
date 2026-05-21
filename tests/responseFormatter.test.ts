import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatProducts,
  formatNotFound,
  formatError,
} from '../src/lib/responseFormatter.js';
import type { NormalizedProduct } from '../src/lib/types.js';

const product = (over: Partial<NormalizedProduct>): NormalizedProduct => ({
  title: 'Óleo Essencial de Lavanda',
  url: 'https://www.mundodosoleos.com/products/lavanda',
  price: 'R$ 49,90',
  availableForSale: true,
  ...over,
});

describe('formatPrice', () => {
  it('formata BRL', () => {
    expect(formatPrice({ amount: '49.90', currencyCode: 'BRL' })).toBe('R$ 49,90');
  });
  it('retorna null sem preço', () => {
    expect(formatPrice(null)).toBeNull();
  });
});

describe('formatProducts', () => {
  it('formata 1 produto disponível', () => {
    const text = formatProducts([product({})]);
    expect(text).toContain('Encontrei este produto para você');
    expect(text).toContain('Óleo Essencial de Lavanda');
    expect(text).toContain('Valor: R$ 49,90');
    expect(text).toContain('Posso te ajudar a finalizar o pedido?');
  });

  it('formata múltiplos produtos disponíveis', () => {
    const text = formatProducts([
      product({ title: 'Lavanda', url: 'http://x/1' }),
      product({ title: 'Melaleuca', url: 'http://x/2', price: 'R$ 59,90' }),
    ]);
    expect(text).toContain('Encontrei algumas opções para você');
    expect(text).toContain('1. Lavanda — R$ 49,90');
    expect(text).toContain('2. Melaleuca — R$ 59,90');
    expect(text).toContain('Qual deles você deseja?');
  });

  it('encaminha ao humano quando tudo está indisponível', () => {
    const text = formatProducts([product({ availableForSale: false })]);
    expect(text).toBe(formatNotFound());
    expect(text).not.toContain('esgotado');
  });
});

describe('mensagens de fallback', () => {
  it('not found contém WhatsApp de suporte', () => {
    expect(formatNotFound()).toContain('(61) 98400-6932');
  });
  it('error contém WhatsApp de suporte', () => {
    expect(formatError()).toContain('(61) 98400-6932');
  });
});
