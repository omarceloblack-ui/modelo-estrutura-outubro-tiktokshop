# Leia antes de começar

## Instruções completas incluídas no repositório

A skill `construir-loja-completa` está em `.agents/skills/construir-loja-completa/`, com `SKILL.md`, referências, script de apoio, testes, assets e configuração. Ela é opcional como instalação pessoal: não baixe outra cópia. Codex pode descobri-la no projeto; a frase `iniciar` neste diretório também manda o agente abrir o `SKILL.md` local e seguir o fluxo abaixo.

Neste fluxo, `iniciar` significa trabalhar na pasta extraída que já está aberta. Não significa baixar uma segunda matriz nem rodar o comando CLI homônimo.

## Produto e operação-base autorizados

- Produto: Escova Modeladora GOKOCO; preço unitário de R$ 37,90; preserve cores, imagens, layout e mídias já contidas no projeto.
- Reentrega opcional: R$ 10,00, sujeita às regras em `OPERACAO.md`; não confundir com frete inicial.
- Preserve os 19 feedbacks, quatro vídeos e a logo TikTok Shop autorizados.
- Cada cópia troca dados da operação de origem por dados e recursos próprios. Não reutilize nome/razão social, CNPJ, contato, conta Umbrella, IDs de produtos, domínio, banco, webhook, e-mail, Pixel ou tokens da origem.
- A matriz já inclui lógica de schema SQL/D1 no Worker. Não procure nem baixe um arquivo SQL externo. Revise as instruções de `docs/01-ARQUITETURA.md` e migrations/schema embutidos antes de criar o novo banco.

## Ordem obrigatória

1. `AGENTS.md`: regras operacionais.
2. `INICIO-RAPIDO.md`, `BRIEFING.md` e `ESTADO.md`: preparação, perguntas e situação atual.
3. `docs/01-ARQUITETURA.md`: arquivos e fluxo.
4. `docs/02-CHECKLIST-CONTAS.md`: acessos e serviços.
5. `docs/03-CHECKLIST-PRODUTO.md` e `loja.config.json`: briefing.
6. `docs/04-INTEGRACOES-E-DEPLOY.md`: implementar e conectar.
7. `docs/05-TESTES-E-CONFERENCIA.md`: validar.
8. `docs/06-OPERACAO-E-ENTREGA.md`: entregar e manter.

Enquanto faltarem dados indispensáveis, faça somente levantamento e verificações locais sem efeitos externos. Agrupe perguntas objetivas; não invente condições comerciais, avaliações, vendas, selos ou estoque.

Apresente o resumo de produto, identidade, oferta, cálculos e operação. Só personalize e conecte a nova loja após a aprovação desse resumo. A aprovação vale para os ajustes reversíveis do escopo; não pedir a mesma autorização a cada arquivo. Login aberto não autoriza gasto ou ampliação de acesso.

Não copie credenciais, produto, banco ou pedidos de outra loja. Preserve o modo `template` até concluir as etapas de configuração e validação. Teste simulado não comprova pagamento real; aceite do Resend não comprova entrega na caixa de entrada.

Conclua apenas quando as quatro páginas, valores, segurança e publicação estiverem verificados ou as limitações estiverem explicitamente registradas.

## Regra anterior ao primeiro deploy

Inclua RASTREAMENTO.md na leitura obrigatória, antes de docs/04-INTEGRACOES-E-DEPLOY.md. Execute sua conferência e registre a decisão de ativação na ficha. Não confundir código preparado com Pixel/CAPI ativados ou validados na Meta.

## Entrega, reentrega e e-mails

Leia OPERACAO.md antes de configurar, publicar ou operar. Configurar produto de taxa próprio, remetente e administrador exclusivos; nunca copiar IDs ou dados da loja de referência. Testar notificações, deduplicação, falhas e tentativas. Manter modo template até validação.
