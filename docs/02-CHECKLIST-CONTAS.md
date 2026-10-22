# 02 — Contas próprias e acessos

Para cada loja, usar novos cadastros independentes. Sessões conectadas no navegador ajudam; verificar também autenticação e conta efetiva das ferramentas API/CLI.

| Serviço | Preparação |
| --- | --- |
| GitHub — https://github.com/ | Conta própria; novo repositório privado ou visibilidade aprovada. Acesso à matriz privada para baixar/conferir a base. |
| Cloudflare — https://dash.cloudflare.com/ | Conta própria; novos Pages, D1 e segredos. Listar zonas e confirmar qual domínio a nova operação controla. |
| Umbrella — https://umbrellapag.com/ | Conta comercial própria aprovada para Pix; listar produtos antes de criar. Produto-base R$ 37,90 e produto de reentrega R$ 10,00, com IDs próprios. |
| Resend — https://resend.com/ | Conta própria; domínio remetente autenticado e chave de envio apropriada. |
| Meta — https://business.facebook.com/ | Conta/negócio com acesso ao Gerenciador de Eventos; Pixel/dataset e token próprios. Manter integração desativada até decisão e validação. |
| Registro/DNS | Pages oferece `*.pages.dev` para o site. E-mail de produção exige domínio remetente próprio, DNS editável e verificação no Resend. Procurar zonas autorizadas na nova conta Cloudflare; se não houver, parar o envio real e registrar a pendência. |
| Caixa administrativa | E-mail ativo para códigos de acesso e testes autorizados. Domínio no Resend não cria caixa postal. |

- [ ] Confirmar conta, propriedade e permissões antes de criar/conectar cada recurso.
- [ ] Confirmar nome da loja antes de nomear os recursos definitivos.
- [ ] Segredos só na hospedagem ou arquivo local ignorado, sem chat, ficha, logs ou Git.
- [ ] Gerar segredo exclusivo de webhook; não copiar chave, pixel ou banco de outra loja.
- [ ] Pessoa responsável disponível para MFA/CAPTCHA, verificação comercial e termos.
- [ ] Conferir limites/custos vigentes nos provedores antes de contratar. Login não autoriza despesas.
- [ ] Definir admin, remetente, suporte, destinatário de testes e decisão Meta.
- [ ] Usar domínio já controlado pela nova operação; não comprar domínio nem trocar nameservers sem autorização expressa.
- [ ] Confirmar o estado de verificação do domínio remetente no Resend antes de configurar envio real.

Começar pela pasta já baixada conforme [INICIO-RAPIDO.md](../INICIO-RAPIDO.md). Perguntas completas em [BRIEFING.md](../BRIEFING.md).
