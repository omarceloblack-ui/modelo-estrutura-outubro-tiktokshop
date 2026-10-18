
/* Reduz a fricção do checkout: máscara + validação de CPF/telefone em tempo
   real (evita erro só na hora de gerar o PIX) e cópia do código PIX com
   fallback para navegadores sem clipboard API dentro de iframe. */
(function(){
  function onlyDigits(v){ return (v||'').replace(/\D/g,''); }
  function validCpf(d){
    if(d.length!==11 || /^(\d)\1{10}$/.test(d)) return false;
    function calc(len){ var s=0; for(var i=0;i<len;i++) s+=Number(d[i])*(len+1-i); var r=(s*10)%11; return r===10?0:r; }
    return calc(9)===Number(d[9]) && calc(10)===Number(d[10]);
  }
  function validCnpj(d){
    if(d.length!==14 || /^(\d)\1{13}$/.test(d)) return false;
    function calc(len){ var w=len===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2]; var s=0; for(var i=0;i<len;i++) s+=Number(d[i])*w[i]; var r=s%11; return r<2?0:11-r; }
    return calc(12)===Number(d[12]) && calc(13)===Number(d[13]);
  }
  function docValid(d){ return d.length===14 ? validCnpj(d) : validCpf(d); }
  function maskCpf(d){
    d=d.slice(0,14);
    if(d.length<=11) return d.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/,'.$1-$2');
    return d.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');
  }
  function maskPhone(d){
    d=d.slice(0,11);
    if(d.length<3) return d;
    if(d.length<=6) return '('+d.slice(0,2)+') '+d.slice(2);
    if(d.length<=10) return '('+d.slice(0,2)+') '+d.slice(2,6)+'-'+d.slice(6);
    return '('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7);
  }
  function fieldMsg(input, msg, ok){
    var wrap = input.parentElement; if(!wrap) return;
    var el = wrap.querySelector('[data-lv-msg]');
    if(!msg){ if(el) el.remove(); input.style.borderColor=''; return; }
    if(!el){ el=document.createElement('p'); el.setAttribute('data-lv-msg','1'); el.className='mt-1.5 text-[11px] leading-snug'; wrap.appendChild(el); }
    el.textContent=msg;
    el.style.color = ok ? '#059669' : '#e11d48';
    input.style.borderColor = ok ? '#059669' : '#e11d48';
  }
  function cpfInputs(){ return Array.prototype.slice.call(document.querySelectorAll('input[placeholder="123.456.789-12"]')); }
  function phoneInputs(){ return Array.prototype.slice.call(document.querySelectorAll('input[placeholder="(99) 99999-9999"]')); }
  function emailInputs(){ return Array.prototype.slice.call(document.querySelectorAll('input[placeholder="email@email.com"]')); }
  function normalizeCheckoutEmail(value){
    var email=String(value||'').trim().toLowerCase();
    var at=email.lastIndexOf('@');
    if(at>0) email=email.slice(0,at).replace(/\.+$/,'')+'@'+email.slice(at+1);
    return email;
  }
  function isCheckoutEmailValid(value){
    var email=normalizeCheckoutEmail(value);
    return email.length<=254 && !/\.\./.test(email) && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,63}$/i.test(email);
  }

  document.addEventListener('input', function(e){
    var t=e.target; if(!t || t.tagName!=='INPUT') return;
    var ph=t.getAttribute('placeholder')||'';
    if(ph==='123.456.789-12'){
      var d=onlyDigits(t.value); t.value=maskCpf(d);
      if(d.length>=11) fieldMsg(t, docValid(d)?'CPF válido':'CPF inválido — confira os números', docValid(d));
      else fieldMsg(t,'');
    } else if(ph==='(99) 99999-9999'){
      var p=onlyDigits(t.value); t.value=maskPhone(p);
      fieldMsg(t, p.length>0 && p.length<10 ? 'Telefone incompleto' : '', false);
    } else if(ph==='email@email.com'){
      var v=(t.value||'').trim();
      fieldMsg(t, v && !isCheckoutEmailValid(v) ? 'E-mail inválido' : '', false);
    }
  }, true);

  // Bloqueia o avanço com CPF inválido antes de chegar ao PIX.
  document.addEventListener('click', function(e){
    var b=e.target && e.target.closest ? e.target.closest('button') : null;
    if(!b) return;
    if((b.innerText||'').trim().toUpperCase()!=='CONTINUAR O PEDIDO') return;
    var cpfEl=cpfInputs()[0], telEl=phoneInputs()[0], mailEl=emailInputs()[0];
    var d=onlyDigits(cpfEl&&cpfEl.value);
    var bad=null;
    if(mailEl && !isCheckoutEmailValid(mailEl.value)){ bad=mailEl; fieldMsg(mailEl,'E-mail inválido',false); }
    else if(telEl && onlyDigits(telEl.value).length<10){ bad=telEl; fieldMsg(telEl,'Telefone incompleto',false); }
    else if(!docValid(d)){ bad=cpfEl; fieldMsg(cpfEl,'CPF inválido — confira os números',false); }
    if(bad){
      e.preventDefault(); e.stopImmediatePropagation();
      bad.focus(); bad.scrollIntoView({block:'center',behavior:'smooth'});
    }
  }, true);

  // Cópia do PIX com fallback (iframe/navegadores sem clipboard API).
  function copyText(text){
    var done=false;
    try{ if(navigator.clipboard && window.isSecureContext){ navigator.clipboard.writeText(text); done=true; } }catch(e){}
    if(!done){
      try{
        var ta=document.createElement('textarea');
        ta.value=text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
        done=document.execCommand('copy'); document.body.removeChild(ta);
      }catch(e){}
    }
    return done;
  }
  document.addEventListener('click', function(e){
    var t=e.target && e.target.closest ? e.target.closest('#lv-copy-pix, #lv-pix-code') : null;
    if(!t) return;
    var codeEl=document.getElementById('lv-pix-code');
    var code=codeEl?(codeEl.innerText||'').trim():'';
    if(!code || code.indexOf('Gerando')===0) return;
    var ok=copyText(code);
    var btn=document.getElementById('lv-copy-pix');
    if(btn){ btn.innerText = ok?'Código copiado! Cole no app do banco':'Toque e segure no código para copiar'; setTimeout(function(){ btn.innerText='Copiar código PIX'; }, 2500); }
  });
})();

