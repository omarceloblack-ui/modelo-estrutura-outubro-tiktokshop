# Rastreamento — regra obrigatória desde o primeiro deploy

Leia este arquivo antes de personalizar, conectar ou publicar qualquer loja criada pela matriz. Antes do primeiro deploy, conferir UTMs, segurança, eventos e decisão de ativação. Não ativar Meta automaticamente por encontrar credenciais ou uma sessão aberta.

## Arquitetura

Página/checkout → Worker Cloudflare → D1 exclusivo da loja. A Umbrella gera o Pix e confirma o pagamento; o Worker consulta a transação canônica, atualiza o pedido, prepara a confirmação por e-mail e, se habilitada, envia a conversão à Meta. Pixel no navegador e API de Conversões no servidor operam juntos, sem necessidade de Google Tag Manager.

Arquivos: dist/js/attribution.js, dist/js/meta-events.js, dist/js/checkout.js, dist/js/seletor-produto.js, dist/js/admin.js e dist/_worker.js. Rotas: /api/marketing/config e /api/marketing/checkout. A configuração pública nunca entrega o token.

## UTMs e banco

Capturar somente utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id e fbclid. Preservar primeiro acesso e última campanha, caminho de entrada sem query arbitrária e horário. Persistência local de até 30 dias; transportar os parâmetros permitidos ao checkout. Não capturar e-mail/CPF de parâmetros extras na URL. A origem reservada teste-interno é descartada para não contaminar compras reais.

Ao gerar um pedido, o servidor valida e limita os campos. Atribuição e contatos ficam criptografados em orders.details no D1, preservados na sincronização e na passagem de pendente para pago. O painel mostra primeiro acesso e última campanha; o rastreio público não recebe esses dados. Pedidos anteriores podem aparecer sem UTMs. Acesso ao checkout não cria automaticamente um pedido no painel.

## Eventos e deduplicação

| Situação | Evento | Identificador |
| --- | --- | --- |
| Entrada em /pagamento | InitiateCheckout | UUID da sessão de checkout |
| Transação Pix criada | PixGerado, evento personalizado | pix:ID da transação |
| Pagamento PAID confirmado na Umbrella | Purchase | purchase:ID da transação |

Nunca usar geração de Pix como Purchase. Não confiar em status enviado pelo navegador ou apenas no corpo do webhook. Pixel usa eventID; CAPI usa event_id correspondente e mesmo nome. O Pixel exige página aberta e pode ser bloqueado; a API pode confirmar por webhook com a página fechada. Não enviar histórico indiscriminadamente como novas conversões.

## Dados enviados quando habilitada

Nome/sobrenome, e-mail, telefone com país, cidade, UF, CEP e país: normalização e SHA-256 nos campos aplicáveis. IP, user agent, fbp e fbc usam os campos próprios sem hash quando disponíveis. Itens, quantidades, valor, moeda e ID do pedido compõem o evento. CPF, rua/número/complemento, código Pix, código privado de rastreio e segredos não entram no payload Meta. Hash não é anonimização. Confirmar finalidade, transparência e preferências de privacidade antes da ativação; não coletar dados adicionais só para preencher todos os campos.

## Configuração exclusiva de cada loja

1. Preencher e aprovar o briefing da loja e produto; configurar domínio real, preço e D1 próprios.
2. No Gerenciador de Eventos da Meta, identificar o pixel/dataset correto e conferir permissões.
3. Manter META_ENABLED=false até os testes finais. Preencher META_PIXEL_ID e META_GRAPH_VERSION suportada, consultando documentação oficial atual.
4. Guardar META_ACCESS_TOKEN somente como segredo na Cloudflare. Nunca colocar token em HTML, JavaScript, loja.config.json, Git, prints ou documentação.
5. Usar META_TEST_EVENT_CODE durante o teste de eventos. Conferir recebimento, campos, valores e deduplicação no Events Manager. Remover o código de teste para produção.
6. Testar bloqueio de navegador, recarga, cliques repetidos e pagamento com página fechada. Preferir simulações; cobrança real exige dados autorizados e participação do usuário quando aplicável.
7. Revisar a política e as escolhas de privacidade da loja. Conferir CSP para os domínios Meta autorizados. Não adicionar outros rastreadores por padrão.
8. Ativar META_ENABLED=true somente na loja aprovada e fora de STORE_MODE=template. Sem configuração completa, nenhum script Meta é carregado ou evento enviado.

## Conferência antes de TODO primeiro deploy

- [ ] Ler este documento e conferir os arquivos.
- [ ] Validar primeiro/último acesso, transporte das UTMs e persistência depois de PAID.
- [ ] Conferir as UTMs nos detalhes administrativos de pedidos pendentes e pagos.
- [ ] Executar npm test e npm run check.
- [ ] Registrar decisão explícita: Meta desativada por enquanto ou ativação validada.
- [ ] Preencher rastreamento.revisadoAntesDeploy, rastreamento.utmValidado e rastreamento.meta.decisao na ficha.
- [ ] Se decisao=ativar, preencher pixelId, eventosValidados e credencialConfiguradaNaHospedagem; token nunca na ficha.
- [ ] Executar npm run preflight. Dados ausentes bloqueiam a ativação; não remover o bloqueio para publicar uma loja incompleta.
- [ ] Depois do deploy, conferir /api/marketing/config, as quatro páginas e o estado real de envio. Atualizar ESTADO.md e RELATORIO-VALIDACAO.md.

Pode publicar com Meta DESATIVADA se essa decisão estiver registrada; isso não equivale a rastreamento Meta ativo. A revisão de UTMs e configuração continua obrigatória.

## Falhas e limites

meta_events registra ID, nome, estado e tentativas no D1, sem token ou dados pessoais em texto. Evita envio simultâneo/duplicado no servidor. Falhas podem ser tentadas novamente na próxima consulta, sincronização ou webhook, até cinco tentativas; não há cron ou fila autônoma de reenvio. Antes de ativar em uma operação que exija entrega garantida, definir monitoramento e estratégia de reenvio apropriados. Aceite da API, deduplicação e atribuição real precisam ser conferidos na Meta; testes locais não comprovam esses resultados.

## E-mail após pagamento

buildPaidOrderEmail envia parabéns e sucesso somente após confirmação. Inclui resumo, código individual e botão direto ao rastreio com código preenchido. O código da loja não é apresentado como código da transportadora. O e-mail pendente continua sendo aguardando pagamento e contém o Pix. Validar remetente, Resend, idempotência e entrega sem mandar testes a compradores não autorizados.

## Referências oficiais

- https://developers.facebook.com/docs/marketing-api/conversions-api/
- https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events/
- https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters/
- https://github.com/facebook/facebook-python-business-sdk

Documentação e versões podem mudar; consultar antes de ativar uma nova loja.
