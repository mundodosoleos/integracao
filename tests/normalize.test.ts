import { describe, it, expect } from 'vitest';
import { normalizeProductQuery, stripAccents } from '../src/lib/normalize.js';

describe('normalizeProductQuery', () => {
  it('remove intenção e mantém o nome do produto', () => {
    expect(normalizeProductQuery('Tem óleo de lavanda?')).toBe('óleo de lavanda');
  });

  it('remove "vocês têm" preservando o restante', () => {
    expect(normalizeProductQuery('Vocês têm rosa mosqueta?')).toBe('rosa mosqueta');
  });

  it('remove "quero" mantendo "óleo de ..."', () => {
    expect(normalizeProductQuery('Quero óleo de semente de uva')).toBe(
      'óleo de semente de uva',
    );
  });

  it('remove "quanto custa o" mantendo o produto', () => {
    expect(normalizeProductQuery('Quanto custa o óleo essencial de melaleuca?')).toBe(
      'óleo essencial de melaleuca',
    );
  });

  it('remove "vocês têm óleo de orégano"', () => {
    expect(normalizeProductQuery('Vocês têm óleo de orégano?')).toBe('óleo de orégano');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(normalizeProductQuery('')).toBe('');
  });

  it('colapsa espaços duplicados', () => {
    expect(normalizeProductQuery('óleo    de   lavanda')).toBe('óleo de lavanda');
  });
});

describe('stripAccents', () => {
  it('remove acentos', () => {
    expect(stripAccents('óleo de orégano')).toBe('oleo de oregano');
  });
});
