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
