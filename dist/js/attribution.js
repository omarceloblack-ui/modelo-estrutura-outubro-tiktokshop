(() => {
  'use strict';
  const key='mb-attribution-v1', ttl=30*86400000;
  const fields=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','fbclid'];
  const params=new URLSearchParams(location.search), touch={};
  fields.forEach(name=>{const value=params.get(name);if(value)touch[name]=value.trim().slice(0,300);});
  let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
  // Internal QA must never become the origin of a future real order.
  if(saved.first?.utm_source==='teste-interno'||saved.last?.utm_source==='teste-interno'){
    saved={};try{localStorage.removeItem(key);}catch{}
  }
  if(touch.utm_source==='teste-interno')Object.keys(touch).forEach(name=>delete touch[name]);
  if(!saved.updatedAt||Date.now()-saved.updatedAt>ttl)saved={};
  if(Object.keys(touch).length){
    touch.landingPath=location.pathname;touch.capturedAt=new Date().toISOString();
    saved={first:saved.first||touch,last:touch,updatedAt:Date.now()};
    try{localStorage.setItem(key,JSON.stringify(saved));}catch{}
  }
  window.MB_ATTRIBUTION={get:()=>saved.first?{first:saved.first,last:saved.last}:null};
  // Same-origin transport: no full URL, personal data or arbitrary query strings.
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');if(!link||!saved.last)return;
    const url=new URL(link.href,location.href);if(url.origin!==location.origin||url.pathname!=='/pagamento')return;
    fields.forEach(name=>{if(saved.last[name]&&!url.searchParams.has(name))url.searchParams.set(name,saved.last[name]);});
    link.href=url.href;
  });
})();
