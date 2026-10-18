
(function(){
  var PRICE=37.90;
  var OPTS=[
    {n:'Escova Modeladora GOKOCO (Preta)',l:'PRETA',i:'./assets/escova-preta.webp',out:false,p:37.90},
    {n:'Escova Modeladora GOKOCO (Branca)',l:'BRANCA',i:'./assets/escova-branca.webp',out:false,p:37.90},
    {n:'Escova Modeladora GOKOCO (Rosa)',l:'ROSA',i:'./assets/escova-rosa.webp',out:false,p:37.90},




  ];
  var modal=document.getElementById('lv-color-modal');
  var grid=document.getElementById('lv-color-grid');
  var cta=document.getElementById('lv-color-cta');
  var thumb=document.getElementById('lv-color-thumb');
  var selLbl=document.getElementById('lv-color-sel');
  var priceEl=document.getElementById('lv-color-price');
  var voltage='Bivolt';

  var QT=OPTS.map(function(){return 0;});
  function fmt(n){return n.toFixed(2).replace('.',',');}
  function totalQty(){return QT.reduce(function(a,b){return a+b;},0);}
  function chosen(){var r=[];OPTS.forEach(function(o,i){if(QT[i]>0)r.push({o:o,q:QT[i]});});return r;}
  function nice(l){return l.charAt(0)+l.slice(1).toLowerCase();}
  function render(){
    grid.innerHTML='';
    OPTS.forEach(function(o,idx){
      var active=QT[idx]>0;
      var d=document.createElement('div');
      d.style.cssText='border:1.5px solid '+(active?'#fe2c55':'#eceef1')+';border-radius:10px;padding:6px;text-align:center;background:'+(active?'#fff5f7':'#fff')+';position:relative;'+(o.out?'cursor:not-allowed':'cursor:pointer');
      var img='<div style="position:relative"><img decoding="async" src="'+o.i+'" alt="'+o.l+'" onerror="this.style.visibility=\'hidden\'" style="width:100%;aspect-ratio:1;object-fit:contain;border-radius:8px;background:#fff'+(o.out?';filter:grayscale(1);opacity:.5':'')+'"/>'+
        (o.out?'<span style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);background:rgba(22,24,35,.82);color:#fff;font-size:9.5px;font-weight:800;letter-spacing:.14em;padding:4px 0">ESGOTADO</span>':'')+
        (active?'<span style="position:absolute;top:3px;right:3px;background:#fe2c55;color:#fff;font-size:10px;font-weight:800;min-width:17px;height:17px;line-height:17px;border-radius:99px">'+QT[idx]+'</span>':'')+'</div>';
      var tagColor=idx===0?'#161823':idx===1?'#fff':'#f3b7cb';
      var body='<span class="lv-color-tag" style="background:'+tagColor+';color:'+(idx===0?'#fff':'#161823')+'">'+o.l+'</span>'+
        '<button type="button" class="lv-select" data-select aria-label="Selecionar escova '+nice(o.l)+'" aria-pressed="'+active+'" '+(o.out?'disabled':'')+'>'+(active?'SELECIONADO':'CLIQUE AQUI')+'</button>';
      var step=active?'<div style="margin-top:6px;border-top:1px dashed #f0d6de;padding-top:6px;display:flex;align-items:center;justify-content:space-between;gap:4px">'+
        '<button type="button" data-step="-1" style="width:24px;height:24px;border-radius:6px;border:1px solid #e6e8eb;background:#fff;font-size:15px;line-height:1;color:#161823">&minus;</button>'+
        '<span style="font-size:13px;font-weight:800;color:#161823">'+QT[idx]+'</span>'+
        '<button type="button" data-step="1" style="width:24px;height:24px;border-radius:6px;border:1px solid #e6e8eb;background:#fff;font-size:15px;line-height:1;color:#161823">+</button></div>'+
        '<button type="button" data-remove style="width:100%;margin-top:6px;border:0;border-radius:6px;padding:4px 0;font-size:10.5px;font-weight:700;color:#fe2c55;background:transparent">Remover</button>':'';
      d.innerHTML=img+body+step;
      if(!o.out){
        d.addEventListener('click',function(ev){
          var b=ev.target.closest&&ev.target.closest('[data-step]');
          var rm=ev.target.closest&&ev.target.closest('[data-remove]');
          if(rm&&QT[idx]>0){ ev.stopPropagation(); QT[idx]=0; update(); return; }
          if(b&&QT[idx]>0){ ev.stopPropagation(); QT[idx]=Math.min(10,Math.max(0,QT[idx]+parseInt(b.getAttribute('data-step'),10))); update(); return; }
          if(!ev.target.closest('[data-select]'))return;
          if(QT[idx]===0){ QT[idx]=1; update(); return; }
          if(QT[idx]===1){ QT[idx]=0; update(); return; }
        });
      }
      grid.appendChild(d);
    });
  }
  function update(){
    render();
    var c=chosen(),t=totalQty();
    var pricing=window.MB_PRICING(totalQty()),total=pricing.subtotal/100;
    priceEl.textContent=fmt(total||PRICE);
    if(c.length){
      thumb.src=c[0].o.i;
      selLbl.innerHTML='Selecionado: <strong style="color:#161823">'+c.map(function(x){return nice(x.o.l)+' x'+x.q;}).join(' + ')+(voltage?' · '+voltage:'')+'</strong>';
      cta.disabled=!voltage;
      cta.style.background=voltage?'#fe2c55':'#d5d6d9';
      cta.textContent='CONTINUAR PEDIDO';
    }else{
      selLbl.innerHTML='Selecione: <strong style="color:#161823">uma ou mais cores</strong>';
      priceEl.textContent=fmt(PRICE);
      cta.disabled=true;
      cta.style.background='#d5d6d9';
      cta.textContent='CONTINUAR PEDIDO';
    }
  }
  update();
  function open(){modal.style.display='flex';document.body.style.overflow='hidden';}
  function close(){modal.style.display='none';document.body.style.overflow='';}
  document.getElementById('lv-color-close').addEventListener('click',close);
  modal.addEventListener('click',function(e){if(e.target===modal)close();});
  function go(){
    var target=window.PAGE_CONFIG && window.PAGE_CONFIG.checkoutUrl;
    if(target){try{['activePayment','checkoutAttempt','checkoutCart','dadosPessoais','dadosEndereco'].forEach(function(k){sessionStorage.removeItem(k);});}catch(e){}window.location.assign(target);return;}
    cta.disabled=false;cta.style.opacity='1';update();
    window.showLocalNotice('Compra indisponível','Não foi possível abrir o pagamento. Tente novamente em instantes.');
  }
  cta.addEventListener('click',function(){
    var c=chosen(); if(!c.length||!voltage)return;
    var nome=c.length===1&&c[0].q===1?c[0].o.n:'Escova Modeladora GOKOCO ('+c.map(function(x){return nice(x.o.l)+' x'+x.q;}).join(' + ')+')';
    var total=window.MB_PRICING(totalQty()).subtotal/100;
    try{
      localStorage.setItem('corSelecionada',nome);
      localStorage.setItem('voltagemSelecionada',voltage);
      localStorage.setItem('corImagem',c[0].o.i||'');
      localStorage.setItem('qtdSelecionada',String(totalQty()));
      // Mantém a média sem arredondar: combinações de cores com preços
      // diferentes precisam voltar exatamente ao total escolhido.
      localStorage.setItem('precoUnit',String(total/totalQty()));
      localStorage.setItem('coresSelecionadas',JSON.stringify(c.map(function(x){
        return {name:x.o.n,label:nice(x.o.l),quantity:x.q,price:x.o.p,img:x.o.i};
      })));
    }catch(e){}

    cta.disabled=true; cta.innerHTML='Redirecionando...'; cta.style.opacity='.85';
    setTimeout(go,60);
  });
  document.querySelectorAll('a.ttk-buy,a.ttk-secondary').forEach(function(a){
    a.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();open();});
  });
})();