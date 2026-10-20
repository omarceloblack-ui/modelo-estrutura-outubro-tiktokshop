# Matriz de lojas — outubro

Base independente para criar uma nova loja em um repositório privado. Nenhuma conta, credencial, banco ou pedido da loja anterior está conectado.

Comece por [INICIO-RAPIDO.md](INICIO-RAPIDO.md), responda ao [BRIEFING.md](BRIEFING.md) e use [PROMPT-INICIAL.md](PROMPT-INICIAL.md). As regras e a ordem técnica estão em [INSTRUCOES.md](INSTRUCOES.md). O exemplo de escova, preço, cores, oferta e mídia é demonstrativo. Deve ser substituído e aprovado para cada produto.

| Página | Arquivo | Endereço |
|---|---|---|
| Vendas | `dist/index.html` | `/` |
| Pagamento | `dist/pagamento.html` | `/pagamento` |
| Rastreio | `dist/rastreio.html` | `/rastreio` |
| Painel administrativo | `dist/admin.html` | `/admin` |

Scripts, estilos e imagens ficam nas pastas compartilhadas de `dist`. O servidor protegido está em `dist/_worker.js`. Não criar quatro repositórios.

## Criar outra loja

Baixe a matriz atual e extraia em uma pasta exclusiva. Abra a conversa nessa pasta. Defina o nome no briefing e crie depois um repositório independente na conta GitHub da nova loja. Não envie personalizações à matriz. Cada loja usa novos cadastros de GitHub, Cloudflare, Umbrella, Resend e Meta, com domínio, banco e segredos próprios. Confira o checklist de contas antes de conectar serviços.

## Executar

Requer Node.js 24; não exige instalação de dependências.

- `npm start`: prévia em `http://127.0.0.1:4175`, porta separada da loja original; pode ser alterada por `PORT`.
- `npm test`: testes simulados sem cobrança ou e-mail real.
- `npm run check`: confere scripts e recursos locais.
- `npm run preflight`: lista dados faltantes e retorna erro enquanto o briefing estiver incompleto. Isso é esperado nesta matriz.
- Rastreio de demonstração: `/rastreio?codigo=TESTE-GOKOCO`; clicar em Acompanhar pedido.

`STORE_MODE=template` bloqueia operações reais. O painel visual está incluído, mas o login por e-mail depende da configuração da nova loja. A ficha `loja.config.json` documenta o briefing: ela não aplica alterações automaticamente no código. O agente deve alinhar os arquivos conforme o guia de arquitetura.

## Publicar

Cloudflare Pages: branch `main`, saída `dist`, sem comando de build. Nenhum projeto público é criado automaticamente pela matriz. Siga o guia de integrações depois do briefing e configure D1 e segredos próprios. A documentação distingue estrutura pronta, conexão e validação em produção.

## Entregas e notificações atualizadas

Consulte OPERACAO.md para o fluxo completo: cinco etapas confirmadas, e-mail automático, três tentativas, solicitação de cancelamento, taxa opcional e novo ciclo somente após PAID. Outbox criptografada, idempotência, estados de falha e teste administrativo incorporados. Configuração real e homologação financeira continuam obrigatórias na nova loja.

## Prompt e retomada

O [prompt inicial](PROMPT-INICIAL.md) contém o texto aprovado para iniciar cada nova loja e uma opção curta para retomar uma loja existente. Funciona sem skill instalada; a invocação da skill privada é opcional. A skill não faz parte deste repositório.
