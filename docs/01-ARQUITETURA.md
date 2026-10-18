# 01 — Arquitetura e personalização

- **Vendas:** `dist/index.html`, `js/seletor-produto.js`, `js/galeria-produto.js`, `js/support.js`, `css/vendas.css`, `css/botoes.css`.
- **Pagamento:** `dist/pagamento.html`, `js/checkout.js`, `checkout-validation.js`, `checkout-steps.js`, `cep.js`, `qrcode.js`.
- **Rastreio:** `dist/rastreio.html`, `js/rastreio.js`, `delivery-map.js`, `css/pedidos.css`, Leaflet local e coordenadas públicas em `data/cidades.json`.
- **Admin:** `dist/admin.html`, `js/admin.js`, `delivery-map.js`, `css/pedidos.css`.
- **Servidor:** `dist/_worker.js`; rotas `/api/*` em `_routes.json`; configuração em `wrangler.jsonc`.

Fluxo: variantes → dados e endereço → validação no servidor → Pix Umbrella → tentativa e pedido persistidos → e-mail pendente → pagamento → webhook consulta transação canônica → PAID → e-mail com código/link → movimentações manuais → acompanhamento.

Navegador não determina valor, pagamento ou autorização administrativa. Rastreamento público não deve expor CPF, e-mail ou telefone. O código longo funciona como link privado; não divulgar links de clientes em demonstrações.

D1: `payment_attempts`, `orders`, `order_events`, `order_map_points`, `order_emails`, `admin_challenges`, `admin_rate`. Dados pessoais e outbox são criptografados. A chave deriva do segredo Umbrella: rotacioná-lo exige migração dos dados e revisão de tokens/sessões.

## Mapa de alterações para outro produto

`loja.config.json` é uma ficha; não gera código automaticamente. O agente deve alinhar:

1. Marca, logo, favicon, metadados, chat e e-mails nas quatro páginas.
2. Nome, fotos, variantes, detalhes e provas reais no HTML, seletor, checkout e worker.
3. Preço e promoção em `pricing.js`, seletor, checkout e `prepareOrder()` no worker. O exemplo dá 30% em duas ou mais unidades; não manter sem aprovação.
4. Constantes `PRODUCT`, `UNIT`, preço por item e total no worker. Nunca reutilizar o produto de outra loja.
5. Frete em `SHIPPING` e tarifas do checkout; prazo coerente com chat, e-mails e rastreio.
6. Origem, transportadoras, etapas e dias: confirmar antes de manter São Paulo e cinco contatos em 15 dias.
7. Constante `SITE` e demais links de domínio: substituir `https://loja-exemplo.invalid` pelo endereço aprovado.
8. Remetente e administrador nas variáveis; banco e segredos exclusivos na Cloudflare.

Preserve rotas e IDs usados pelos scripts ou atualize todas as referências e testes na mesma alteração. Não renomear `dist` sem ajustar hospedagem, prévia e verificador. Mantenha a origem e licenças das dependências livres.
