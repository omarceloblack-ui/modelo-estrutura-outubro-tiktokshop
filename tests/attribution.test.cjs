const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('navegador preserva primeiro acesso, atualiza última campanha e transporta somente parâmetros permitidos',()=>{
 const store=new Map();let handler;
 function visit(search){const context={window:{},location:{search,pathname:'/',href:'https://loja.example/'+search,origin:'https://loja.example'},URL,URLSearchParams,Date,localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},document:{addEventListener:(type,fn)=>{handler=fn}}};vm.runInNewContext(fs.readFileSync('dist/js/attribution.js','utf8'),context);return context;}
 let page=visit('?utm_source=facebook&utm_campaign=primeira&email=nao-capturar@example.com');assert.equal(page.window.MB_ATTRIBUTION.get().first.utm_source,'facebook');
 page=visit('?utm_source=instagram&utm_campaign=segunda');const data=page.window.MB_ATTRIBUTION.get();assert.equal(data.first.utm_campaign,'primeira');assert.equal(data.last.utm_campaign,'segunda');assert.ok(!JSON.stringify(data).includes('nao-capturar'));
 const link={href:'https://loja.example/pagamento'};handler({target:{closest:()=>link}});assert.equal(new URL(link.href).searchParams.get('utm_campaign'),'segunda');assert.ok(!link.href.includes('email='));
});
