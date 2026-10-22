# 04 — Implementação e conexão

Comece pelo clone já aberto, após analisar seus arquivos e briefing. A skill está incluída em `.agents/skills/construir-loja-completa/`; não precisa ser baixada. Consultar documentação oficial atual antes de chamadas a serviços; contas, permissões e formatos mudam.

## 1. Personalizar

Manter Escova Modeladora GOKOCO por R$ 37,90, cores, imagens, layout, logo TikTok Shop e os 19 feedbacks/quatro vídeos autorizados. Remover/substituir nome, CNPJ, contatos e recursos da operação de origem. Reentrega opcional custa R$ 10,00 e não altera o frete inicial. Preços em centavos, com cálculo canônico no servidor. Validar links e recursos; não copiar selos de plataforma.

## 2. GitHub

Após definir o nome, criar repositório GitHub novo e vazio, privado por padrão, na conta autenticada da operação. Preferir API/CLI oficial autorizada; confirmar nome, conta e visibilidade. Se a criação exigir UI/MFA, abrir a página no navegador e guiar essa etapa. Copiar a pasta-fonte para pasta irmã sem `.git`/segredos/caches, iniciar Git limpo e revisar diff antes de push. Nunca fazer fork nem apontar remoto da loja para a matriz. Não subir `.env`, `.dev.vars`, banco, exports de clientes ou chaves. Executar testes e registrar mudanças.

## 3. Cloudflare Pages e D1

Listar contas e zonas Cloudflare, identificar a conta autorizada e criar Pages e D1 exclusivos. Pages oferece subdomínio `*.pages.dev` para o site. Para domínio personalizado, usar somente domínio controlado pela operação e associar pelo fluxo oficial Pages; não presumir que há domínio gratuito registrado. Saída `dist`, sem comando de build. Criar D1 exclusivo, vincular como `PAYMENTS_DB`, preencher o ID novo no Wrangler. O Worker contém SQL/schema para inicializar as tabelas; não baixar SQL externo. Validar schema pelo código e testes antes da ativação. Manter `STORE_MODE=template` enquanto configura.

## 4. Umbrella

Conferir conta comercial e documentação API vigente. Listar produtos Umbrella primeiro. Se não houver equivalente nesta conta, criar o produto físico Escova Modeladora GOKOCO a R$ 37,90 pela API oficial; criar/confirmar também o produto de reentrega de R$ 10,00 se exigido pelo fluxo. Comparar conta, título, preço, tipo e status para evitar duplicatas. Guardar os IDs próprios na configuração da nova loja e a `UMBRELLA_API_KEY` somente como segredo Cloudflare. Se API, acesso ou aprovação comercial faltarem, parar e orientar a etapa manual sem afirmar sucesso. Nunca reutilizar IDs de outra loja nem gerar cobrança real para testar. [Criar produto](https://docs.umbrellapag.com/create-20025733e0) · [Listar produtos](https://docs.umbrellapag.com/find-all-20025734e0).

Registrar webhook TRANSACTION em `/api/user/webhook` conforme documentação atual; URL de destino `/api/webhook/umbrella/<segredo>`. Gerar `WEBHOOK_SECRET` exclusivo e guardá-lo como segredo. Nunca registrar a URL inteira no Git. O servidor deve consultar a transação canônica; status recebido no corpo não prova pagamento.

## 5. Resend

Listar zonas da conta Cloudflare e confirmar propriedade/controle para escolher domínio remetente. O `*.pages.dev` serve o site, mas não substitui domínio próprio autenticado para envio de produção. Se não houver domínio controlado, manter e-mails reais bloqueados; não inventar domínio, comprar ou alterar nameservers/DNS sem autorização. Adicionar apenas registros indicados pelo Resend, sem remover registros existentes nem enfraquecer DMARC. Após verificação de envio concluída, criar chave de envio restrita e guardar `RESEND_API_KEY` como segredo. Consultar [documentação oficial do Resend](https://resend.com/docs).

Preencher `ORDER_FROM_EMAIL` e `ADMIN_EMAIL` com valores reais aprovados. Testar e-mail administrativo, pedido pendente com Pix e confirmação com link. E-mail de pendente não declara pagamento aprovado. Verificar entrega, não apenas aceite da API. Evitar duplicatas e respeitar limites do plano.

## 6. Segurança e ativação

Conferir banco, chaves, preço, IDs de produto, remetente, domínio e links. Criar/selecionar Pixel/dataset novo no Gerenciador de Eventos da conta Meta da loja e obter token CAPI próprio por fluxo oficial; se a permissão/MFA exigir pessoa, guiar a etapa. Não copiar Pixel da origem. Deixar `META_ENABLED=false` até testar e aprovar; pode permanecer desativado por decisão documentada. Executar checklist de testes. Configurar a constante `SITE` com URL HTTPS real. Só trocar `STORE_MODE` para `live` quando a loja estiver aprovada e preparada. Publicar pelo GitHub e conferir deploy e quatro páginas.

## 7. Teste real controlado

Preferir simulações. Para cobrança ou pagamento real, obter dados autorizados e a participação do usuário quando necessária. Nunca marcar pedido pago/entregue para testar. Usar somente o e-mail administrativo autorizado para mensagens extras de teste. Se uma etapa real não puder ser validada, registrá-la como pendência, não como aprovação.

## Entregar

URLs de vendas, pagamento, rastreio, painel e repositório; acesso administrativo; código de demonstração; relatório e orientações operacionais. Nunca entregar segredos em texto de relatório.

## Bloqueio antes do primeiro deploy

Cumprir RASTREAMENTO.md, registrar os campos rastreamento da ficha e executar preflight. É permitido manter Meta desativada com decisão documentada; não ignorar a conferência de UTMs. Ativação real exige pixel, segredo, versão de API e testes de recebimento/deduplicação.

## Entregas e notificações atualizadas

Consulte ../OPERACAO.md para o fluxo completo: cinco etapas confirmadas, e-mail automático, três tentativas, solicitação de cancelamento, taxa opcional e novo ciclo somente após PAID. Outbox criptografada, idempotência, estados de falha e teste administrativo incorporados. Configuração real e homologação financeira continuam obrigatórias na nova loja.
