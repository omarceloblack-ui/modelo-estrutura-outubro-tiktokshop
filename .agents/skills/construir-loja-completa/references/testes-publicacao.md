# Conferência e publicação

Separar inspeção de arquivo, simulação, serviço configurado, aceite de API, e-mail recebido e pagamento financeiro real. A skill não herda os testes reais da loja de referência para uma nova operação.

## Antes de ativar

- Rodar `npm test`, `npm run check` e, com ficha preenchida, `npm run preflight`. Campos faltantes na matriz vazia são esperados. Não remover bloqueios para ocultar pendências.
- Testar preço/variantes de uma, duas e três unidades e frete no navegador e servidor. Total do cliente não determina cobrança.
- Validar dados, CEP com falha/manual, QR/copia e cola, validade e recuperação de sessão.
- Clique repetido, timeout, resultado incerto e webhook repetido não duplicam cobrança ou confirmação. Webhook falso e navegador não confirmam pago.
- Admin: código de uso único, sessão, logout, APIs protegidas e pedido pendente bloqueado para entrega.
- Etapas reais, histórico, agenda, cidades do mapa e datas por ciclo. Sem avanço pelo tempo.
- Tentativas, motivos, taxa autorizada, cancelamento sem estorno, reentrega pendente/paga, endereço corrigido e pagamento tardio em revisão.
- E-mails de etapas/tentativas, duplicidade, falha, retry com mesma referência, criptografia, remoção após aceite, limites e expiração. Envio real apenas ao destinatário autorizado.
- UTMs primeiro/último acesso preservadas em pendente/pago. Rastreio sem dados privados. Meta desativada ou ativada com evidência explícita.
- Marca, mídia, provas, estoque, urgência, meios disponíveis, selos, contatos, políticas, prazo e domínio corretos. Remover exemplos sem validação.
- Sem segredos públicos/versionados. Modo template não chama serviços reais. Banco, produtos e chaves exclusivos.

`loja.py conferir` é diagnóstico estático adicional, não prova de funcionamento nem autorização. Não consulta contas nem segredos hospedados. Seu resultado não substitui testes do código e serviços.

## Simulação

Usar banco temporário, provedor/e-mail falsos, dados fictícios e chamadas externas bloqueadas. As fixtures da base ajudam. Nunca rodar a demonstração contra D1 de produção ou marcar cliente real como pago/entregue para testar.

## Antes do push/deploy

Conferir remoto, branch, conta, ambiente e staged. Push pode iniciar publicação. Respeitar escopo: prévia apenas continua prévia; autorização vigente para publicar após testes permite avançar após conferência sem nova pergunta. Matriz fica fora de produção quando assim definido.

Pagamento real, estorno, contratação, ampliação de acesso e exclusão precisam da autorização específica aplicável. Não contornar login/MFA com sessão falsa ou segredo vazado. Explicar bloqueio concreto e continuar o trabalho independente.

## Depois do deploy

Conferir versão, conclusão, quatro páginas, recursos, configuração Meta e proteção das APIs. Usar acesso administrativo normal para teste fictício de mensagem, com destinatário permitido. Registrar limitações: homologação financeira real, serviço de e-mail, transportadora e Meta.

Entregar links de loja/checkout/rastreio/painel/repositório e documentação operacional atualizada. Não entregar código de comprador como exemplo. Explicar atualização da rota, e-mail pendente, cancelamento e reentrega.

## Manter a skill

Rodar o validador Skill Creator após editar o entrypoint. Rodar `scripts/test_loja.py` quando alterar o helper. Ao conferir compatibilidade com a matriz GitHub, inicializar projeto fictício isolado, registrar o commit obtido e rodar testes, verificador e bloqueio template. Nenhum teste da skill faz deploy, usa compradores ou paga transação.
