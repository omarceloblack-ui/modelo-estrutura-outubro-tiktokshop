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
