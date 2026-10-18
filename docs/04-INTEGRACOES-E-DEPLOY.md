# 04 — Implementação e conexão

Somente após o briefing aprovado. Consultar documentação oficial atual antes de chamadas a serviços; contas e formatos podem mudar.

## 1. Personalizar

Substituir todo conteúdo de exemplo, oferta, variante, mídia, marca e dados operacionais conforme arquitetura. Remover referências não utilizadas. Preços em centavos, com cálculo canônico no servidor. Validar logo, mobile, links e recursos. Não copiar selos de plataforma nem provas não autorizadas.

## 2. GitHub

Usar novo repositório privado criado pelo template, branch main. Conferir remoto e arquivos antes do push. Não subir `.env`, `.dev.vars`, banco, exports de clientes ou chaves. Executar testes e registrar mudanças. A matriz tem verificação automática no GitHub Actions.

## 3. Cloudflare Pages e D1

Criar projeto exclusivo, conectar o repositório certo, saída `dist`, sem comando de build. Criar D1 exclusivo e vincular como `PAYMENTS_DB`. Adicionar esse binding ao Wrangler com ID do banco novo. Não reutilizar IDs de outra loja. Manter `STORE_MODE=template` enquanto configura. Confirmar que configurações do Wrangler e painel não se contradizem.

## 4. Umbrella

Conferir conta comercial, gerar chave apropriada e guardar `UMBRELLA_API_KEY` como segredo na Cloudflare. Criar/reutilizar o produto correto desta loja, com tipo físico/digital e preço aprovados. Preencher `PRODUCT`, valores e campos necessários no worker. Não gerar cobrança real só para conferir uma integração.

Registrar webhook TRANSACTION em `/api/user/webhook` conforme documentação atual; URL de destino `/api/webhook/umbrella/<segredo>`. Gerar `WEBHOOK_SECRET` exclusivo e guardá-lo como segredo. Nunca registrar a URL inteira no Git. O servidor deve consultar a transação canônica; status recebido no corpo não prova pagamento.

## 5. Resend

Autenticar o domínio remetente no DNS com os registros reais apresentados pela conta, sem remover registros existentes nem enfraquecer DMARC. Domínio do site pode continuar pages.dev; envio autenticado exige domínio de e-mail próprio. Criar chave somente de envio e restrita ao domínio; guardar `RESEND_API_KEY` como segredo.

Preencher `ORDER_FROM_EMAIL` e `ADMIN_EMAIL` com valores reais aprovados. Testar e-mail administrativo, pedido pendente com Pix e confirmação com link. E-mail de pendente não declara pagamento aprovado. Verificar entrega, não apenas aceite da API. Evitar duplicatas e respeitar limites do plano.

## 6. Segurança e ativação

Conferir banco, chaves, preço, ID do produto, remetente, domínio e links. Executar checklist de testes. Configurar a constante `SITE` com URL HTTPS real. Só trocar `STORE_MODE` para `live` quando a loja estiver aprovada e preparada. Publicar pelo GitHub e conferir a conclusão do deploy e as quatro páginas no domínio final.

## 7. Teste real controlado

Preferir simulações. Para cobrança ou pagamento real, obter dados autorizados e a participação do usuário quando necessária. Nunca marcar pedido pago/entregue para testar. Usar somente o e-mail administrativo autorizado para mensagens extras de teste. Se uma etapa real não puder ser validada, registrá-la como pendência, não como aprovação.

## Entregar

URLs de vendas, pagamento, rastreio, painel e repositório; acesso administrativo; código de demonstração; relatório e orientações operacionais. Nunca entregar segredos em texto de relatório.
