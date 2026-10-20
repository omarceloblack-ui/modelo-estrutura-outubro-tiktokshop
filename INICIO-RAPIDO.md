# Início de uma nova loja

## Preparação da pessoa responsável

1. Baixe a matriz atual em https://github.com/omarceloblack-ui/modelo-estrutura-outubro-tiktokshop (acesso privado autorizado).
2. Extraia em uma pasta exclusiva da nova loja. Abra essa pasta como projeto no Codex e inicie a conversa nela.
3. Separe nome, produto, preço, logo, cores, imagens e vídeos. O nome pode ser decidido no briefing, antes de nomear o repositório e os recursos definitivos.
4. Tenha contas próprias de GitHub, Cloudflare, Umbrella, Resend e Meta. Deixe as sessões conectadas no navegador disponível às ferramentas.
5. Tenha domínio comprado, acesso ao DNS e caixa de e-mail administrativa ativa.

Cada loja tem contas, repositório, hospedagem, banco, produtos financeiros, remetente, Pixel e API próprios. Não reutilizar compradores ou credenciais de outra loja. O domínio autenticado no Resend não cria uma caixa postal.

Leia [contas e acessos](docs/02-CHECKLIST-CONTAS.md) e responda ao [briefing completo](BRIEFING.md). O agente deve aproveitar respostas existentes e perguntar por grupos, sem exigir tudo de uma vez.

## Trabalho a partir da pasta aberta

A pasta baixada é a base de trabalho. Não baixar outra cópia nem substituir arquivos automaticamente. Conferir estrutura, estado, alterações e origem Git. Se a versão/commit não puder ser confirmado, registrar origem informada e versão não verificada, sem inventar SHA.

Antes de editar, seguir AGENTS.md e INSTRUCOES.md. Não herdar conclusões de validação da matriz como testes da nova loja. Registrar decisões sem segredos em loja.config.json e nos documentos de estado; a ficha não aplica mudanças automaticamente.

Se houve download ZIP, iniciar Git próprio quando adequado. Se houve clone, conferir o remoto e desvincular o destino de envio da matriz antes de enviar alterações. Não apagar histórico ou mudanças existentes. Criar repositório independente na conta da nova loja após definir o nome e conforme autorização. Nunca enviar personalizações à matriz.

## Ordem de execução

1. Ler a base e levantar briefing/acessos.
2. Apresentar resumo das escolhas e pendências; aproveitar aprovação já dada no escopo.
3. Personalizar as quatro páginas, servidor, mídias, preços, políticas e e-mails.
4. Configurar recursos exclusivos nas contas da nova loja, mantendo operações reais bloqueadas até a ativação validada.
5. Mostrar prévia e simular com dados fictícios; testar integrações dentro da autorização.
6. Executar npm test e npm run check; revisar isolamento e conteúdo.
7. Enviar ao novo GitHub e publicar apenas no escopo autorizado. Conferir antes se push dispara deploy.
8. Conferir produção, registrar evidências/limites e entregar links e orientações.

Preservar a lógica interna de pagamento, painel, rastreio, notificações, UTMs e reentrega. Valores, variantes e termos operacionais podem exigir ajustes coerentes entre interface, servidor, provedor e testes.

## Participação humana e credenciais

Login aberto não garante acesso por API/CLI: conferir conta e autenticação de cada ferramenta. A pessoa conclui MFA, CAPTCHA, verificação de identidade, contratos e decisões de custos. Não pedir senhas/tokens no chat. Segredos somente na hospedagem ou em ambiente local ignorado pelo Git, sem logs ou screenshots.

Pagamento e estorno real exigem autorização específica. Testes de e-mail usam destinatário autorizado e conteúdo fictício. Distinguir simulação, aceite do provedor, recebimento real e pagamento confirmado.

Use [PROMPT-INICIAL.md](PROMPT-INICIAL.md), mesmo sem a skill instalada.

## Como iniciar e como retomar

Em cada nova loja, enviar o texto de PROMPT-INICIAL.md na conversa da pasta exclusiva. A skill é opcional; se instalada, pode ser invocada antes do prompt. Para continuar uma loja, abrir sua própria pasta e pedir leitura do estado e retomada, sem repetir briefing resolvido nem baixar a matriz sobre alterações existentes.
