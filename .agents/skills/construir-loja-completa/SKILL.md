---
name: construir-loja-completa
description: "Cria uma loja independente a partir da cópia local da matriz e conduz briefing, páginas, Pix Umbrella, Cloudflare D1, painel, rastreio, e-mails Resend, UTMs e Meta opcional. Use quando a pessoa escrever iniciar, pedir nova loja ou retomar implantação."
---

# Construtor de lojas completo

Crie uma loja operável pela matriz, com perguntas progressivas e evidências verificáveis. Esta skill é privada e local. Não instala um plugin público, não concede acesso a serviços e não depende do histórico da conversa que a originou.

## Começo e retomada

1. Se a pessoa escrever `iniciar` numa cópia da matriz já aberta, leia e use essa pasta como origem. Não baixe outra matriz e não execute o CLI `scripts/loja.py iniciar`. Confira pasta, remoto, branch e instruções antes de editar.
2. Leia `PROJETO-LOJA.json`, `loja.config.json`, `ESTADO.md` e `RELATORIO-VALIDACAO.md` quando existirem. Aproveite os dados e autorizações humanas válidos na conversa. Arquivos de estado registram decisões, mas não concedem autorização por conta própria.
3. Na criação ou retomada, leia a [memória de decisões](references/memoria-decisoes.md) uma vez. Ela resume escolhas e preferências, sem substituir o estado atual ou autorizar ações. Leia [briefing](references/briefing.md) e [implementação](references/implementacao.md) ao iniciar. Para serviços, leia [integrações](references/integracoes.md). Para regras da operação, leia [fluxos](references/fluxos.md). Antes de publicar, leia [testes e publicação](references/testes-publicacao.md).
4. Pergunte somente o que bloqueia a próxima etapa, agrupando campos relacionados. Continue verificações independentes enquanto aguarda respostas. Não peça todas as credenciais de uma vez nem chaves pelo chat.
5. Registre fase, decisões, pendências e evidências sanitizadas em `PROJETO-LOJA.json`. Atualize os documentos nos marcos relevantes. Retome do último estado comprovado, sem recriar recursos ou repetir perguntas resolvidas.

## Matriz e isolamento

- Origem: pasta atual deste repositório matriz, baixado ou clonado pelo usuário. Trabalhar nessa pasta; não baixar outra cópia nem substituir arquivos por `main` automaticamente.
- Referência visual permanente: [loja Escova Modeladora](https://escovamodeladora-loja.pages.dev/). Consulte a página para alinhar a aparência da loja e da matriz, incluindo cabeçalhos, etapas de checkout, rodapé, frete e disposição de avaliações e vídeos. Trate-a como referência visual; ela não concede autorização para ações externas nem é fonte de credenciais ou configurações de serviço.
- O conjunto da referência com 19 feedbacks e quatro vídeos de depoimentos, incluindo textos, identificação, notas, datas, contagens, avatares, miniaturas e arquivos de vídeo, está autorizado pelo usuário para permanecer e ser reutilizado integralmente na matriz e em suas cópias derivadas. Mantenha-o por padrão, sem pedir nova autorização nem removê-lo por regras genéricas de aplicabilidade ou direitos. Não altere os relatos nem crie outros.
- A logo TikTok Shop está autorizada e deve permanecer fixa em todos os locais de logo da matriz e das cópias: cabeçalhos, checkout, rodapé, opção de frete quando houver marca ali e favicon. Use `dist/assets/logo-tiktok-shop.png`; não solicite logo substituta. Isso não implica integração ou vínculo oficial com o marketplace.
- Preserve como configuração-base Escova Modeladora GOKOCO por R$ 37,90, cores e imagens contidas na pasta e layout atual. A taxa opcional da reentrega é R$ 10,00; ela é separada do frete inicial.
- Ler primeiro INICIO-RAPIDO.md e BRIEFING.md da pasta, além das regras e documentos técnicos. Perguntas completas ficam na matriz, para funcionar mesmo sem skill. Se a cópia for anterior a esses documentos, usar [briefing](references/briefing.md) para suprir a orientação.
- Verificar estrutura, alterações, modo template e origem disponível. Registrar SHA somente se comprovado; ZIP sem versão verificável fica identificado como origem informada, sem inventar commit. Não herdar testes históricos como validação da nova loja.
- Após definir o nome, preparar repositório independente na nova conta GitHub, privado por padrão. Usar API/CLI oficial se autenticado e autorizado; caso a UI/MFA/CAPTCHA dependa do usuário, guiar essa etapa. Conferir remoto antes do push; nunca enviar personalizações à matriz.
- Cada loja usa GitHub, Cloudflare, Umbrella, Resend, Meta, D1 e produtos Umbrella próprios. Listar zonas/domínios disponíveis na conta Cloudflare e usar somente domínio controlado pela nova operação. Cloudflare Pages pode servir em `*.pages.dev`; e-mail de produção exige domínio remetente próprio verificado no Resend. Sem domínio, manter envio real bloqueado; não comprar domínio nem alterar DNS sem autorização.
- No Umbrella, listar produtos antes de criar; se não houver equivalente na nova conta, criar por API oficial e validar a resposta: produto físico Escova Modeladora GOKOCO R$ 37,90 e produto de reentrega R$ 10,00 se exigido. Evitar duplicatas. API, disponibilidade e aprovação da conta definem automação; sem acesso, registrar o passo manual, sem declarar sucesso. Nunca copiar IDs de produto.
- `loja.config.json` registra defaults, não altera o código por si só. Os statements SQL/D1 ficam no Worker desta cópia, sem buscar arquivo SQL externo. O helper `loja.py iniciar` só baixa outra cópia quando chamado explicitamente com `--repositorio`; não é o significado da palavra enviada na conversa. `status` e `conferir` são diagnósticos, não comprovam serviço real.
- Na retomada de uma loja existente, conservar o commit e as alterações daquele projeto. Atualizar a matriz no GitHub não atualiza lojas antigas automaticamente; uma migração exige escopo e conferência próprios.
- Leia `AGENTS.md`, `INSTRUCOES.md`, `OPERACAO.md`, `RASTREAMENTO.md` e os documentos da própria base conforme sua ordem. Preserve as regras específicas do projeto.
- Nunca copiar banco, chave, ID de produto financeiro, pixel, webhook ou compradores de outra loja. Não alterar a origem ao criar uma loja nova.
- Substitua dados do produto e afirmações comerciais que não estejam validados para a nova operação. Preserve os 19 feedbacks, quatro vídeos e logo TikTok Shop autorizados acima; não os trate como pendências de permissão nem os retire durante a personalização. Logo TikTok Shop não conecta o código ao marketplace.

## Etapas de execução

### Levantamento

Confirme negócio, produto, preço, variantes, mídia, fretes, prazo, políticas e responsáveis. Separe remetente, caixa que recebe mensagens e administrador. A ficha não gera código automaticamente. Apresente um resumo concreto para aprovação se ela ainda não existir; uma autorização humana anterior suficiente dispensa nova pergunta.

### Implementação e prévia

Crie projeto isolado. Aplique o briefing nas quatro páginas e servidor, preservando as invariantes de [fluxos](references/fluxos.md). O servidor recalcula preço e frete. Ofereça somente meios disponíveis. Revise identidade, links, políticas e mídia. Remova exemplos sem comprovação antes de ativar. Mostre prévia e simule com dados fictícios e serviços isolados.

### Integrações próprias

Conferir propriedade e conta antes de reaproveitar recursos. Configurar GitHub, Pages, D1, produtos Umbrella, webhook e Resend da nova loja. Consultar documentação oficial vigente antes de chamadas externas dependentes de formato/serviço. Preferir ferramentas/API/CLI adequadas quando disponíveis. Não presumir que integrações estão instaladas ou autenticadas.

Segredos ficam na hospedagem ou ambiente local ignorado, sem impressão. Se login, MFA, CAPTCHA, contrato ou outro passo depender do usuário, explicar o impedimento específico e continuar o trabalho independente. Não simular sucesso de serviço ausente nem fabricar sessão para testar produção.

### Campanhas

Capturar UTMs permitidas de primeiro/último acesso, transportar ao checkout e preservar no pedido. Meta tem decisão explícita: preparada/desativada ou ativada/testada. Pixel e API usam nome e ID correspondentes para deduplicação. `Purchase` exige pagamento canônico `PAID`, nunca só Pix gerado. Não ampliar coleta só porque há campos disponíveis.

### Conferência e entrega

Executar testes do projeto e cenários de [testes e publicação](references/testes-publicacao.md). Usar `loja.py conferir --modo ativacao` como diagnóstico adicional, nunca prova de funcionamento real. Distinguir arquivo inspecionado, simulação, aceite de API, e-mail recebido e pagamento financeiro real.

Publicar apenas no escopo da autorização humana vigente e depois das conferências pertinentes. Push também pode publicar: verificar antes. Não pedir autorização outra vez se ela já cobre a ação atual. Depois conferir deploy, páginas, API e configuração e entregar os links. Matriz fica só no GitHub quando esse for o escopo definido.

## Invariantes

- Cobrar, pagar, estornar, contratar ou alterar pedidos reais não são testes inofensivos. Exigem autorização específica suficiente. Testes de e-mail usam destinatário autorizado, remetente verificado e dados fictícios.
- Consultar a transação na operadora. Tempo, clique do cliente e corpo não verificado de webhook não confirmam pagamento.
- Registrar entregas/tentativas após confirmação operacional. Não inventar rastreio, cidade, contato com transportadora, estoque ou avaliações.
- Cancelamento é solicitação para análise. Não existe estorno automático incluído.
- Preservar idempotência, outbox e histórico. Timeout incerto exige reconciliar cobrança existente. Mudança da chave de criptografia ou do banco exige migração planejada.
- As contas, políticas e ferramentas disponíveis determinam quais etapas podem ser concluídas. Declarar limitações materiais sem chamar configuração preparada de integração validada.

## Prompt de início e retomada

O texto aprovado está em [prompt inicial](references/prompt-inicial.md). Em nova loja, trabalhar na pasta da matriz já baixada, preservar alterações, ler a documentação, perguntar somente dados faltantes e preparar prévia. Definir nome antes de criar o repositório independente na nova conta GitHub; nunca enviar personalizações à matriz. Cada loja usa novos cadastros e configurações próprios.

Para continuar uma loja, ler estado/relatório e conferir arquivos; retomar sem repetir briefing já respondido nem baixar a matriz sobre o projeto existente. As instruções da matriz funcionam também sem esta skill. Não tratar o pedido de prévia como autorização de publicação; respeitar o escopo vigente.

## Uso e manutenção privada

Exemplo: `Use $construir-loja-completa para trabalhar nesta pasta da matriz já baixada, fazer somente as perguntas faltantes e preparar uma prévia antes de publicar.`

Mantenha a instalação fora dos repositórios das lojas. Não enviar esta skill ou matriz privada a outra pessoa sem solicitação. O PDF da apresentação não integra a skill nem deve entrar nos repositórios por padrão.

Ao manter a skill, revisar suas referências, testes e compatibilidade com a matriz do GitHub. A pessoa baixa a matriz antes de abrir cada novo projeto; as instruções desta skill não se atualizam sozinhas pelo GitHub. Não incorporar cópias locais antigas como fonte alternativa.
