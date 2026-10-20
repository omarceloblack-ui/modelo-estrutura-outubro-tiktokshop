# 02 — Contas próprias e acessos

Para cada loja, usar novos cadastros independentes. Sessões conectadas no navegador ajudam; verificar também autenticação e conta efetiva das ferramentas API/CLI.

| Serviço | Preparação |
| --- | --- |
| GitHub — https://github.com/ | Conta própria; novo repositório privado ou visibilidade aprovada. Acesso à matriz privada para baixar/conferir a base. |
| Cloudflare — https://dash.cloudflare.com/ | Conta própria; novos Pages, D1, domínio e segredos. |
| Umbrella — https://umbrellapag.com/ | Conta comercial própria aprovada para Pix; produto principal, produto da taxa quando aplicável, chave e webhook exclusivos. |
| Resend — https://resend.com/ | Conta própria; domínio remetente autenticado e chave de envio apropriada. |
| Meta — https://business.facebook.com/ | Conta/negócio com acesso ao Gerenciador de Eventos; Pixel/dataset e token próprios. Manter integração desativada até decisão e validação. |
| Registro/DNS | Domínio comprado, acesso à configuração DNS para loja e remetente. |
| Caixa administrativa | E-mail ativo para códigos de acesso e testes autorizados. Domínio no Resend não cria caixa postal. |

- [ ] Confirmar conta, propriedade e permissões antes de criar/conectar cada recurso.
- [ ] Confirmar nome da loja antes de nomear os recursos definitivos.
- [ ] Segredos só na hospedagem ou arquivo local ignorado, sem chat, ficha, logs ou Git.
- [ ] Gerar segredo exclusivo de webhook; não copiar chave, pixel ou banco de outra loja.
- [ ] Pessoa responsável disponível para MFA/CAPTCHA, verificação comercial e termos.
- [ ] Conferir limites/custos vigentes nos provedores antes de contratar. Login não autoriza despesas.
- [ ] Definir admin, remetente, suporte, destinatário de testes e decisão Meta.

Começar pela pasta já baixada conforme [INICIO-RAPIDO.md](../INICIO-RAPIDO.md). Perguntas completas em [BRIEFING.md](../BRIEFING.md).
