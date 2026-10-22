# Prompt inicial para cada nova loja

Baixe ou clone esta matriz, extraia em uma pasta exclusiva e abra-a como projeto no Codex. A skill completa e as instruções já estão incluídas no repositório. Na conversa da pasta, envie `iniciar` para acionar o texto abaixo.

## Texto para copiar

> `iniciar`: esta é a cópia local da matriz para uma nova loja independente. Trabalhe nesta pasta e preserve as alterações existentes. Leia `.agents/skills/construir-loja-completa/SKILL.md` e as instruções locais; não baixe outra matriz nem rode o helper CLI `iniciar`.
>
> Faça inventário da pasta inteira, leia regras, estado e relatório, confira Git/remoto e alterações, e revise arquivos fonte, configuração, testes, mídias e dependências antes de executar scripts. Pergunte somente os dados que faltarem.
>
> Preserve produto Escova Modeladora GOKOCO, R$ 37,90, cores, fotos, layout, avaliações e vídeos já aprovados; a reentrega opcional custa R$ 10,00. Mantenha o frete inicial e não confunda as duas taxas. Apague/substitua todos os dados da operação de origem: nome empresarial/pessoal, CNPJ, contatos, domínio, IDs, produtos Umbrella, banco, webhook, Pixel e credenciais.
>
> Confira contas e permissões. Crie produto(s) na Umbrella da nova loja por API oficial se a conta e API permitirem; primeiro liste e compare para evitar duplicatas. Produto principal R$ 37,90; produto de reentrega R$ 10,00 se a conta exigir esse cadastro. Confira a resposta e guarde somente os IDs não secretos na configuração. Configure novas contas Cloudflare, GitHub, Resend e Meta. Liste zonas existentes da conta Cloudflare; use uma zona que a pessoa controla. Pages pode usar `*.pages.dev`, mas o e-mail de produção exige domínio remetente próprio verificado no Resend. Se faltar domínio/conta/API, registre pendência e continue as partes locais; não compre domínio, não invente dados e não declare integração concluída.
>
> Recrie D1 usando o schema SQL incluído no Worker e documentado nesta matriz, sem baixar SQL externo. Mantenha Meta desativada até receber credenciais e validar Pixel/API próprios. Prepare prévia, teste, documente e publique apenas para o repositório novo autorizado; nunca envie alterações para a matriz.

## Início mínimo

Como `AGENTS.md` encaminha ao fluxo completo e a skill já viaja com esta pasta, `iniciar` é suficiente. O texto acima pode ser usado se o agente não reconhecer a palavra curta.

## Continuação de loja existente

Para retomar uma loja já iniciada, use a pasta da própria loja, sem baixar a matriz por cima dela:

> Leia as instruções, ESTADO.md, RELATORIO-VALIDACAO.md e os demais registros deste projeto. Confira os arquivos e retome de onde parou, preservando alterações e aproveitando as respostas e autorizações já dadas. Pergunte somente o que faltar.

## Leitura e limites

Seguir AGENTS.md e INSTRUCOES.md, incluindo INICIO-RAPIDO.md, BRIEFING.md, OPERACAO.md e RASTREAMENTO.md conforme a ordem indicada. Não baixar outra cópia automaticamente nem confundir validações históricas com testes da nova loja.

Antes de qualquer push, conferir remoto e possibilidade de deploy automático. Segredos ficam na hospedagem ou ambiente local ignorado. Login aberto não autoriza pagamentos, estornos, contratação ou alteração de pedidos reais para testes. Manter recursos próprios e registrar evidências e pendências.
