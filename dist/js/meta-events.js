(() => {
  'use strict';
  let enabled=false;
  let ready=fetch('/api/marketing/config',{cache:'no-store'}).then(r=>r.json()).then(config=>{
    if(!config.enabled||!/^\d+$/.test(config.pixelId||''))return false;
    const fbq=function(){fbq.callMethod?fbq.callMethod.apply(fbq,arguments):fbq.queue.push(arguments);};
    fbq.queue=[];fbq.loaded=true;fbq.version='2.0';window.fbq=fbq;window._fbq=fbq;
    const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(script);
    fbq('init',config.pixelId);enabled=true;return true;
  }).catch(()=>false);
  window.MB_META={
    context:()=>{
      if(!enabled)return null;
      const data={};document.cookie.split(';').forEach(pair=>{const index=pair.indexOf('='),name=pair.slice(0,index).trim();if(name==='_fbp'||name==='_fbc')data[name.slice(1)]=pair.slice(index+1).slice(0,300);});return data;
    },
    checkout:async()=>{
      if(!await ready)return;
      let id;try{id=sessionStorage.getItem('metaCheckoutId');if(!id){id=crypto.randomUUID();sessionStorage.setItem('metaCheckoutId',id);}if(sessionStorage.getItem('metaInitSent')===id)return;}catch{id=crypto.randomUUID();}
      window.fbq('track','InitiateCheckout',{}, {eventID:id});
      fetch('/api/marketing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:id})}).catch(()=>{});
      try{sessionStorage.setItem('metaInitSent',id);}catch{}
    },
    payment:async(payment,paid)=>{
      if(!await ready||!payment.orderId)return;
      const name=paid?'Purchase':'PixGerado',id=(paid?'purchase:':'pix:')+payment.orderId;
      try{if(sessionStorage.getItem('meta:'+id))return;}catch{}
      window.fbq(paid?'track':'trackCustom',name,{value:payment.amount/100,currency:'BRL'},{eventID:id});
      try{sessionStorage.setItem('meta:'+id,'1');}catch{}
    }
  };
  if(location.pathname==='/pagamento'||location.pathname==='/pagamento.html')window.MB_META.checkout();
})();
