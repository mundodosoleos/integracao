import type { ExtractedPayload } from './types.js';

/** Lê com segurança um caminho aninhado tipo "data.contact.id". */
function get(obj: any, path: string): unknown {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function firstString(obj: any, paths: string[]): string | null {
  for (const path of paths) {
    const value = get(obj, path);
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function firstObject(obj: any, paths: string[]): any | null {
  for (const path of paths) {
    const value = get(obj, path);
    if (value && typeof value === 'object') return value;
  }
  return null;
}

/**
 * Extrai campos de um payload variável do RD/Tallos. Procura a mensagem,
 * contact_id, conversationId e o objeto de contato em vários caminhos comuns.
 */
export function extractPayload(body: any): ExtractedPayload {
  const rawMessage = firstString(body, [
    'message.text',
    'message',
    'text',
    'content',
    'event.message',
    'data.message',
    'data.text',
    'data.content',
    'payload.message',
    'payload.text',
  ]);

  const contactId = firstString(body, [
    'contact_id',
    'contactId',
    'contact.id',
    'data.contact_id',
    'data.contactId',
    'data.contact.id',
    'customer.id',
    'lead.id',
    'person.id',
  ]);

  const conversationId = firstString(body, [
    'conversation_id',
    'conversationId',
    'conversation.id',
    'data.conversation_id',
    'data.conversationId',
    'data.conversation.id',
  ]);

  const contact = firstObject(body, ['contact', 'data.contact', 'customer', 'lead', 'person']);

  const customerName =
    firstString(contact, ['name', 'full_name', 'fullName']) ??
    firstString(body, ['name', 'customer_name']);
  const customerPhone =
    firstString(contact, ['phone', 'phone_number', 'phoneNumber', 'whatsapp']) ??
    firstString(body, ['phone']);
  const customerEmail =
    firstString(contact, ['email']) ?? firstString(body, ['email']);

  return {
    rawMessage,
    contactId,
    conversationId,
    customerName,
    customerPhone,
    customerEmail,
  };
}
