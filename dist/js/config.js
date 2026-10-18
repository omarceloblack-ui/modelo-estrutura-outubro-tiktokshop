// Integrações opcionais. Nenhum endereço externo é carregado automaticamente.
window.PAGE_CONFIG = { checkoutUrl: '/pagamento', storeUrl: null };
window.showLocalNotice = function(title,message){
 var d=document.getElementById('local-notice');
 if(!d){d=document.createElement('dialog');d.id='local-notice';d.style.cssText='border:1px solid #eceef1;border-radius:16px;padding:24px;max-width:360px;width:calc(100% - 32px);color:#161823;font-family:Inter,system-ui,sans-serif';d.innerHTML='<h2 style="font-size:18px;margin:0 0 12px"></h2><p style="font-size:14px;line-height:1.6"></p><button type="button" style="width:100%;padding:12px;border:0;border-radius:10px;background:#fe2c55;color:white;font-weight:700">Entendi</button>';d.querySelector('button').onclick=function(){d.close()};document.body.appendChild(d);}
 d.querySelector('h2').textContent=title;d.querySelector('p').textContent=message;d.showModal();
};
