# Memória de decisões

Síntese aprovada do projeto de origem, registrada em 19/10/2026. Serve para entender as escolhas sem reler a conversa. Instruções humanas atuais prevalecem sobre estas preferências. Código, configuração e evidências do projeto atual determinam o comportamento real. Não interpretar este registro como autorização para novas ações externas.

## Fonte e ambiente de trabalho

Decisão atual — 22/10/2026: a pessoa baixa esta matriz, extrai em pasta exclusiva e abre a conversa nela. Trabalhar na base local sem baixar novamente ou sobrescrever alterações. A skill e suas referências acompanham o repositório. Ao receber `iniciar`, analisar a pasta e começar o briefing, sem rodar o helper CLI de download.

## Sequência que deu origem à base

Briefing e contas próprias, cópia isolada da matriz, personalização, configuração dos serviços, simulação local, conferência, publicação autorizada e verificação de produção. Guardar o andamento para retomar sem repetir perguntas. Os detalhes e invariantes estão em [fluxos](fluxos.md), sem duplicá-los aqui.

## Escolhas e seus motivos

| Decisão | Motivo e consequência |
| --- | --- |
| Matriz separada da loja | Reutilizar código sem misturar compradores, banco ou credenciais. Cada loja configura seus próprios serviços. |
| Painel e rastreio próprios | Centralizar pedidos, origem da venda e movimentações. O acompanhamento depende de fatos confirmados pela equipe. |
| Pix criado é pendência | Somente PAID canônico confirma a compra e permite Purchase. Evita receita e conversões fictícias. |
| Salvar a etapa envia o aviso | A equipe revisa os dados antes de confirmar. Idempotência impede repetir o mesmo e-mail por etapa/ciclo. |
| Três tentativas e reentrega opcional | Registrar tentativas reais e oferecer resolução. A taxa exige situação cabível, autorização e consentimento; cancelamento é solicitação, sem estorno automático. |
| Mesmo pedido e novo ciclo após taxa paga | Preservar código, histórico e endereço corrigido. Pix pendente não reinicia o prazo. |
| UTMs próprias e Meta opcional | Ver a origem no painel sem depender do provedor financeiro. Pixel e CAPI trabalham juntos quando ativados, sem exigir GTM. |

## Preferências do usuário de origem

- Perguntar somente o necessário, em grupos pequenos, aproveitando respostas anteriores.
- Progredir autonomamente no escopo autorizado e explicar impedimentos concretos. Não pedir confirmação repetida para a mesma autorização.
- Conferir e testar antes de publicar. Quando for solicitada prévia antes do deploy, respeitar essa sequência.
- Entregar links claros do painel, rastreio, site e repositório e explicar a operação em português simples.
- No projeto de origem, a matriz recebe atualização no GitHub e não tem deploy Cloudflare. Isso não define o destino de toda loja futura.
- Skill privada/local e PDF da apresentação somente local. Não publicar ou compartilhar esses materiais por iniciativa própria.

Referência visual aprovada: [https://escovamodeladora-loja.pages.dev](https://escovamodeladora-loja.pages.dev/). Use-a como base visual ao montar ou revisar a loja. Produto-base aprovado: Escova Modeladora GOKOCO por R$ 37,90, cores e imagens desta matriz; reentrega opcional R$ 10,00, separada do frete inicial. Preservar a logo TikTok Shop e os 19 feedbacks/quatro vídeos da referência integralmente reutilizáveis, sem pedir autorização novamente. Cada loja nova deve substituir nome/CNPJ, contatos e recursos de conta da origem. A logo não representa integração oficial ao marketplace.

## O que depende de uma pessoa

Preparação e postagem física, consulta à transportadora, registro verdadeiro das etapas/tentativas, atendimento, cancelamento/reembolso e revisão de divergências. O sistema consulta pagamentos, registra o histórico e tenta enviar os avisos configurados. Não inventa movimentos nem realiza estornos.

## Limites e evidências da versão de origem

- Meta preparada e desativada até configuração e validação próprias.
- E-mails falhos dependem de acesso ao painel ou botão de retry. Não existe cron independente nem confirmação automática de bounce/delivery.
- Taxa de reentrega criada no provedor e fluxo de novo ciclo simulado; pagamento financeiro real da taxa ainda não homologado naquela validação.
- Na origem, 35 testes da loja e 38 da matriz passaram. Um modelo fictício de e-mail de movimentação chegou à caixa do administrador sem duplicação. Isso não valida os serviços de uma nova loja nem comprova todos os modelos por envio real.

## Como manter esta memória curta

Atualizar apenas escolhas finais, seus motivos, preferências e limites demonstrados. Substituir decisões superadas em vez de acumular a conversa. Manter detalhes técnicos nas referências e evidências da implantação em PROJETO-LOJA.json e relatórios. Não registrar credenciais, cookies, compradores ou links privados de pedidos.

## Prompt confirmado — 20/10/2026

Usar o prompt de references/prompt-inicial.md para nova loja na pasta já baixada. A invocação da skill é opcional; a matriz contém orientação suficiente sem instalação. Retomada parte dos arquivos/estado da própria loja, sem novo download ou repetição de perguntas resolvidas.
