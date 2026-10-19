const{test}=require('node:test'),assert=require('node:assert/strict'),{createFixture}=require('./helpers/store-fixture.cjs');
test('etapas e tentativas enviam notificações uma vez por ciclo e preservam link privado',async()=>{const f=await createFixture();try{
  const before=f.emails.length;
  for(const stage of [1,2,3,4]){const r=await f.advance(stage);assert.equal(r.status,200);assert.equal((await r.json()).emailStatus,'sent');await f.advance(stage);}
  assert.equal(f.emails.length,before+4);
  for(let n=1;n<=3;n++)assert.equal((await(await f.attempt(n)).json()).emailStatus,'sent');
  assert.equal(f.emails.length,before+7);const last=f.emails.at(-1);assert.match(last.subject,/Três tentativas/);assert.ok(last.text.includes(f.row().tracking_code));assert.ok(!last.text.includes('52998224725'));
  const detail=await(await f.request('/api/admin/orders/local-order-1',undefined,true)).json();assert.equal(detail.emails.filter(e=>e.order_id.startsWith('delivery/')).length,4);
}finally{f.restore();}});
test('falha e timeout do e-mail preservam movimentação e nova tentativa mantém idempotência',async()=>{const f=await createFixture();const fakeFetch=global.fetch;try{
  const keys=[];let failures=true;
  global.fetch=async(url,options)=>{if(String(url)==='https://api.resend.com/emails'){keys.push(options.headers['Idempotency-Key']);if(failures)throw Error('timeout simulado');}return fakeFetch(url,options);};
  const result=await f.advance(3);assert.equal(result.status,200);assert.equal((await result.json()).emailStatus,'pending');assert.equal(f.row().stage,3);
  let row=f.database.db.prepare("SELECT * FROM order_emails WHERE order_id LIKE 'delivery/%'").get();assert.equal(row.state,'pending');assert.ok(!row.payload.includes('cliente@example.invalid'));
  await f.worker.retryPendingEmails(f.env);assert.equal(keys.length,1);
  f.database.db.prepare("UPDATE order_emails SET last_attempt=0 WHERE order_id=?").run(row.order_id);failures=false;
  const retry=await f.request('/api/admin/emails/retry',{},true);assert.equal((await retry.json()).results[0].status,'sent');assert.equal(keys[0],keys[1]);
  row=f.database.db.prepare('SELECT * FROM order_emails WHERE order_id=?').get(row.order_id);assert.equal(row.attempts,2);assert.equal(row.payload,null);
  assert.equal((await f.request('/api/admin/emails/retry',{})).status,401);
}finally{f.restore();}});
test('etapa entregue envia e-mail e falhas esgotadas ficam visíveis sem envio infinito',async()=>{const f=await createFixture();try{
  assert.equal((await f.advance(5)).status,200);assert.match(f.emails.at(-1).subject,/Pedido entregue/);assert.equal((await f.advance(5)).status,409);
  f.database.db.prepare("UPDATE order_emails SET state='pending',attempts=5,last_attempt=0 WHERE order_id LIKE 'delivery/%'").run();assert.equal((await f.worker.retryPendingEmails(f.env)).length,0);
}finally{f.restore();}});

test('teste de e-mail exige administrador e usa somente destinatário configurado sem mudar pedidos',async()=>{const f=await createFixture();try{
  const body={testId:crypto.randomUUID(),to:'outra-pessoa@example.invalid'};assert.equal((await f.request('/api/admin/emails/test',body)).status,401);
  const stage=f.row().stage,creates=f.creates;const r=await f.request('/api/admin/emails/test',body,true);assert.equal((await r.json()).emailStatus,'sent');assert.deepEqual(f.emails.at(-1).to,[f.env.ADMIN_EMAIL]);assert.match(f.emails.at(-1).subject,/TESTE/);assert.equal(f.row().stage,stage);assert.equal(f.creates,creates);
  const before=f.emails.length;await f.request('/api/admin/emails/test',body,true);assert.equal(f.emails.length,before);
}finally{f.restore();}});
