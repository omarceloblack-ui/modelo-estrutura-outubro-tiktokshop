(() => {
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  let timer;
  async function api(path,body){const response=await fetch('/api/redelivery/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.message||'Não foi possível concluir. Entre em contato com a loja.');return data;}
  function refresh(){document.getElementById('tracking-form').requestSubmit();}
  function render(data){
    clearTimeout(timer);document.getElementById('redelivery-dialog')?.remove();
    const delivery=data.delivery;if(!delivery)return;
    const card=document.createElement('section');card.className='card redelivery-card';
    const attempts=delivery.attempts.map(a=>'<li><strong>'+a.number+'ª tentativa sem sucesso</strong><p>'+escape(a.note)+'</p><small>'+escape(new Date(a.occurred_at).toLocaleString('pt-BR'))+' · '+escape(a.location)+'</small></li>').join('');
    card.innerHTML='<span class="eyebrow">Entrega · ciclo '+delivery.cycle+'</span>'+(attempts?'<h2>Tentativas de entrega</h2><ol class="attempt-list">'+attempts+'</ol>':'')+(delivery.cycle>1?'<p class="notice success">Reentrega confirmada. A previsão deste ciclo conta a partir de '+escape(new Date(delivery.cycleStartedAt).toLocaleDateString('pt-BR'))+'.</p>':'')+'<div id="redelivery-choice"></div><div id="redelivery-editor"></div><p id="redelivery-message" class="message" role="status" aria-live="polite"></p>';
    const choice=card.querySelector('#redelivery-choice'),editor=card.querySelector('#redelivery-editor'),message=card.querySelector('#redelivery-message');
    const result=document.getElementById('result');result.insertBefore(card,result.children[1]||null);
    const cancel=()=>{
      editor.innerHTML='<h3>Solicitar cancelamento</h3><p>A loja analisará a solicitação e entrará em contato sobre o pedido e o eventual reembolso. Esta ação não realiza estorno automático.</p><button type="button" id="confirm-cancel">Confirmar solicitação de cancelamento</button>';
      editor.querySelector('button').onclick=async event=>{event.target.disabled=true;try{await api('choice',{code:data.trackingCode,action:'cancel'});refresh();}catch(error){message.textContent=error.message;event.target.disabled=false;}};
      editor.scrollIntoView({behavior:'smooth',block:'nearest'});
    };
    function paymentView(payment){
      editor.innerHTML='<h3>Taxa de reentrega · R$ 10,00</h3><p>O novo prazo de até 15 dias começa somente após a confirmação do pagamento.</p><img id="redelivery-qr" alt="QR Code da taxa de reentrega" width="210" height="210"><label for="redelivery-code">Pix copia e cola</label><textarea id="redelivery-code" readonly rows="4"></textarea><div class="toolbar"><button type="button" id="redelivery-copy">Copiar código Pix</button><button type="button" class="secondary" id="redelivery-check">Conferir pagamento</button></div>';
      editor.querySelector('textarea').value=payment.copyPaste;
      const qr=qrcode(0,'M');qr.addData(payment.copyPaste);qr.make();editor.querySelector('img').src=qr.createDataURL(5,16);
      editor.querySelector('#redelivery-copy').onclick=async()=>{try{await navigator.clipboard.writeText(payment.copyPaste);message.textContent='Código copiado.';}catch{editor.querySelector('textarea').select();message.textContent='Selecione e copie o código acima.';}};
      editor.querySelector('#redelivery-check').onclick=check;
    }
    async function check(){
      clearTimeout(timer);try{
        const result=await api('status?code='+encodeURIComponent(data.trackingCode));
        if(result.delivery.cycle>delivery.cycle||result.payment?.paid){message.textContent='Reentrega confirmada! Atualizando o novo ciclo…';refresh();return;}
        if(result.payment?.review){message.textContent='Pagamento recebido. A loja precisa revisar a solicitação antes de prosseguir.';return;}
        if(result.payment?.closed){message.textContent='Este Pix foi encerrado. Entre em contato com a loja; não pague este código.';return;}
        if(result.payment){if(!editor.querySelector('#redelivery-code'))paymentView(result.payment);message.textContent=Date.now()>=result.payment.expiresAt?'O prazo deste Pix terminou. Consulte a loja antes de iniciar qualquer outro pagamento.':'Aguardando confirmação da taxa de reentrega.';}
        else message.textContent='Solicitação em verificação. Entre em contato com a loja; não gere outro pagamento.';
        timer=setTimeout(check,document.hidden?30000:15000);
      }catch(error){message.textContent=error.message;timer=setTimeout(check,30000);}
    }
    const redeliver=()=>{
      const address=data.address||{},fields=[['zipCode','CEP'],['street','Endereço'],['streetNumber','Número'],['complement','Complemento (opcional)'],['neighborhood','Bairro'],['city','Cidade'],['state','UF']];
      editor.innerHTML='<h3>Conferir endereço para reentrega</h3><p>Taxa opcional: <strong>R$ 10,00</strong>. Nova previsão de até 15 dias após a confirmação. O pedido e o histórico serão mantidos.</p><form id="redelivery-form" class="grid">'+fields.map(([name,label])=>'<div><label for="rd-'+name+'">'+label+'</label><input id="rd-'+name+'" name="'+name+'" maxlength="'+(name==='state'?2:160)+'" value="'+escape(address[name]||'')+'" '+(name!=='complement'?'required':'')+'></div>').join('')+'<div><label for="rd-document">CPF/CNPJ do responsável pelo pagamento</label><input id="rd-document" name="document" inputmode="numeric" maxlength="18" required></div><div><label for="rd-phone">Telefone com DDD</label><input id="rd-phone" name="phone" inputmode="tel" maxlength="20" required></div><label class="confirm-contact full"><input type="checkbox" name="consent" required>Conferi o endereço e solicito a reentrega opcional por R$ 10,00, com nova previsão de até 15 dias após a confirmação.</label><div class="full"><button>Gerar Pix da taxa · R$ 10,00</button></div></form>';
      editor.querySelector('form').onsubmit=async event=>{
        event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;message.textContent='Solicitando taxa de reentrega…';
        const values=Object.fromEntries(new FormData(form)),address=Object.fromEntries(fields.map(([key])=>[key,values[key]]));
        try{const payment=await api('choice',{code:data.trackingCode,action:'redelivery',address,document:values.document,phone:values.phone,consent:form.elements.consent.checked});choice.innerHTML='';paymentView(payment);message.textContent='Pix gerado. O novo ciclo ainda não começou.';timer=setTimeout(check,10000);}
        catch(error){message.textContent=error.message;button.disabled=false;}
      };
      editor.scrollIntoView({behavior:'smooth',block:'nearest'});
    };
    if(delivery.status==='failed'){
      choice.innerHTML='<h2>Não foi possível concluir a entrega</h2><p>Foram registradas três tentativas sem sucesso. Escolha como deseja continuar.</p><div class="delivery-choice-actions"><button type="button" id="request-cancel" class="secondary">Solicitar cancelamento</button>'+(delivery.feeAllowed?'<button type="button" id="request-redelivery">Solicitar reentrega · R$ 10,00</button>':'<a class="button" href="/">Voltar à loja</a>')+'</div>';
      choice.querySelector('#request-cancel').onclick=cancel;choice.querySelector('#request-redelivery')?.addEventListener('click',redeliver);
      const dialog=document.createElement('dialog');dialog.id='redelivery-dialog';dialog.setAttribute('aria-labelledby','redelivery-title');dialog.innerHTML='<button class="secondary close" type="button" aria-label="Fechar aviso">✕</button><h2 id="redelivery-title">Precisamos da sua escolha</h2><p>Três tentativas de entrega foram registradas sem sucesso. Você pode solicitar cancelamento'+(delivery.feeAllowed?' ou uma reentrega opcional de R$ 10,00, com nova previsão de até 15 dias após o pagamento.':'. Entre em contato com a loja para resolver a entrega.')+'</p><div class="delivery-choice-actions"><button type="button" id="popup-cancel" class="secondary">Solicitar cancelamento</button>'+(delivery.feeAllowed?'<button type="button" id="popup-redelivery">Reentrega · R$ 10,00</button>':'')+'</div><button type="button" id="see-options" class="secondary">Ver histórico e opções</button>';
      document.body.appendChild(dialog);dialog.querySelector('#popup-cancel').onclick=()=>{dialog.close();cancel();};dialog.querySelector('#popup-redelivery')?.addEventListener('click',()=>{dialog.close();redeliver();});dialog.querySelector('.close').onclick=()=>dialog.close();dialog.querySelector('#see-options').onclick=()=>{dialog.close();card.scrollIntoView({behavior:'smooth',block:'center'});};
      const key='delivery-choice:'+data.trackingCode+':'+delivery.cycle;let seen=false;try{seen=sessionStorage.getItem(key)==='1';sessionStorage.setItem(key,'1');}catch{}
      if(!seen)dialog.showModal();
    }else if(delivery.status==='cancel_requested')choice.innerHTML='<h2>Cancelamento solicitado</h2><p>A loja recebeu sua solicitação e analisará o pedido e o eventual reembolso. Nenhum estorno automático foi realizado.</p>';
    else if(delivery.status==='redelivery_pending'){choice.innerHTML='<h2>Reentrega aguardando pagamento</h2><p>O novo prazo ainda não começou. Não é necessário gerar outro Pix.</p>';check();}
  }
  window.Redelivery={render};
})();
