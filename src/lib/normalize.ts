/**
 * Normalização de texto de busca vindo do WhatsApp/RD.
 * Remove frases de intenção mas preserva o nome do produto (incluindo "óleo").
 */

/** Remove acentos para comparação interna. Não usar para exibir ao cliente. */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Frases de intenção a remover. Ordenadas das mais longas para as mais curtas
// para que "vocês têm" seja removido antes de um eventual "tem".
const INTENT_PHRASES = [
  'vocês vendem',
  'voces vendem',
  'vocês têm',
  'voces tem',
  'tem disponível',
  'tem disponivel',
  'gostaria de',
  'gostaria do',
  'quanto custa',
  'qual valor',
  'preciso de',
  'procuro',
  'quero',
  'tem',
  'preço',
  'preco',
  'valor',
];

/**
 * Normaliza a mensagem do cliente em um termo de busca limpo.
 * Preserva acentos no resultado exibível.
 */
export function normalizeProductQuery(rawMessage: string): string {
  if (!rawMessage) return '';

  let text = rawMessage.toLowerCase();

  // remove pontuação desnecessária, mantém letras (com acento), números e espaços
  text = text.replace(/[?!.,;:"'¿¡()\[\]{}]/g, ' ');

  // remove frases de intenção comparando sem acentos, mas reconstruindo o texto
  // Comparação token a token (sem acentos) preserva o texto original exibível.
  for (const phrase of INTENT_PHRASES) {
    text = removePhrase(text, phrase);
  }

  // remove preposições/artigos órfãos comuns que sobram ("o", "de" no início)
  text = text.replace(/^(o|a|os|as|de|do|da|um|uma)\s+/gi, '');

  // colapsa espaços duplicados e apara
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Remove uma frase de intenção considerando acentos: compara cada ocorrência
 * usando a versão sem acentos da string original.
 */
function removePhrase(text: string, phrase: string): string {
  const tokens = text.split(/\s+/);
  const phraseTokens = stripAccents(phrase).split(/\s+/);
  const result: string[] = [];

  for (let i = 0; i < tokens.length; ) {
    const window = tokens.slice(i, i + phraseTokens.length).map(stripAccents);
    if (
      window.length === phraseTokens.length &&
      window.join(' ') === phraseTokens.join(' ')
    ) {
      i += phraseTokens.length; // pula a frase de intenção
    } else {
      result.push(tokens[i]);
      i += 1;
    }
  }

  return result.join(' ');
}
