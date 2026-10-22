# Serviços próprios de cada loja

Consultar documentação oficial atual antes de chamadas dependentes do formato/provedor. A skill orienta e usa ferramentas disponíveis, mas não instala integrações nem presume login.

## GitHub e Cloudflare

Conferir a conta autenticada, pasta, branch e remoto. Criar novo repositório privado por padrão, após definir o nome; nunca enviar personalizações à matriz. Se GitHub pedir MFA/CAPTCHA, orientar o usuário. Pages publica `dist`; Worker atende `/api/*`. Listar zonas da conta Cloudflare, usar apenas domínio controlado pela loja e criar Pages/D1 próprios. Pages pode dar ao projeto `*.pages.dev`; e-mail de produção requer um domínio próprio verificado no Resend. Criar D1 exclusivo, vincular como `PAYMENTS_DB` e preencher o `SITE` da loja. O schema SQL/D1 está inicializado no Worker do repositório, sem SQL externo. Não trocar banco de loja existente para testar.

Fontes: https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template ; https://developers.cloudflare.com/pages/functions/ ; https://developers.cloudflare.com/d1/

## UmbrellaPag

Conferir conta comercial, habilitação e produto. Usar endpoint oficial para listar produtos da nova conta; se não houver equivalente, criar produto físico Escova Modeladora GOKOCO a R$ 37,90. Validar nome, status, preço e ID/link retornado antes de configurar a loja. Guardar `UMBRELLA_API_KEY` como segredo, nunca em prompt/config versionada.

Se houver reentrega, criar/conferir produto próprio e `REDELIVERY_PRODUCT_ID`. A base usa 1000 centavos. Outro valor exige mudança coerente em produto, código, consentimento e testes. ID público não substitui chave.

Guardar `WEBHOOK_SECRET` exclusivo e registrar destino da nova loja. Não imprimir URL secreta completa. Avisos exigem consulta da transação canônica. Antes de repetir uma criação com erro/timeout, verificar se o recurso ou cobrança já existe. Não gerar cobrança real só para testar disponibilidade.

Conta: https://umbrellapag.com/ . [Criar produto](https://docs.umbrellapag.com/create-20025733e0) e [listar produtos](https://docs.umbrellapag.com/find-all-20025734e0). Consultar a documentação vigente antes de cada chamada, sem inferir formato ou `Content-Type` por exemplos antigos. Se faltar acesso/aprovação, parar e guiar o passo manual.

## Resend e DNS

Confirmar uma zona da Cloudflare controlada pela nova loja, adicionar esse domínio ao Resend e verificar status/capacidade de envio. `*.pages.dev` não substitui domínio próprio para remetente de produção. Sem zona controlada, não ativar e-mail real nem comprar domínio sem autorização. Não apagar registros existentes nem enfraquecer autenticação para passar na verificação. `ORDER_FROM_EMAIL` é remetente autenticado; `ADMIN_EMAIL` recebe login/testes.

Verificação do domínio não cria caixa postal. Confirmar o canal que recebe/responde se ele for divulgado. Teste fictício só ao destinatário autorizado. Aceite da API não comprova caixa de entrada. Conferir entrega/spam por acesso permitido ou confirmação do usuário.

Preservar a mesma referência e `Idempotency-Key` ao repetir envio incerto. Fontes: https://resend.com/docs/dashboard/domains/introduction ; https://resend.com/docs/dashboard/emails/idempotency-keys

## Meta opcional

Na nova conta Meta, criar/selecionar Pixel/dataset próprio da loja usando API oficial ou painel autorizado. Não copiar Pixel/token da origem. Manter `META_ENABLED=false` até o ID novo e o segredo CAPI estarem configurados e testes aprovados. Usar versão vigente `META_GRAPH_VERSION` e `META_TEST_EVENT_CODE` apenas em teste. Token somente como segredo no servidor, nunca navegador/Git/ficha/prints. Se negócio/permissões/MFA forem exigidos, orientar o passo manual.

Rever finalidade, transparência e preferências de privacidade. Código preparado não significa plataforma completa de consentimento. Não prometer resultado de campanha. Ler `RASTREAMENTO.md` do projeto antes do primeiro deploy.

Fontes: https://developers.facebook.com/docs/marketing-api/conversions-api/ ; https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events/

## Acesso e segredos

Segredo hospedado pode não ser legível de volta. Não pedir a chave no chat para contornar isso. Usar ambiente privado apropriado ou teste hospedado autenticado e autorizado. Não fabricar sessão administrativa nem forjar cookie para testar produção: usar login normal ou integração legítima disponível.

Login/MFA/CAPTCHA/contrato que dependem do usuário são bloqueios específicos, não sucesso simulado. Explicar o necessário e continuar tarefas independentes. Sessão logada não autoriza gasto, pagamento ou ampliação de acesso. Preservar as autorizações humanas válidas sem criar confirmações repetidas.
