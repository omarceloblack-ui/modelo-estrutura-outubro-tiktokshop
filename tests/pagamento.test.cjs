const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
let worker;
before(async () => { worker = await import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync('dist/_worker.js')).toString('base64'));const original=worker.default.fetch;worker.default.fetch=(request,env)=>original(request,{STORE_MODE:'live',...env}); });
const body = () => ({ checkoutId: '11111111-1111-4111-8111-111111111111', customer: { name: 'Cliente de Teste', email: 'teste@example.com', document: '52998224725', phone: '11987654321' }, address: { zipCode: '01310100', street: 'Rua de Teste', streetNumber: '10', neighborhood: 'Centro', city: 'São Paulo', state: 'SP' }, colors: [{color:'preta',quantity:1}], shipping: 'free' });
const { DatabaseSync } = require('node:sqlite');
class Database {
  constructor(){ this.db=new DatabaseSync(':memory:');this.emails={get:(id)=>this.db.prepare('SELECT * FROM order_emails WHERE order_id = ?').get(id)}; }
  prepare(sql){const db=this.db;return{sql,args:[],bind(...args){this.args=args;return this;},async first(){return db.prepare(sql).get(...this.args)||null;},async all(){return{results:db.prepare(sql).all(...this.args)};},async run(){const r=db.prepare(sql).run(...this.args);return{meta:{changes:Number(r.changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
function request(data, origin='https://loja.example') { return new Request('https://loja.example/api/pix',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(data)}); }
test('calcula preços no servidor e ignora valores enviados pelo cliente', () => {
  const b = body(); b.amount = 1; b.colors = [{color:'preta',quantity:2},{color:'rosa',quantity:1}]; b.shipping='jadlog';
  const order=worker.prepareOrder(b); assert.equal(order.amount,9806); assert.equal(order.items[0].unitPrice,2653); assert.equal(order.shipping.fee,1847);
});
test('rejeita CPF, cor, quantidade, frete e endereço inválidos', () => {
  for(const mutate of [b=>b.customer.document='11111111111', b=>b.colors[0].color='azul', b=>b.colors[0].quantity=1.5, b=>b.colors[0].quantity=100, b=>b.shipping='barato',b=>b.address.state='XX']) { const b=body();mutate(b);assert.throws(()=>worker.prepareOrder(b)); }
});
test('assinatura impede consulta de transação de outro comprador', async () => {
  const token=await worker.signPayment({id:'transaction-1',amount:3790,expiresAt:Date.now()+10000},'fake-test-secret');
  assert.equal((await worker.verifyPayment(token,'fake-test-secret')).id,'transaction-1');
  assert.equal(await worker.verifyPayment(token+'x','fake-test-secret'),null);
  assert.equal(await worker.verifyPayment(token,'other-test-secret'),null);
});
test('origem externa e falta de configuração bloqueiam geração', async () => {
  const env={UMBRELLA_API_KEY:'fake-test-secret',PAYMENTS_DB:new Database()};
  assert.equal((await worker.default.fetch(request(body(),'https://outro.example'),env)).status,403);
  assert.equal((await worker.default.fetch(request(body()),{})).status,503);
});
test('repete a mesma cobrança sem criar outra e confirma somente PAID', async () => {
  const old=global.fetch;let calls=0;let status='WAITING_PAYMENT';const db=new Database();const env={UMBRELLA_API_KEY:'fake-test-secret',PAYMENTS_DB:db};
  global.fetch=async(url,opts)=>{calls++;return Response.json({data:{id:'transaction-test-1',amount:3790,status,pix:{qrcode:'000201-test-fixture-not-a-real-payment',expirationDate:new Date(Date.now()+86400000).toISOString()}}});};
  try {
    const r=await worker.default.fetch(request(body()),env);assert.equal(r.status,200);const payment=await r.json();
    assert.equal(payment.amount,3790);assert.ok(payment.token);assert.ok(!JSON.stringify(payment).includes('fake-test-secret'));
    const second=await worker.default.fetch(request(body()),env);assert.equal(second.status,200);assert.equal(calls,1);
    const req=new Request('https://loja.example/api/pix/status?token='+encodeURIComponent(payment.token));
    status='AUTHORIZED';assert.equal((await (await worker.default.fetch(req,env)).json()).paid,false);
    status='PAID';assert.equal((await (await worker.default.fetch(req,env)).json()).paid,true);
  } finally {global.fetch=old;}
});
test('resultado incerto não gera uma segunda cobrança ao repetir', async () => {
  const old=global.fetch;let calls=0;const env={UMBRELLA_API_KEY:'fake-test-secret',PAYMENTS_DB:new Database()};
  const b=body();b.checkoutId='22222222-2222-4222-8222-222222222222';
  global.fetch=async()=>{calls++;throw Error('simulated timeout');};
  try {assert.equal((await worker.default.fetch(request(b),env)).status,502);assert.equal((await worker.default.fetch(request(b),env)).status,409);assert.equal(calls,1);}finally{global.fetch=old;}
});
test('consulta CEP retorna somente campos de endereço, sem depender da chave Pix', async () => {
  const old = global.fetch;
  global.fetch = async url => { assert.equal(url, 'https://viacep.com.br/ws/01001000/json/'); return Response.json({ logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP', ibge: 'ignorado' }); };
  try { const res = await worker.default.fetch(new Request('https://loja.example/api/cep/01001000'), {}); assert.equal(res.status, 200); assert.deepEqual(await res.json(), { cep:'01001000',street:'Praça da Sé',neighborhood:'Sé',city:'São Paulo',state:'SP' }); } finally { global.fetch = old; }
});
test('CEP inválido ou inexistente permite preenchimento manual', async () => {
  assert.equal((await worker.default.fetch(new Request('https://loja.example/api/cep/123'), {})).status, 400);
  const old = global.fetch; global.fetch = async () => Response.json({ erro: true });
  try { assert.equal((await worker.default.fetch(new Request('https://loja.example/api/cep/99999999'), {})).status, 404); } finally { global.fetch = old; }
});
test('e-mail contém dados do pedido, valor e Pix sem declarar pagamento pendente como pago', () => {
  const order=worker.prepareOrder(body());order.customer.name='<script>cliente</script>';
  const email=worker.buildOrderEmail(order,{orderId:'order-test',amount:3790,copyPaste:'000201-codigo-de-teste',expiresAt:Date.now()+3600000,status:'WAITING_PAYMENT'});
  assert.ok(email.html.includes('&lt;script&gt;cliente&lt;/script&gt;'));
  assert.ok(!email.html.includes('<script>'));assert.ok(email.text.includes('000201-codigo-de-teste'));
  assert.ok(email.text.includes('aguardando pagamento'));assert.ok(!email.text.includes('52998224725'));
  assert.deepEqual(email.to,['teste@example.com']);
});
test('envia uma única confirmação, usa chave de idempotência e remove dados após aceite', async () => {
  const old=global.fetch;let emails=0;const db=new Database();const env={UMBRELLA_API_KEY:'fake-test-secret',RESEND_API_KEY:'fake-email-secret',ORDER_FROM_EMAIL:'Loja <pedidos@example.com>',PAYMENTS_DB:db};const b=body();b.checkoutId='33333333-3333-4333-8333-333333333333';
  global.fetch=async(url,options)=>{
    if(url==='https://api.resend.com/emails'){emails++;const message=JSON.parse(options.body);assert.deepEqual(message.to,['teste@example.com']);assert.equal(options.headers['Idempotency-Key'],'gokoco-order/email-order-1');return Response.json({id:'accepted-email-1'});}
    return Response.json({data:{id:'email-order-1',amount:3790,status:'WAITING_PAYMENT',pix:{qrcode:'000201-codigo-de-teste'}}});
  };
  try{const first=await worker.default.fetch(request(b),env);assert.equal(first.status,200);assert.equal((await first.json()).emailStatus,'sent');const second=await worker.default.fetch(request(b),env);assert.equal((await second.json()).emailStatus,'sent');assert.equal(emails,1);assert.equal(db.emails.get('email-order-1').payload,null);}finally{global.fetch=old;}
});
test('falha no envio do e-mail mantém o Pix disponível e guarda apenas conteúdo criptografado', async () => {
  const old=global.fetch;const db=new Database();const env={UMBRELLA_API_KEY:'fake-test-secret',RESEND_API_KEY:'fake-email-secret',ORDER_FROM_EMAIL:'Loja <pedidos@example.com>',PAYMENTS_DB:db};const b=body();b.checkoutId='44444444-4444-4444-8444-444444444444';
  global.fetch=async url=>url==='https://api.resend.com/emails'?Response.json({error:'temporarily unavailable'},{status:503}):Response.json({data:{id:'email-order-2',amount:3790,status:'WAITING_PAYMENT',pix:{qrcode:'000201-codigo-de-teste'}}});
  try{const res=await worker.default.fetch(request(b),env);assert.equal(res.status,200);const payment=await res.json();assert.equal(payment.emailStatus,'pending');assert.ok(payment.copyPaste);const encrypted=db.emails.get('email-order-2').payload;assert.ok(!encrypted.includes('teste@example.com'));assert.ok(!encrypted.includes('Cliente de Teste'));}finally{global.fetch=old;}
});
test('webhook consulta pagamento na operadora, gera código único e não duplica confirmação', async()=>{
 const old=global.fetch,db=new Database(),env={UMBRELLA_API_KEY:'test-secret',WEBHOOK_SECRET:'test-webhook-secret',RESEND_API_KEY:'test-email',ORDER_FROM_EMAIL:'Loja <pedidos@example.com>',PAYMENTS_DB:db};
 const order=worker.prepareOrder(body());let paid=false,mails=[];
 global.fetch=async(url,options)=>{if(url==='https://api.resend.com/emails'){mails.push(JSON.parse(options.body));return Response.json({id:'mail-'+mails.length});}return Response.json({data:{...order,id:'webhook-test',status:paid?'PAID':'WAITING_PAYMENT',createdAt:new Date(Date.now()-10000).toISOString(),paidAt:paid?new Date().toISOString():null,pix:{qrcode:'000201-test'}}});};
 const callback=()=>new Request('https://loja.example/api/webhook/umbrella/test-webhook-secret',{method:'POST',body:JSON.stringify({objectId:'webhook-test',data:{status:'PAID'}})});
 try{assert.equal((await worker.default.fetch(callback(),env)).status,200);let row=db.db.prepare('SELECT * FROM orders').get();assert.equal(row.payment_status,'WAITING_PAYMENT');assert.equal(mails.length,0);assert.ok(!row.details.includes('teste@example.com'));
 paid=true;assert.equal((await worker.default.fetch(callback(),env)).status,200);row=db.db.prepare('SELECT * FROM orders').get();const code=row.tracking_code;assert.match(code,/^GKC-[A-F0-9]{32}$/);assert.equal(row.stage,1);assert.equal(mails.length,1);assert.ok(mails[0].html.includes('/rastreio?codigo='+code));await worker.default.fetch(callback(),env);assert.equal(mails.length,1);
 const r=await worker.default.fetch(new Request('https://loja.example/api/tracking?code='+code),env),tracking=await r.json();assert.equal(r.status,200);assert.equal(tracking.orderCode,row.order_code);assert.equal(tracking.stage,1);assert.equal(tracking.stages.length,5);assert.equal(tracking.stages[4].to,15);assert.ok(!JSON.stringify(tracking).includes('teste@example.com'));assert.ok(!JSON.stringify(tracking).includes('52998224725'));assert.equal(tracking.events.length,1);
 assert.equal((await worker.default.fetch(new Request('https://loja.example/api/webhook/umbrella/wrong',{method:'POST',body:'{}'}),env)).status,404);
 }finally{global.fetch=old;}
});
test('painel exige código de uso único, bloqueia acesso externo e permite rota somente de pedido pago',async()=>{
 const old=global.fetch,db=new Database(),env={UMBRELLA_API_KEY:'admin-test-secret',RESEND_API_KEY:'test-email',ORDER_FROM_EMAIL:'Loja <pedidos@example.com>',ADMIN_EMAIL:'admin@example.com',PAYMENTS_DB:db};let otp='';
 global.fetch=async(url,options)=>{const email=JSON.parse(options.body);otp=email.text.match(/\b\d{6}\b/)[0];return Response.json({id:'admin-mail'});};
 const post=(path,data,cookie)=>new Request('https://loja.example/api/admin'+path,{method:'POST',headers:{Origin:'https://loja.example','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
 try{assert.equal((await worker.default.fetch(new Request('https://loja.example/api/admin/orders'),env)).status,401);
 const login=await(await worker.default.fetch(post('/login/request',{email:env.ADMIN_EMAIL}),env)).json();assert.ok(otp);assert.equal((await worker.default.fetch(post('/login/verify',{challenge:login.challenge,code:'wrong'}),env)).status,401);
 const auth=await worker.default.fetch(post('/login/verify',{challenge:login.challenge,code:otp}),env);assert.equal(auth.status,200);const cookie=auth.headers.get('Set-Cookie');assert.ok(cookie.includes('HttpOnly; Secure; SameSite=Strict'));assert.equal((await worker.default.fetch(post('/login/verify',{challenge:login.challenge,code:otp}),env)).status,401);
 const order=worker.prepareOrder(body());await worker.saveOrder(env,order,{orderId:'route-test',amount:3790,status:'WAITING_PAYMENT',expiresAt:Date.now()+10000,copyPaste:'000201-test'});
 assert.equal((await worker.default.fetch(post('/orders/route-test/route',{stage:3,note:'Coleta confirmada'},cookie),env)).status,409);
 // Não enviar confirmação de pedido neste teste de acesso; testada separadamente.
 delete env.RESEND_API_KEY;await worker.saveOrder(env,order,{orderId:'route-test',amount:3790,status:'PAID',expiresAt:Date.now()+10000,copyPaste:'000201-test'});env.RESEND_API_KEY='test-email';
 assert.equal((await worker.default.fetch(post('/orders/route-test/route',{stage:3,note:'Coleta confirmada',location:'Centro de distribuição',carrier:'Transportadora de teste',mapCity:'Campinas',mapState:'SP',latitude:-22.9056,longitude:-47.0608,carrierConfirmed:true},cookie),env)).status,200);
 const row=db.db.prepare('SELECT * FROM orders WHERE id=?').get('route-test');assert.equal(row.stage,3);const mapped=db.db.prepare('SELECT * FROM order_map_points').get();assert.equal(mapped.city,'Campinas');assert.equal(mapped.latitude,-22.9056);const publicMap=await(await worker.default.fetch(new Request('https://loja.example/api/tracking?code='+row.tracking_code),env)).json();assert.equal(publicMap.events[0].city,'Campinas');assert.equal(publicMap.events[0].source,'manual');assert.equal(db.db.prepare("SELECT COUNT(*) AS n FROM order_events WHERE source='manual'").get().n,1);
 const list=await worker.default.fetch(new Request('https://loja.example/api/admin/orders?status=paid',{headers:{Cookie:cookie}}),env);assert.equal(list.status,200);assert.equal((await list.json()).orders.length,1);
 }finally{global.fetch=old;}
});
test('recupera contatos omitidos na consulta individual sem confiar em dados do webhook',async()=>{
 const old=global.fetch,db=new Database(),env={UMBRELLA_API_KEY:'partial-test',WEBHOOK_SECRET:'partial-webhook',PAYMENTS_DB:db},order=worker.prepareOrder(body());
 const full={...order,id:'partial-customer',status:'WAITING_PAYMENT',customer:{document:order.customer.document,address:order.customer.address},pix:{qrcode:'000201-test'}};
 global.fetch=async url=>Response.json({data:String(url).includes('?limit=100')?{data:[{...full,customer:order.customer}],pages:1}:full});
 try{const response=await worker.default.fetch(new Request('https://loja.example/api/webhook/umbrella/partial-webhook',{method:'POST',body:JSON.stringify({objectId:full.id,customer:{email:'attacker@example.com'}})}),env);assert.equal(response.status,200);const row=db.db.prepare('SELECT * FROM orders').get();assert.ok(row);assert.equal(row.payment_status,'WAITING_PAYMENT');assert.ok(!row.details.includes('attacker'));}finally{global.fetch=old;}
});
