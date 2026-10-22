# Prompt inicial para cada nova loja

Baixe ou clone este repositório matriz, extraia em pasta exclusiva e abra no Codex. A skill está incluída neste repositório; não precisa baixar outra coisa. Na conversa dessa pasta, escreva `iniciar`.

## Texto para copiar

> `iniciar`: esta pasta aberta é a cópia local da matriz para criar uma nova loja. Trabalhe nela, preserve alterações e leia `.agents/skills/construir-loja-completa/SKILL.md`; não baixe outra matriz nem execute o helper CLI.
>
> Faça inventário dos arquivos e leia instruções, estado, configuração, páginas, servidor, testes, dependências e mídia antes de agir. Não execute scripts desconhecidos. Pergunte somente dados realmente ausentes.
>
> Preserve Escova Modeladora GOKOCO por R$ 37,90, cores, fotos, layout, logo TikTok Shop e feedbacks/vídeos autorizados. Reentrega opcional custa R$ 10,00 e não muda o frete inicial. Remova da cópia todo nome/CNPJ, telefone, e-mail, domínio, URL, conta, ID ou credencial da operação de origem.
>
> Cada loja terá GitHub, Cloudflare, Umbrella, Resend, Meta, domínio, D1, produtos e IDs próprios. Examine esta pasta; não busque SQL ou skill externos. O schema D1 está embutido no Worker. Pages pode publicar em `*.pages.dev`; procure zona/domínio autorizado já existente na conta Cloudflare para validar remetente no Resend. Sem domínio próprio, não ative envio real e não compre um domínio.
>
> Após definir o novo nome, crie um repositório GitHub privado na conta da operação. Na Umbrella, liste produtos e crie, se faltarem, o principal por R$ 37,90 e o de reentrega por R$ 10,00 via API documentada; evite duplicatas e valide os IDs retornados. Se faltar acesso/API/MFA, explique a etapa manual. Crie novo Pixel na conta Meta própria, mantenha eventos desativados até configurar e validar. Nunca envie personalizações para a matriz.
>
> Recrie recursos internos (e-mail, D1, dashboard e rastreio), faça prévia, teste e documente; publique somente no repo novo e no escopo autorizado.

## Skill incluída

A skill completa e suas referências estão em `.agents/skills/construir-loja-completa/` e são descobertas pelo Codex como skill do projeto. `AGENTS.md` encaminha para ela quando a conversa começa com `iniciar`.

## Continuação de loja existente

Para retomar uma loja já iniciada, use a pasta da própria loja, sem baixar a matriz por cima dela:

> Leia as instruções, ESTADO.md, RELATORIO-VALIDACAO.md e os demais registros deste projeto. Confira os arquivos e retome de onde parou, preservando alterações e aproveitando as respostas e autorizações já dadas. Pergunte somente o que faltar.

## Leitura e limites

Seguir AGENTS.md e INSTRUCOES.md, incluindo INICIO-RAPIDO.md, BRIEFING.md, OPERACAO.md e RASTREAMENTO.md conforme a ordem indicada. Não baixar outra cópia automaticamente nem confundir validações históricas com testes da nova loja.

Antes de qualquer push, conferir remoto e possibilidade de deploy automático. Segredos ficam na hospedagem ou ambiente local ignorado. Login aberto não autoriza pagamentos, estornos, contratação ou alteração de pedidos reais para testes. Manter recursos próprios e registrar evidências e pendências.
