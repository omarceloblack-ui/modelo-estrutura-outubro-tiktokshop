# Relatório de validação da matriz

## Verificado localmente

- Quatro arquivos HTML presentes, scripts e recursos locais conferidos.
- Testes de servidor e mapa com dados fictícios e serviços simulados.
- Teste específico comprova que a matriz bloqueia operações reais mesmo com uma chave recebida por engano.
- Banco, produto, remetente, administrador e endereço da loja anterior removidos das configurações da cópia.

## Ainda não conectado — esperado

- Produto, conta comercial, chave Umbrella e webhook da nova loja.
- Cloudflare Pages e D1 da nova loja.
- Domínio remetente, chave Resend e administrador reais.
- Personalização de outro produto e aprovação do briefing.
- Cobrança/pagamento e entrega real de e-mail da nova loja.

`preflight` deve reprovar enquanto esses dados faltarem. Não confundir essa condição prevista com falha do template. Testes simulados não comprovam produção.

Ao usar em uma nova loja, substituir este relatório por evidências, correções, pendências e links do projeto correspondente, sem segredos nem dados pessoais.

## Remoção da promoção

Banner, mensagens promocionais e desconto por quantidade removidos do seletor, checkout e servidor. Preço base e isolamento da matriz preservados.

## Atualização visual — 18/10/2026

- Componentes de vendas, seletor, pagamento, frete e rodapé sincronizados com a versão atual da loja de referência.
- Dados específicos da loja substituídos por exemplos; configurações de produção, banco, chaves, domínio e produto não copiados.
- Preço base de exemplo R$ 37,90, sem desconto por quantidade; servidor e navegador coerentes.
- Endpoint de cidade usa apenas metadados Cloudflare, sem GPS, serviço externo ou cache compartilhado; fallback sem cidade.
- Modo template continua bloqueando Pix e administração reais; rastreio de demonstração preservado.
- Testes de servidor/mapa e verificação de recursos executados localmente. Prévia visual conferida; nenhum pagamento ou e-mail real realizado.
- Publicação solicitada somente no GitHub. Integrações e ativação de outra loja continuam pendentes do briefing.

## Rastreamento — 19/10/2026

27 testes locais aprovados; recursos e sintaxe conferidos. Testes cobrem preservação de UTMs após PAID sem metadata, normalização/hash, ausência de CPF/endereço completo na Meta, Purchase apenas após PAID e deduplicação. Configuração de produção não copiada; STORE_MODE=template bloqueia operações reais e META_ENABLED=false. Recebimento/deduplicação na Meta, credenciais, privacidade e entrega real do novo e-mail continuam pendentes da ativação da nova loja. Nenhum deploy Cloudflare da matriz foi executado.

# Validação — 19/10/2026

## Evidência local

- Etapas manuais e 1ª/2ª/3ª tentativa exigem autenticação, pagamento e estados compatíveis.
- Pix de taxa fixo no servidor, deduplicação, timeout incerto, pagamento canônico, ciclo 2, endereço corrigido, preservação de histórico e pagamento tardio em revisão cobertos por testes.
- E-mails de etapas e tentativas, link individual, falha/timeout, retry com mesma chave, conteúdo criptografado, limpeza após aceite e limite de tentativas cobertos com serviço simulado.
- Teste administrativo limitado ao ADMIN_EMAIL, sem alteração de pedido e sem cobrança.
- Scripts e recursos locais conferidos pelo verificador.

## Limites

Não houve pagamento financeiro real da taxa, estorno ou alterações de entrega em pedidos de clientes. Resend simulado comprova código, não caixa de entrada. Registro do envio real e deploy será acrescentado após execução. Reenvios não usam cron autônomo; exigem acesso ao painel ou botão de retry. Meta desativada.

Resultado: 38 testes locais aprovados; testes de isolamento da matriz incluídos. Nenhum serviço real configurado ou publicado na matriz.

## Referência externa de integração

A implementação correspondente na loja de referência foi publicada e teve um e-mail fictício de movimentação recebido na caixa do administrador, sem duplicidade ao repetir a solicitação. Isso não valida remetente, banco ou cobrança de futuras lojas desta matriz. A matriz permanece sem serviços de produção, com 38 testes locais aprovados e verificador aprovado. GitHub Actions do commit 7858b61 concluído com sucesso: https://github.com/omarceloblack-ui/modelo-estrutura-outubro-tiktokshop/actions/runs/39326519554 .

## Avaliações da matriz — 20/10/2026

Mantidos somente os relatos existentes de Camila S. (trecho de embalagem, omissão indicada por [...]) e Renata G. (entrega). Nenhum elogio novo criado. Removidos relatos de desempenho, vídeos de uso, fotos de produto na seção, notas agregadas e metadados comerciais herdados. Instruções exigem confirmação de origem/autorização/aplicabilidade na nova operação. Conferência textual e estrutural local concluída; 38 testes simulados aprovados e node verificar.cjs aprovado (22 scripts). Nenhum serviço real acionado e nenhum deploy Cloudflare.

## Instruções de início — 20/10/2026

INICIO-RAPIDO.md e BRIEFING.md adicionados; README, prompt, ordem de leitura e checklists alinhados ao download manual em pasta exclusiva e contas novas por loja. Nome definido antes de criar novo repositório; proibido enviar personalizações à matriz. Perguntas cobrem produto/identidade, acessos, oferta, operação, e-mails, Meta e publicação. 38 testes simulados e npm run check aprovados; documentos conferidos localmente. Skill privada alinhada e validada, com sete testes do helper aprovados; não incluída no repositório. Sem novos serviços, pagamentos, e-mails reais ou deploy Cloudflare.

## Prompt final e retomada — 20/10/2026

Texto final aprovado incorporado ao PROMPT-INICIAL.md, com invocação opcional da skill e orientação de retomada. README e início rápido alinhados. Alteração somente documental; 38 testes simulados e npm run check aprovados (22 scripts). Sem cobrança, envio real de e-mail ou deploy Cloudflare.


## Feedbacks e vídeos sincronizados — 22/10/2026

Conferidos os blocos no projeto local Escova Modeladora e na página publicada; os dois blocos são idênticos. A matriz agora contém os 19 feedbacks e quatro vídeos de depoimento com os mesmos textos, ordem, nomes, nota, contagem, datas, selos, fotos, avatares e miniaturas. Os 41 arquivos de mídia referenciados já estavam na matriz e seus SHA-256 correspondem aos arquivos locais da loja. Regras da matriz e checklist atualizados para autorizar a reutilização integral, sem confirmação adicional. Validação limitada a comparação textual, estrutura e hashes; não houve testes de aplicação nem publicação Cloudflare.
