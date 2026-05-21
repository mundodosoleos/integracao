# integracao — Mundo dos Óleos

Middleware na **Vercel** que integra o **RD Station Conversas / Tallos** com a
**Shopify Storefront API**. Quando um cliente pergunta no WhatsApp pelo nome de
um produto, o middleware recebe a mensagem via webhook, limpa o texto, busca o
produto na Shopify e responde de forma comercial e humana — registrando logs no
Supabase.

> ⚠️ **Segurança:** nunca comite tokens reais. Use apenas `.env.example` no
> repositório e configure as chaves nas Environment Variables da Vercel.
> Como chaves foram expostas no chat, **rotacione** Supabase service role,
> RD/Tallos token, e gere um novo Storefront token antes de produção.

## O que o projeto faz

1. Recebe a mensagem do cliente via `POST /api/rd/webhook`.
2. Extrai o termo de busca de payloads variáveis do RD/Tallos.
3. Normaliza o texto (remove "tem", "quero", "quanto custa"...).
4. Consulta sinônimos no Supabase (`product_synonyms`), se existirem.
5. Busca o produto na Shopify Storefront API (GraphQL).
6. Formata uma resposta para WhatsApp (nome, preço, link, disponibilidade).
7. Registra log no Supabase (`product_search_logs`).
8. Retorna a resposta em JSON.
9. **Opcionalmente** envia a mensagem ao contato via endpoint Tallos.

## Arquitetura

```
RD Conversas/Tallos → Webhook → Vercel Serverless Function
                                   → normalize → synonyms (Supabase)
                                   → Shopify Storefront API (GraphQL)
                                   → responseFormatter
                                   → log (Supabase)
                                   → [opcional] envio Tallos
```

### Estrutura de pastas

```
integracao/
  api/
    health.ts            GET /api/health
    rd/webhook.ts        POST /api/rd/webhook
  src/
    lib/
      config.ts          variáveis de ambiente centralizadas
      logger.ts          log seguro (nunca expõe tokens)
      normalize.ts       normalização do termo de busca
      extractPayload.ts  extração flexível do payload RD/Tallos
      security.ts        validação do x-webhook-secret
      shopify.ts         Storefront API GraphQL
      supabase.ts        client Supabase (service role)
      rd.ts              envio de mensagem ao Tallos
      responseFormatter.ts  mensagens WhatsApp
      types.ts
    services/
      synonymService.ts
      productSearchService.ts  pipeline completo
      logService.ts
  tests/
```

## Instalação local

```bash
pnpm install        # ou npm install
cp .env.example .env
# preencha as variáveis em .env
pnpm dev            # vercel dev
```

Scripts: `pnpm dev`, `pnpm build` (type-check), `pnpm lint`, `pnpm format`,
`pnpm test`.

## Configurar `.env`

Veja `.env.example`. Variáveis:

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `development` ou `production` |
| `SHOPIFY_STORE_DOMAIN` | `mundo-dos-oleos.myshopify.com` |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | token da Storefront API (ver abaixo) |
| `SHOPIFY_API_VERSION` | `2026-04` |
| `PUBLIC_STORE_URL` | `https://www.mundodosoleos.com` |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (nunca no frontend) |
| `RD_BASE_URL` | `https://api.tallos.com.br/v2` |
| `RD_API_TOKEN` | token do RD/Tallos |
| `RD_WEBHOOK_SECRET` | segredo do webhook (você cria) |
| `RD_SEND_MESSAGE_ENDPOINT_TEMPLATE` | `/messages/{contact_id}/send` |
| `RD_SENT_BY` | `bot` |
| `AUTO_SEND_RD_MESSAGE` | `false` no início; `true` depois de validar |
| `MAX_PRODUCTS_RETURNED` | `3` |

## Gerar o token da Shopify Storefront API

1. Acesse o Shopify Admin da loja Mundo dos Óleos.
2. **Sales Channels / Canais de venda** → **Headless** (instale se necessário).
3. Crie uma nova storefront e **gere o Storefront API token**.
4. Ative permissão de **leitura de produtos**.
5. Salve em `SHOPIFY_STOREFRONT_ACCESS_TOKEN` (é diferente do Admin API token).

## Criar tabelas no Supabase

No SQL Editor do projeto, execute:

```sql
create table if not exists product_search_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  source text default 'rd_conversas',
  conversation_id text,
  contact_id text,
  customer_name text,
  customer_phone text,
  customer_email text,

  raw_message text not null,
  cleaned_query text,
  detected_intent text,

  shopify_result_count int default 0,
  response_status text,
  response_text text,

  error_message text,
  payload jsonb,
  shopify_response jsonb
);

create table if not exists product_synonyms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  term text not null,
  normalized_term text not null,
  preferred_query text not null,
  active boolean default true
);

insert into product_synonyms (term, normalized_term, preferred_query)
values
('oleo de lavanda', 'oleo de lavanda', 'óleo essencial de lavanda'),
('óleo de lavanda', 'oleo de lavanda', 'óleo essencial de lavanda'),
('lavanda', 'lavanda', 'óleo essencial de lavanda'),
('rosa mosqueta', 'rosa mosqueta', 'óleo de rosa mosqueta'),
('melaleuca', 'melaleuca', 'óleo essencial de melaleuca'),
('tea tree', 'tea tree', 'óleo essencial de melaleuca'),
('semente de uva', 'semente de uva', 'óleo de semente de uva'),
('oleo de oregano', 'oleo de oregano', 'óleo essencial de orégano'),
('óleo de oregano', 'oleo de oregano', 'óleo essencial de orégano'),
('óleo de orégano', 'oleo de oregano', 'óleo essencial de orégano');
```

## Configurar variáveis na Vercel

Em **Settings → Environment Variables**, adicione todas as variáveis acima
(exceto que `NODE_ENV=production`). Faça o deploy.

## Configurar webhook no RD/Tallos

- **URL:** `https://SEU-DOMINIO-VERCEL.vercel.app/api/rd/webhook`
- **Método:** `POST`
- **Headers:** `Content-Type: application/json` e
  `x-webhook-secret: <mesmo valor de RD_WEBHOOK_SECRET>`
- O payload deve trazer, se possível: texto da mensagem, `contact_id`, nome,
  telefone, e-mail, ID da conversa e canal.

O envio automático de mensagem usa `contact_id`
(`POST {RD_BASE_URL}/messages/{contact_id}/send`), por isso o middleware extrai
`contact_id` do payload.

## Testar com curl

Health:

```bash
curl https://SEU-DOMINIO-VERCEL.vercel.app/api/health
```

Produto encontrado:

```bash
curl -X POST "https://SEU-DOMINIO-VERCEL.vercel.app/api/rd/webhook" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: SUA_SENHA_FORTE" \
  -d '{
    "message": "Tem óleo de lavanda?",
    "contact_id": "CONTACT_ID_TESTE",
    "contact": { "name": "Cliente Teste", "phone": "61999999999", "email": "teste@email.com" },
    "conversation": { "id": "CONVERSATION_ID_TESTE" }
  }'
```

Produto não encontrado:

```bash
curl -X POST "https://SEU-DOMINIO-VERCEL.vercel.app/api/rd/webhook" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: SUA_SENHA_FORTE" \
  -d '{ "message": "Tem produto inexistente xyz?", "contact_id": "CONTACT_ID_TESTE" }'
```

> O header `x-webhook-secret` é o método **preferencial**. Há fallback via query
> string `?secret=VALOR`, documentado apenas para conveniência.

## Resposta do webhook

```json
{
  "ok": true,
  "query": "óleo essencial de lavanda",
  "resultsCount": 1,
  "responseText": "Encontrei este produto para você 😊 ...",
  "autoSent": false
}
```

## Ativar envio automático

1. Comece com `AUTO_SEND_RD_MESSAGE=false` — o middleware só retorna o JSON.
2. Depois de validar `contact_id` e o endpoint Tallos, mude para
   `AUTO_SEND_RD_MESSAGE=true`. Se faltar `contactId`, a mensagem **não** é
   enviada, um log de erro é gravado, mas o `responseText` ainda é retornado.

## Ver logs no Supabase

Consulte a tabela `product_search_logs` (mais recentes primeiro):

```sql
select created_at, raw_message, cleaned_query, detected_intent,
       shopify_result_count, response_status
from product_search_logs
order by created_at desc
limit 50;
```

## Criar sinônimos

Insira linhas em `product_synonyms`. Quando a busca limpa bate com `term` ou
`normalized_term` (comparação sem acentos), o `preferred_query` é usado na busca
Shopify.

```sql
insert into product_synonyms (term, normalized_term, preferred_query)
values ('copaiba', 'copaiba', 'óleo de copaíba');
```

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| `401` no webhook | `x-webhook-secret` ausente/errado, ou `RD_WEBHOOK_SECRET` não definido em produção |
| Sempre "não localizei" | `SHOPIFY_STOREFRONT_ACCESS_TOKEN` inválido ou sem permissão de leitura de produtos |
| Mensagem de erro técnico | Shopify indisponível ou query rejeitada — ver `error_message` no log |
| `autoSent: false` mesmo com flag `true` | `contact_id` não veio no payload, ou `RD_API_TOKEN` ausente |
| Logs não aparecem | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` ausentes (o atendimento continua funcionando) |

## Aviso final

Nunca comite `.env` ou tokens reais. As chaves vivem **apenas** nas Environment
Variables da Vercel. O bot **nunca inventa** produto, preço, estoque ou link —
usa somente o retorno real da Shopify. Quando não encontra, encaminha ao
WhatsApp de atendimento: **(61) 98400-6932**.
