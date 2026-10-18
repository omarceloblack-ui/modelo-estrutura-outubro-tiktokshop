(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const value = id => ($ (id)?.value || '').trim();
  const fmt = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const read = (store, key, fallback) => { try { return JSON.parse(store.getItem(key) || 'null') || fallback; } catch { return fallback; } };
  const save = (key, data) => { try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {} };
  const allowed = ['preta', 'branca', 'rosa'];
  const savedCart = read(sessionStorage, 'checkoutCart', null);
  let colors = (savedCart?.colors || read(localStorage, 'coresSelecionadas', [])).map(c => ({ color: String(c.color || c.label || '').toLowerCase(), quantity: Number(c.quantity) })).filter(c => allowed.includes(c.color) && Number.isInteger(c.quantity) && c.quantity > 0 && c.quantity <= 10);
  if (!colors.length) colors = [{ color: 'preta', quantity: 1 }];
  let shipping = ['free','sedex'].includes(savedCart?.shipping) ? savedCart.shipping : 'free', busy = false, payment = null, pollTimer, clockTimer;
  const tariffs = { free: 0, jadlog: 1847, sedex: 3340 };
  const names = { free: 'Frete Grátis', jadlog: 'JADLOG', sedex: 'Sedex - Correios Rápido' };
  const qty = () => colors.reduce((sum, c) => sum + c.quantity, 0);
  const subtotal = () => window.MB_PRICING(qty()).subtotal;
  const total = () => subtotal() + tariffs[shipping];
  const signature = () => JSON.stringify({ colors, shipping });

  document.querySelectorAll('[id^="lv-step-"] main').forEach(main=>{
    const sections=Array.from(main.children).filter(el=>el.tagName==='SECTION');
    if(sections.length>1)main.insertBefore(sections[1],sections[0]);
  });
  const shippingTitle=Array.from(document.querySelectorAll('#lv-step-2 h4')).find(el=>el.textContent.includes('forma de entrega'));
  if(shippingTitle){
    const oldPanel=shippingTitle.parentElement.parentElement;
    const panel=document.createElement('div');
    panel.style.cssText='margin-top:16px;padding-top:16px;border-top:1px solid #eee';
    panel.innerHTML='<h4 style="font-size:13px;font-weight:700;margin-bottom:10px">Escolha uma forma de entrega:</h4>'+[
      ['free','🚚','Frete grátis','Chega em 10 dias','Grátis'],
      ['sedex','📦','Sedex - Correios Rápido','Chega amanhã','R$ 33,40']
    ].map(([id,icon,name,eta,price])=>'<button type="button" data-shipping="'+id+'" aria-pressed="false" class="mb-shipping"><span class="mb-shipping-dot"></span><span aria-hidden="true" style="font-size:22px">'+icon+'</span><span style="flex:1"><strong>'+name+'</strong><small style="display:block;margin-top:4px">'+eta+'</small></span><strong>'+price+'</strong></button>').join('');
    const cart=document.querySelector('#lv-step-2 main > section:nth-child(2)');
    cart.insertBefore(panel,cart.querySelector('hr'));oldPanel.remove();
    const firstCart=document.querySelector('#lv-step-1 main > section:nth-child(2)');
    if(firstCart){
      const freePreview=panel.querySelector('[data-shipping="free"]').cloneNode(true);

      freePreview.classList.add('mb-free-preview');
      freePreview.setAttribute('aria-pressed','true');
      freePreview.setAttribute('aria-label','Frete grátis, chega em 10 dias');
      freePreview.style.marginTop='16px';
      firstCart.insertBefore(freePreview,firstCart.querySelector('hr'));
    }
  }

  function draw() {
    document.querySelectorAll('[data-shipping]').forEach(b=>{const selected=b.dataset.shipping===shipping;b.setAttribute('aria-pressed',String(selected));});
    const label = colors.map(c => c.color.charAt(0).toUpperCase() + c.color.slice(1) + ' x' + c.quantity).join(' + ');
    document.querySelectorAll('.border-neutral-200 > span').forEach(e => { if (/^\d+$/.test(e.textContent.trim())) e.textContent = String(qty()); });
    document.querySelectorAll('span.bg-neutral-900').forEach(e => { if (/^\d+$/.test(e.textContent.trim())) e.textContent = String(qty()); });
    document.querySelectorAll('img[alt="Produto"]').forEach(e => { e.src = '/assets/escova-' + colors[0].color + '.webp'; });
    document.querySelectorAll('p,span,h3').forEach(e => { if (!e.children.length && /^Escova Modeladora GOKOCO/.test(e.textContent.trim())) e.textContent = 'Escova Modeladora GOKOCO — ' + label + ' · Bivolt'; });
    document.querySelectorAll('.flex.justify-between').forEach(row => {
      const spans = row.querySelectorAll('span'); if (spans.length < 2) return;
      const first = spans[0], last = spans[spans.length - 1], title = first.textContent.trim();
      if (title === 'Subtotal') last.textContent = fmt(subtotal());
      if (title === 'Total') last.textContent = fmt(total());
      if (title.startsWith('Frete')) { first.textContent = 'Frete (' + names[shipping] + ')'; last.textContent = tariffs[shipping] ? fmt(tariffs[shipping]) : 'Grátis'; }
    });
    for (const id of ['lv-pix-subtotal','lv-pix-subtotal-line']) if ($(id)) $(id).textContent = fmt(subtotal());
    for (const id of ['lv-pix-total','lv-pix-total-big','lv-pix-total-inline']) if ($(id)) $(id).textContent = fmt(total());
    if ($('lv-pix-frete')) $('lv-pix-frete').textContent = tariffs[shipping] ? fmt(tariffs[shipping]) : 'Grátis';
    if ($('lv-pix-frete-name')) $('lv-pix-frete-name').textContent = names[shipping];
    if (document.getElementById('lv-eta-frete')) document.getElementById('lv-eta-frete').textContent=names[shipping];
    const days = { free: 10, jadlog: 5, sedex: 1 };
    const arrival = new Date(Date.now() + days[shipping] * 86400000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    document.querySelectorAll('[data-eta]').forEach(e => { e.textContent = arrival; });
    save('checkoutCart', { colors, shipping });
  }
  function changeQty(delta) {
    if (payment) { alert('Já existe um Pix para este pedido. Volte à página do produto para iniciar outra compra.'); return; }
    if (delta > 0 && qty() < 30) { const c = colors.find(c => c.quantity < 10); if (c) c.quantity++; }
    if (delta < 0 && qty() > 1) { colors[colors.length - 1].quantity--; colors = colors.filter(c => c.quantity > 0); }
    draw();
  }
  function showStatus(message, color) {
    let node = $('payment-status');
    if (!node) { node = document.createElement('p'); node.id = 'payment-status'; node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite'); node.style.cssText = 'font-size:13px;line-height:1.6;padding:12px;text-align:center;margin-top:10px;border-radius:8px;background:#f4f4f5'; $('lv-pix-generate').parentElement.appendChild(node); }
    node.textContent = message; node.style.color = color || '#52525b';
  }
  function showEmailStatus(status) {
    if (!status || status === 'not_configured') return;
    let node = $('order-email-status');
    if (!node) { node = document.createElement('p'); node.id = 'order-email-status'; node.setAttribute('role','status'); node.style.cssText = 'font-size:12px;line-height:1.5;color:#71717a;margin-top:10px;text-align:center'; $('lv-pix-generate').parentElement.appendChild(node); }
    node.textContent = status === 'sent' ? 'Os dados do pedido e o Pix foram enviados ao e-mail informado. Confira também a pasta de spam.' : 'Seu Pix está disponível. O envio do e-mail do pedido está pendente; mantenha esta página aberta para tentarmos novamente.';
  }
  function payload() {
    const d = read(sessionStorage, 'dadosPessoais', {});
    const request = { customer: { name: d.nome, email: d.email, document: d.cpf, phone: d.telefone },
      address: { zipCode: value('lv-cep'), street: value('lv-endereco'), streetNumber: value('lv-numero'), complement: value('lv-complemento'), neighborhood: value('lv-bairro'), city: value('lv-cidade'), state: value('lv-uf') }, colors, shipping };
    const fingerprint = JSON.stringify(request);
    let saved = read(sessionStorage, 'checkoutAttempt', null);
    if (!saved || saved.fingerprint !== fingerprint) { saved = { id: crypto.randomUUID(), fingerprint }; save('checkoutAttempt', saved); }
    request.checkoutId = saved.id;
    return request;
  }
  function tick() {
    if (!payment) return;
    const seconds = Math.max(0, Math.floor((payment.expiresAt - Date.now()) / 1000));
    if ($('lv-pix-timer')) { const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60; $('lv-pix-timer').textContent = (h ? h + ':' : '') + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0'); }
    if (!seconds) { clearInterval(clockTimer); clearTimeout(pollTimer); showStatus('O prazo deste Pix terminou. Confira no banco se houve pagamento antes de iniciar outro pedido.', '#b45309'); }
  }
  async function checkStatus() {
    if (!payment || payment.expiresAt <= Date.now()) return;
    try {
      const res = await fetch('/api/pix/status?token=' + encodeURIComponent(payment.token), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        showEmailStatus(data.emailStatus);
        if (data.paid && data.amount === payment.amount) {
          clearInterval(clockTimer); showStatus('Pagamento confirmado! Seu pedido foi recebido.', '#059669');
          if ($('lv-pix-visual')) $('lv-pix-visual').style.display = 'none';
          if ($('lv-copy-pix')) $('lv-copy-pix').style.display = 'none';
          save('activePayment', { ...payment, paid: true });
          try { sessionStorage.removeItem('dadosPessoais'); sessionStorage.removeItem('dadosEndereco'); sessionStorage.removeItem('checkoutAttempt'); } catch {}
          return;
        }
        if (['REFUSED','CANCELED','CANCELLED','EXPIRED','REFUNDED','CHARGEBACK'].includes(data.status)) { showStatus('Status do pagamento: ' + data.status + '. Entre em contato com a loja.', '#b45309'); clearInterval(clockTimer); return; }
        showStatus('Aguardando pagamento. A confirmação é automática.');
      } else showStatus('A confirmação está temporariamente indisponível. Aguarde; não é necessário pagar outra vez.');
    } catch { showStatus('Verificando o pagamento. Mantenha esta página aberta.'); }
    pollTimer = setTimeout(checkStatus, document.hidden ? 60000 : 15000);
  }
  function renderPayment(data) {
    payment = data;
    showEmailStatus(data.emailStatus);
    if ($('lv-editar-dados')) $('lv-editar-dados').disabled = true;
    $('lv-pix-content').style.display = 'block';
    $('lv-pix-generate').style.display = 'none';
    $('lv-pix-code').textContent = data.copyPaste; $('lv-pix-code').style.display = 'block';
    const qr = qrcode(0, 'M'); qr.addData(data.copyPaste); qr.make();
    $('lv-pix-qr').src = qr.createDataURL(5, 20); $('lv-pix-qr').classList.remove('hidden'); $('lv-pix-qr').style.display = 'block';
    $('lv-pix-visual').style.display = 'flex';
    if ($('lv-pix-loading')) { $('lv-pix-loading').classList.add('hidden'); $('lv-pix-loading').style.display = 'none'; }
    $('lv-copy-pix').style.display = 'flex';
    for (const id of ['lv-pix-total','lv-pix-total-big','lv-pix-total-inline']) if ($(id)) $(id).textContent = fmt(data.amount);
    if (data.paid) { showStatus('Pagamento confirmado! Seu pedido foi recebido.', '#059669'); $('lv-copy-pix').style.display = 'none'; return; }
    showStatus('Aguardando pagamento. Confira o valor e o recebedor no aplicativo do banco.');
    tick(); clearInterval(clockTimer); clockTimer = setInterval(tick, 1000);
    clearTimeout(pollTimer); pollTimer = setTimeout(checkStatus, 3000);
  }
  async function generate() {
    if (busy || payment) return;
    busy = true; const button = $('lv-pix-generate'); button.disabled = true; button.textContent = 'GERANDO PIX...';
    showStatus('Solicitando o Pix à UmbrellaPag...');
    try {
      const res = await fetch('/api/pix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
      const result = await res.json();
      if (!res.ok || !result.copyPaste || result.amount !== total()) throw Error(result.message || 'Não foi possível gerar o Pix.');
      const saved = { ...result, cart: signature() }; save('activePayment', saved); renderPayment(saved);
    } catch (e) { showStatus(e.message || 'Falha de conexão. Verifique sua conexão antes de continuar.', '#be123c'); button.textContent = 'EFETUAR PAGAMENTO'; button.disabled = false; }
    finally { busy = false; }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'lv-pix-generate') { e.preventDefault(); generate(); return; }
    if (b.querySelector('svg.lucide-plus')) changeQty(1);
    if (b.querySelector('svg.lucide-minus')) changeQty(-1);
    if(b.dataset.shipping){
      if(payment){alert('Este pedido já tem um Pix gerado.');return;}
      shipping=b.dataset.shipping;draw();
    }
  });
  $('lv-cep')?.addEventListener('input', e => { const d = e.target.value.replace(/\D/g,'').slice(0,8); e.target.value = d.length > 5 ? d.slice(0,5) + '-' + d.slice(5) : d; });
  const notice = document.createElement('p'); notice.style.cssText = 'font-size:11px;line-height:1.5;color:#71717a;margin-top:12px;text-align:center'; notice.textContent = 'Ao gerar o Pix, seus dados serão enviados à UmbrellaPag para processar a compra e ao serviço de e-mail para enviar os dados do pedido e o Pix.'; $('lv-pix-generate').after(notice);
  draw();
  const active = read(sessionStorage, 'activePayment', null);
  if (active && active.cart === signature() && active.expiresAt > Date.now()) { for (let i=1;i<=3;i++) $('lv-step-'+i).style.display = i===3 ? '' : 'none'; renderPayment(active); }
})();
