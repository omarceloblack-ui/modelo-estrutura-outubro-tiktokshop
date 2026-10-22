# Base local e personalização

Referência visual da loja: [https://escovamodeladora-loja.pages.dev](https://escovamodeladora-loja.pages.dev/). Use-a para comparar e manter o desenho da interface, em especial os cabeçalhos, checkout, frete, rodapé e disposição de feedbacks e vídeos.

A logo TikTok Shop em `dist/assets/logo-tiktok-shop.png` é fixa e autorizada. Mantenha-a nos cabeçalhos, checkout, rodapé, favicon e demais lugares em que a matriz exiba logo. Não pergunte por uma logo substituta. A marca não significa integração oficial com o marketplace.

Os 19 feedbacks e quatro vídeos de depoimentos da página visual estão autorizados para reutilização integral na matriz e em cópias derivadas. Preserve conteúdo e mídias sem pedir nova autorização; não retire esse conjunto durante a adaptação da loja.

A pessoa baixa ou clona este repositório e abre uma cópia exclusiva como projeto. A pasta local é a base de trabalho. Não baixar main nem recriar arquivos automaticamente. Conferir documentação, versão se comprovável, alterações e remoto; não inventar SHA para ZIP sem informação verificável.

Ler INICIO-RAPIDO.md, BRIEFING.md e demais documentos da base. Se ainda não existirem na cópia, usar references/briefing.md. Preservar os arquivos existentes; registrar nova operação sem reaproveitar evidências históricas como testes próprios.

Após decidir o nome, criar repositório independente na nova conta GitHub, conforme autorização. Se houver remoto da matriz, não fazer push para ele; configurar destino da nova loja preservando histórico e alterações. GitHub continua referência da base, mas não é necessário acessá-lo para iniciar a personalização de uma cópia completa já fornecida.

Helper iniciar somente quando houver pedido explícito de baixar outra cópia em pasta nova vazia; nunca sobre a pasta aberta. status/conferir são opcionais. Não exigem recriar a base nem comprovam integrações reais.

| Componente | Alterações relevantes |
| --- | --- |
| Vendas | `dist/index.html`, seletor, galeria, suporte e CSS. Rever produto, fotos adicionais, estoque, promoção e variantes; manter os 19 feedbacks, quatro vídeos e a logo TikTok Shop autorizados. |
| Checkout | `pagamento.html`, checkout, validação, etapas, CEP, preço e previsão. Rever todos os estados e rodapés. |
| Preço | `pricing.js`, seletor e `UNIT`/cálculos no Worker. Servidor é referência financeira. |
| Produto | `PRODUCT`, títulos, variantes, itens e `externalRef`. ID financeiro da nova conta. |
| Servidor | `_worker.js`, `_routes.json`, `wrangler.jsonc`. APIs, D1, Pix, webhook, autenticação e comunicação. |
| Rastreio | HTML, `rastreio.js`, `redelivery.js`, mapa e dados de cidades. Preservar código privado e histórico. |
| Painel | HTML, `admin.js`, mapa/CSS. Preservar sessão, filtros, tentativas e outbox. |
| E-mails | Construtores no Worker, marca, preços, resumo e `SITE` com domínio final. |
| Campanhas | Atribuição, Meta, checkout e Worker. Preservar IDs, campos permitidos e deduplicação. |

Manter rotas/IDs consistentes ou atualizar todas as referências e testes juntos. Não apagar mudanças locais existentes. Nova loja tem pasta, repositório, banco e recursos próprios.

Atualizar fotos e descrições do produto conforme o briefing. Manter os 19 feedbacks e quatro vídeos autorizados e a logo TikTok Shop em todas as posições. Não criar outros depoimentos nem indicadores sem confirmação. Logo TikTok Shop não cria integração oficial. Cartões só entram como disponíveis se realmente habilitados. A base usa Pix.

Confirmar frete, origem e prazo. A taxa incluída usa R$ 10,00 e até 15 dias por novo ciclo: se o usuário pedir outros termos, alinhar servidor, produto financeiro, interface e testes. Não reaproveitar preços de teste da loja original.

Revisar metadados, favicon, termos, identificação comercial, contatos, horário, rodapé e links nas quatro páginas. A ficha não é um compilador de configuração.

Usar ferramentas e runtimes disponíveis. Prévia estática não comprova integrações. Simulação deve usar provedor falso, banco isolado, destinatários fictícios e chamadas externas bloqueadas. Preservar `STORE_MODE=template` até ativação aprovada. Não versionar `.env`, `.dev.vars`, bancos, exports, node_modules ou chaves.
