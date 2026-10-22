# Fluxos da base

Após iniciar, ler também `OPERACAO.md` e `RASTREAMENTO.md` do projeto para a versão completa e eventuais atualizações. Conferir o código quando houver divergência entre documentação e comportamento.

## Pagamento

Vitrine, variantes/quantidades, contato, endereço, frete, validação no servidor, Pix, pedido pendente, consulta/webhook e `PAID`. Abrir checkout não cria automaticamente uma compra no painel. Gerar Pix não confirma pagamento. O servidor recalcula os valores.

Cliques repetidos reutilizam tentativa/cobrança. Timeout incerto exige reconciliação. QR local. Somente `PAID` canônico libera a compra paga. Manter valores de transações anteriores quando o preço mudar.

## D1 e privacidade

Tabelas da base: `orders`, `payment_attempts`, `order_events`, `order_map_points`, `order_emails`, `admin_challenges`, `admin_rate`, `meta_events`, `delivery_state`, `delivery_attempts` e `redelivery_payments`. Contato, endereço, atribuição e payloads sensíveis são criptografados. Chave deriva do segredo Umbrella: trocar exige migração planejada. Não escrever dados sensíveis nas observações. Rastreio público não expõe documentos, contatos, UTMs ou segredos.

## Administração e entrega

Login com e-mail autorizado e código temporário, sessão protegida, expiração e logout. Preservar controle em todas as rotas. Filtros distinguem pagamentos, entrega interrompida, cancelamento, reentrega pendente e pagamento para revisão. Sincronização consulta o provedor.

Etapas: confirmado, preparação, coletado, em transporte e entregue. O botão preenche o formulário; salvar efetiva a movimentação confirmada. Tempo não avança entrega. Mapa usa centro aproximado de município informado pela loja e ligação ilustrativa, sem GPS. Código privado da loja é diferente do código da transportadora.

Agenda de contatos não faz ligações nem envia lembretes. Preservar histórico e impedir mutações incompatíveis/concorrentes. Demonstração `TESTE-GOKOCO` usa somente dados fictícios.

## E-mails

Avisos: Pix pendente, pagamento confirmado, primeira atualização de cada etapa/ciclo, cada tentativa e reentrega paga. Confirmação financeira e registro manual de confirmação são avisos distintos. Repetir/corrigir a mesma etapa não repete seu aviso.

Atualização manual e mensagem pendente usam batch transacional. Outbox criptografada, chave única por ocorrência e idempotência no Resend. Após aceite, remover conteúdo e manter referência. Retry por acesso/atualização do painel ou botão processa até dez elegíveis, no máximo cinco tentativas em 24 horas. Sem cron independente e sem webhook de bounce/delivery incluído. Não prometer entrega garantida. Teste administrativo só ao administrador, com autenticação, limite e dados fictícios. Aceite e caixa de entrada são evidências distintas.

## Tentativas e reentrega

Tentativas 1/2/3 exigem pedido pago em transporte, sequência, data, motivo, local, nota e confirmação operacional. Terceira interrompe o ciclo. Taxa só quando autorizada e motivo cabível atribuível ao destinatário. Falha da loja/transportadora não habilita cobrança automática.

Cliente pode buscar atendimento, solicitar cancelamento para análise ou aceitar reentrega permitida. Cancelamento não estorna. Pix ativo/incerto bloqueia escolha incompatível e exige atendimento.

Reentrega: revisar endereço, consentir, Pix fixo no servidor e trava por pedido/ciclo. Reiniciar só após `PAID` canônico. Preservar pedido, código privado, valor original, histórico e endereço corrigido. Limpar código antigo da transportadora. Taxa expirada/incerta não autoriza nova cobrança automática. Pagamento tardio incompatível fica em revisão humana. Não enviar a taxa como nova compra do produto à Meta por padrão.

## UTMs e Meta

Campos: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_id`, `fbclid`. Primeiro/último acesso por até 30 dias no navegador, transporte ao checkout e persistência validada/criptografada. Preservar ao sincronizar e pagar. Descartar origem reservada `teste-interno`. Compra sem UTMs é possível.

`InitiateCheckout`: entrada no pagamento e ID da sessão. `PixGerado`: transação criada, `pix:ID`. `Purchase`: somente `PAID`, `purchase:ID`. Pixel/CAPI usam mesmo nome e IDs correspondentes. Aplicar normalização e hashes exigidos. IP, navegador e fbp/fbc vão em campos próprios quando disponíveis. CPF, Pix, endereço completo e código privado ficam fora da Meta. Hash não anonimiza.

Meta inicia desativada. Falhas têm estado no banco e retry por consultas/sincronização/webhook até cinco vezes, sem cron autônomo. Recebimento/deduplicação reais exigem validação na Meta, sem reenviar histórico indiscriminadamente como novas compras.
