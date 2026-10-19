# Operação, pagamentos, rastreio e e-mails

## Fluxo do pedido

As quatro páginas são vendas `/`, checkout `/pagamento`, acompanhamento `/rastreio` e administração `/admin`. O checkout valida comprador, endereço, variantes e frete; o Worker recalcula os valores. O Pix é criado na Umbrella e fica aguardando pagamento. Gerar Pix não confirma compra paga. O webhook consulta a transação canônica e somente `PAID` libera a entrega, a confirmação por e-mail e o evento Purchase da Meta quando ativada.

Pedidos têm código comercial e código privado longo de acompanhamento. Esse código é da loja; não representa rastreamento emitido pela transportadora. O mapa mostra cidades aproximadas registradas pela administração, sem GPS e sem progresso inventado pelo tempo.

## Administração e atualizações

Entrar com o e-mail administrativo autorizado e código temporário recebido por e-mail. Sessão assinada, HttpOnly, Secure e SameSite; sem acesso público aos compradores. Selecionar pedido, escolher uma etapa, informar data, local e descrição verdadeira após confirmar com a transportadora e clicar em **Salvar atualização de entrega**. O botão da etapa preenche o formulário; o envio ocorre ao salvar, permitindo revisar os dados.

As cinco etapas são confirmação, preparação, coleta, transporte e entregue. Cada primeira atualização confirmada da etapa no ciclo envia e-mail automaticamente. Editar novamente a mesma etapa atualiza o histórico, mas não repete o aviso. A aprovação automática do pagamento já tem sua própria confirmação; a etapa manual de confirmação pode produzir um aviso de entrega separado. Pedidos pendentes, concluídos ou com solicitação de cancelamento/reentrega não permitem movimentações incompatíveis.

Filtros: pagamentos, entregas interrompidas, cancelamentos solicitados, reentregas pendentes e pagamentos que precisam de revisão. Receitas da taxa aparecem separadas da receita do produto. A sincronização reconcilia transações originais e taxas com a operadora.

## Três tentativas e reentrega

Registrar somente tentativas reais, em sequência, na etapa Em transporte. Cada tentativa exige data, motivo, local, descrição e confirmação da consulta à transportadora. Cada uma envia um e-mail próprio. Após a terceira, a entrega é interrompida e o acompanhamento apresenta atendimento, solicitação de cancelamento e, quando cabível, reentrega opcional de R$ 10,00.

A taxa depende de autorização explícita administrativa na terceira tentativa e de motivo atribuível ao destinatário; falha da loja/transportadora não habilita cobrança automática. O cliente revisa o endereço e consente no valor e na nova previsão de até 15 dias. O servidor usa produto exclusivo `REDELIVERY_PRODUCT_ID`, valor fixo de 1000 centavos e trava única por pedido/ciclo.

O novo ciclo começa somente após `PAID` consultado na operadora. Preserva pedido, código privado, valor original, histórico e endereço corrigido; limpa código antigo da transportadora e reinicia as etapas. A confirmação da taxa envia e-mail. Pix repetido retorna a mesma cobrança; timeout incerto exige verificação, sem gerar outra taxa. Pagamento tardio incompatível fica em revisão manual. Taxa expirada/recusada exige atendimento; não há recriação automática.

**Cancelar é uma solicitação para análise, não um estorno automático.** O operador deve resolver cancelamento, reembolso, pagamento em revisão e eventual nova cobrança diretamente com os serviços autorizados. A aplicação não realiza estornos. Se houver Pix de reentrega ativo, o cancelamento fica bloqueado para evitar conflito.

## E-mails e recuperação de falhas

Resend recebe remetente autenticado `ORDER_FROM_EMAIL`, com chave somente no segredo `RESEND_API_KEY`. Mensagens: Pix pendente, pagamento confirmado, cinco etapas, cada tentativa e reentrega paga. Todos usam códigos e links individuais; o terceiro aviso orienta consultar opções. Dados de teste não devem ser enviados a clientes.

A outbox D1 `order_emails` armazena conteúdo criptografado. Atualização manual e inclusão do aviso fazem parte do mesmo batch transacional. A chave única identifica pedido/ciclo/etapa ou tentativa; o Resend recebe a mesma `Idempotency-Key` nas novas tentativas. A referência permanece após o envio, mas o conteúdo é removido após aceite.

O envio é tentado imediatamente. Falhas mantêm o aviso pendente; ao carregar/atualizar o painel, até dez mensagens elegíveis são processadas, com até cinco tentativas e validade de 24 horas. Também há **Tentar e-mails pendentes**. Não existe cron autônomo: sem acesso ao painel, uma falha pode continuar pendente. Estados e limites aparecem nos detalhes do pedido. Limite/expiração exigem atendimento manual, sem reenvio financeiro automático.

**Enviar e-mail de teste** usa apenas o administrador configurado, modelo claramente fictício e demonstração `TESTE-GOKOCO`; não altera clientes, pedidos ou pagamentos. Rota autenticada, limitada a três solicitações por dez minutos. Aceite da API não comprova chegada à caixa de entrada: verificar caixa/spam ou evento de entrega do Resend. Não há webhook de bounce/delivery implementado nesta versão.

Referência da deduplicação do provedor: https://resend.com/docs/dashboard/emails/idempotency-keys (janela de 24 horas).

## Banco, segurança e rastreamento de campanhas

Cloudflare Pages serve os arquivos e Worker; Cloudflare D1 persiste `orders`, `payment_attempts`, `order_events`, `order_map_points`, `order_emails`, `admin_challenges`, `admin_rate`, `meta_events`, `delivery_state`, `delivery_attempts` e `redelivery_payments`. Tabelas são criadas de forma idempotente, sem apagar pedidos existentes. Não copiar banco de clientes para a matriz.

Contato, endereço, atribuição e payloads sensíveis são criptografados com AES-GCM; a chave deriva do segredo Umbrella. Rotacionar a chave exige migração planejada. Números de documento são usados no processamento financeiro, sem envio à Meta ou ao rastreio público. Tentativas e movimentações contêm texto operacional: não escrever informações sensíveis nas observações.

UTMs de primeiro/último acesso e identificadores permitidos acompanham o checkout e ficam no pedido e painel. Meta Pixel e CAPI usam IDs compartilhados para deduplicação, dados normalizados/hashes quando exigidos e Purchase somente após pagamento. Permanecem desativados até configuração e validação. Consultar RASTREAMENTO.md na matriz ou a seção de rastreamento do README na loja. Não exige Google Tag Manager.

## Configuração de uma nova loja e publicação

Matriz: manter `STORE_MODE=template`, Meta desativada, produto principal de exemplo, `REDELIVERY_PRODUCT_ID` vazio e sem banco/segredos de outra loja. Antes do primeiro deploy: briefing aprovado, marca/oferta/fotos verdadeiras, domínio SITE, preço canônico/frontend, tarifas, prazos, políticas e meios disponíveis revisados. Criar produto principal e produto Taxa de reentrega próprios, D1 exclusivo, webhook exclusivo e remetente Resend verificado; cadastrar segredos na hospedagem. Produto da taxa não é criado automaticamente pelo código.

Configurar `UMBRELLA_API_KEY`, `WEBHOOK_SECRET`, `RESEND_API_KEY`, `ORDER_FROM_EMAIL`, `ADMIN_EMAIL`, `REDELIVERY_PRODUCT_ID` e binding `PAYMENTS_DB`. Configurações Meta são opcionais e documentadas separadamente. Nunca versionar chaves, cookies, arquivos .env/.dev.vars ou exportações de compradores. Só ativar STORE_MODE=live na nova loja após validação.

Antes de publicar: executar testes e verificador, conferir isolamento, simular etapas/tentativas/cancelamento/reentrega/PAID/timeout, testar e-mails sem duplicação e revisar conteúdo. Após publicar: conferir as quatro rotas, configuração Meta e autenticação e fazer envio de teste administrativo. Push pode iniciar deploy automático; matriz deve ficar apenas no GitHub quando esse for o escopo.

Não confundir simulação com homologação financeira real: nenhum teste automatizado paga uma transação. A taxa real ainda exige confirmação controlada quando houver autorização específica para pagamento. Não modificar pedidos reais só para conferir o fluxo.
