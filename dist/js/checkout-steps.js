
(function(){
  function show(n){
    for(var i=1;i<=3;i++){ var el=document.getElementById('lv-step-'+i); if(el) el.style.display = (i===n?'':'none'); }
    window.scrollTo(0,0);
  }
  function fmtDoc(d){
    d=(d||'').replace(/\D/g,'');
    if(d.length===11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
    if(d.length===14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');
    return d;
  }
  function fmtPhone(d){
    d=(d||'').replace(/\D/g,'').slice(0,11);
    if(d.length<3) return d;
    if(d.length<=6) return '('+d.slice(0,2)+') '+d.slice(2);
    if(d.length<=10) return '('+d.slice(0,2)+') '+d.slice(2,6)+'-'+d.slice(6);
    return '('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7);
  }
  function getVal(id){ var el=document.getElementById(id); return el ? (el.value||'').trim() : ''; }
  function saveEndereco(){
    try{
      var e={ cep:getVal('lv-cep'), logradouro:getVal('lv-endereco'), numero:getVal('lv-numero'), complemento:getVal('lv-complemento'), bairro:getVal('lv-bairro'), cidade:getVal('lv-cidade'), uf:getVal('lv-uf') };
      if(e.cep||e.cidade||e.uf){ sessionStorage.setItem('dadosEndereco', JSON.stringify(e)); }
    }catch(_e){}
  }
  function loadDados(){
    try{ return JSON.parse(sessionStorage.getItem('dadosPessoais')||'null')||{}; }catch(e){ return {}; }
  }
  function loadEndereco(){
    try{ return JSON.parse(sessionStorage.getItem('dadosEndereco')||'null')||{}; }catch(e){ return {}; }
  }
  function renderResumo(){
    var d=loadDados();
    var e=loadEndereco();
    var nome=d.nome||'—';
    var email=d.email||'—';
    var cpf=fmtDoc(d.cpf||'');
    var tel=fmtPhone(d.telefone||'');
    var endereco='—';
    if(e.logradouro||e.cidade){
      var parts=[e.logradouro, e.numero, e.bairro, e.cidade, e.uf].filter(Boolean);
      endereco=parts.join(', ');
      if(e.cep) endereco+=' — '+e.cep.replace(/\D/g,'').replace(/(\d{5})(\d{3})/,'$1-$2');
    }
    var elNome=document.getElementById('lv-r-nome'); if(elNome) elNome.textContent=nome;
    var elEmail=document.getElementById('lv-r-email'); if(elEmail) elEmail.textContent=email;
    var elCpf=document.getElementById('lv-r-cpf'); if(elCpf) elCpf.textContent=cpf;
    var elTel=document.getElementById('lv-r-telefone'); if(elTel) elTel.textContent=tel;
    var elEnd=document.getElementById('lv-r-endereco'); if(elEnd) elEnd.textContent=endereco;
  }
  function bind(){
    document.querySelectorAll('button').forEach(function(b){
      var t=(b.innerText||'').trim().toUpperCase();
      if(t==='CONTINUAR O PEDIDO' && !b.dataset.lvw){ b.dataset.lvw='1'; b.addEventListener('click', function(e){
        e.preventDefault();
        var nome=(document.querySelector('input[placeholder="Nome e Sobrenome"]')||{}).value||'';
        var email=(document.querySelector('input[placeholder="email@email.com"]')||{}).value||'';
        var cpf=((document.querySelector('input[placeholder="123.456.789-12"]')||{}).value||'').replace(/\D/g,'');
        var tel=((document.querySelector('input[placeholder="(99) 99999-9999"]')||{}).value||'').replace(/\D/g,'');
        if(!nome.trim()||!email.trim()||cpf.length<11||tel.length<10){
          alert('Preencha nome, e-mail, CPF e telefone para continuar.');
          return;
        }
        try{ sessionStorage.setItem('dadosPessoais', JSON.stringify({nome:nome.trim(),email:email.trim(),cpf:cpf,telefone:tel})); }catch(_e){}
        show(2);

      }); }
      if(t==='IR PARA O PAGAMENTO' && !b.dataset.lvw){ b.dataset.lvw='1'; b.addEventListener('click', function(e){
        e.preventDefault();
        var required=[['lv-cep','CEP'],['lv-endereco','endereço'],['lv-numero','número'],['lv-bairro','bairro'],['lv-cidade','cidade'],['lv-uf','UF']];
        var missing=required.find(function(item){return !getVal(item[0]);});
        if(missing){ alert('Preencha '+missing[1]+' para continuar.'); document.getElementById(missing[0]).focus(); return; }
        if(getVal('lv-cep').replace(/\D/g,'').length!==8 || !/^[A-Za-z]{2}$/.test(getVal('lv-uf'))){ alert('Confira o CEP e a UF antes de continuar.'); return; }
        saveEndereco();
        renderResumo();
        show(3);
      }); }
      if(t==='VOLTAR' && !b.dataset.lvw){
        b.dataset.lvw='1';
        b.addEventListener('click', function(e){
          e.preventDefault();
          var cur = document.getElementById('lv-step-2').style.display!=='none' ? 2 : (document.getElementById('lv-step-3').style.display!=='none' ? 3 : 1);
          show(Math.max(1, cur-1));
        });
      }
    });
    var edit=document.getElementById('lv-editar-dados');
    if(edit && !edit.dataset.lvw){ edit.dataset.lvw='1'; edit.addEventListener('click', function(){ show(1); }); }
    // (copiar PIX é tratado por um único handler no fim da página)

  }
  bind();
  // Rebind on any DOM changes
  new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
  // Pre-render caso a página já abra no step 3
  renderResumo();
})();

