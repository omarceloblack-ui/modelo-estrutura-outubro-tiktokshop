# Matriz de lojas — outubro

Base independente para criar uma nova loja em um repositório privado. Nenhuma conta, credencial, banco ou pedido da loja anterior está conectado.

Comece por [INICIO-RAPIDO.md](INICIO-RAPIDO.md), responda ao [BRIEFING.md](BRIEFING.md) e use [PROMPT-INICIAL.md](PROMPT-INICIAL.md). As regras e a ordem técnica estão em [INSTRUCOES.md](INSTRUCOES.md). A skill inteira e referências estão incluídas em `.agents/skills/construir-loja-completa/`; baixe somente este repositório. Abra a pasta no Codex e escreva `iniciar`.

Produto-base fixo: Escova Modeladora GOKOCO por R$ 37,90, cores, layout e imagens atuais. Taxa opcional de reentrega: R$ 10,00, separada do frete inicial. Manter TikTok Shop e os 19 feedbacks/quatro vídeos da referência. Nome empresarial, CNPJ, contatos e todas as contas/IDs da nova operação são próprios e não podem vir da origem.

| Página | Arquivo | Endereço |
|---|---|---|
| Vendas | `dist/index.html` | `/` |
| Pagamento | `dist/pagamento.html` | `/pagamento` |
| Rastreio | `dist/rastreio.html` | `/rastreio` |
| Painel administrativo | `dist/admin.html` | `/admin` |

Scripts, estilos e imagens ficam nas pastas compartilhadas de `dist`. O servidor protegido está em `dist/_worker.js`. Não criar quatro repositórios.

## Criar outra loja

Baixe/clone esta matriz e extraia em pasta exclusiva. Abra a conversa nessa pasta e escreva `iniciar`. O agente lê a skill local e analisa esta cópia sem baixar outra. Defina o nome no briefing e depois crie um repositório privado independente na conta GitHub da nova loja. Nunca envie personalizações à matriz. Cada loja usa GitHub, Cloudflare, Umbrella, Resend, Meta, domínio autorizado, banco e segredos próprios. Confira o checklist antes de conectar serviços.

Pages oferece `*.pages.dev` para o site. E-mail de produção precisa de domínio próprio verificado no Resend: a instrução é listar domínios/zones que a operação controla na conta Cloudflare. Se nenhum estiver disponível, não fazer envio real e não comprar domínio sem autorização.

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

O [prompt inicial](PROMPT-INICIAL.md) contém o texto para iniciar ou retomar. A skill completa está incluída em `.agents/skills/construir-loja-completa/` e viaja com esta matriz.
# Logo permanente

A matriz mantém a logo TikTok Shop em `dist/assets/logo-tiktok-shop.png` nos cabeçalhos, checkout, opção de frete grátis, rodapé e favicon. Essa logo é fixa; configure nome, cores e demais dados da loja sem substituir a marca TikTok Shop.
