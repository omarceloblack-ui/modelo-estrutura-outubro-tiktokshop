# Início de uma nova loja

## Preparação da pessoa responsável

1. Baixe ou clone este repositório pela página do GitHub em que ele está disponível e extraia/abra uma pasta exclusiva para a nova loja.
2. Abra essa pasta como projeto no Codex. A skill completa está incluída em `.agents/skills/construir-loja-completa/`; não é necessário baixar ou instalar uma skill à parte.
3. Na conversa aberta nessa pasta, escreva apenas `iniciar`. O agente deve ler as instruções desta pasta, examinar o projeto local inteiro e começar o briefing. Não deve baixar outra cópia.
4. A base mantém a Escova Modeladora GOKOCO a R$ 37,90, cores e imagens existentes, a logo TikTok Shop e os depoimentos/vídeos autorizados. A taxa de reentrega é R$ 10,00; o frete inicial continua conforme as opções atuais do checkout.
5. Tenha ou conecte contas próprias de GitHub, Cloudflare, Umbrella, Resend e Meta. O agente deve identificar a conta autenticada antes de criar recursos.
6. Para o site, Cloudflare Pages fornece o subdomínio do projeto `*.pages.dev`. Para envio de e-mail de produção, é necessário um domínio próprio verificado no Resend; o agente deve procurar zonas já existentes na conta Cloudflare e usar uma autorizada. Se não houver domínio disponível, deve parar o envio de e-mail real e explicar a pendência, sem comprar um domínio nem inventar um.

Cada loja tem repositório, hospedagem, banco, produto Umbrella, remetente, Pixel e credenciais próprios. Não reutilizar identidade empresarial, CNPJ, telefone, IDs nem credenciais da operação de origem. Domínio verificado para envio não cria uma caixa postal. A criação de recursos é feita pela API oficial quando suportada e autenticada; senão, o agente deve guiar o passo manual sem afirmar que concluiu.

Leia [contas e acessos](docs/02-CHECKLIST-CONTAS.md) e responda ao [briefing completo](BRIEFING.md). O agente deve aproveitar respostas existentes e perguntar por grupos, sem exigir tudo de uma vez.

## Trabalho a partir da pasta aberta

A pasta baixada é a fonte local. Não baixar outra matriz nem substituir arquivos. Inventarie estrutura, estado, alterações e origem Git. Após nome/slug definidos, preserve a fonte e faça a nova loja numa pasta irmã copiando arquivos e mídias locais, sem `.git`, segredos, banco ou caches. Assim o repositório novo começa sem histórico/identidade da matriz. Se a pessoa já abriu uma pasta de loja com progresso próprio, retome nela.

Antes de editar, seguir AGENTS.md e INSTRUCOES.md. Não herdar conclusões de validação da matriz como testes da nova loja. Registrar decisões sem segredos em loja.config.json e nos documentos de estado; a ficha não aplica mudanças automaticamente.

Crie repositório privado vazio na conta GitHub autenticada, depois de definir o nome. Inicialize Git na pasta irmã e confira remoto antes do primeiro push. Nunca faça fork da matriz nem envie personalizações para ela. Preserve a pasta-fonte e alterações existentes.

## Ordem de execução

1. Ler a base inteira e identificar contas/permissões acessíveis.
2. Resumir decisões-base já aprovadas e levantar somente dados faltantes da nova loja.
3. Criar pasta irmã, repositório vazio e recursos novos no escopo de `AGENTS.md`.
4. Personalizar com identidade empresarial/contatos próprios, mantendo produto, preço, layout e mídias-base; configurar contas exclusivas e testar.
5. Mostrar prévia e simular com dados fictícios; testar integrações dentro da autorização.
6. Executar npm test e npm run check; revisar isolamento e conteúdo.
7. Enviar ao novo GitHub e publicar no projeto Pages novo, conforme autorização de `iniciar`; conferir antes se push dispara deploy.
8. Conferir produção, registrar evidências/limites e entregar links e orientações.

Preservar a lógica interna de pagamento, painel, rastreio, notificações, UTMs e reentrega. Valores, variantes e termos operacionais podem exigir ajustes coerentes entre interface, servidor, provedor e testes.

## Participação humana e credenciais

Login aberto não garante acesso por API/CLI: conferir conta e autenticação de cada ferramenta. A pessoa conclui MFA, CAPTCHA, verificação de identidade, contratos e decisões de custos. Não pedir senhas/tokens no chat. Segredos somente na hospedagem ou em ambiente local ignorado pelo Git, sem logs ou screenshots.

Pagamento e estorno real exigem autorização específica. Testes de e-mail usam destinatário autorizado e conteúdo fictício. Distinguir simulação, aceite do provedor, recebimento real e pagamento confirmado.

Se o agente não reconhecer a instrução curta, cole o texto de [PROMPT-INICIAL.md](PROMPT-INICIAL.md). A skill já está nesta pasta.

## Como iniciar e como retomar

Em cada nova loja, abrir a pasta exclusiva e enviar `iniciar` na conversa. Isso usa as instruções e a skill já incluídas neste repositório. Para continuar uma loja, abrir a pasta dela e pedir leitura do estado e retomada, sem repetir briefing resolvido nem baixar a matriz sobre alterações existentes.
