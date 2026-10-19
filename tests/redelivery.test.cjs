const{test}=require('node:test'),assert=require('node:assert/strict'),{createFixture}=require('./helpers/store-fixture.cjs');
test('tentativas exigem login, pagamento, transporte, confirmação e sequência',async()=>{const f=await createFixture();try{
  assert.equal((await f.request('/api/admin/orders/local-order-1/attempt',{number:1})).status,401);
  assert.equal((await f.attempt(1)).status,409);await f.advance(4);
  assert.equal((await f.attempt(2)).status,409);assert.equal((await f.attempt(1,{carrierConfirmed:false})).status,400);
  assert.equal((await f.attempt(1)).status,200);assert.equal((await f.attempt(1)).status,409);
  assert.equal((await f.request('/api/admin/orders/local-pending-1/attempt',{number:1},true)).status,409);
}finally{f.restore();}});
test('três falhas permitem cancelar sem estornar ou alterar o pagamento original',async()=>{const f=await createFixture();try{
  await f.failed();const code=f.row().tracking_code;
  let tracking=await(await f.request('/api/tracking?code='+code)).json();assert.equal(tracking.delivery.attempts.length,3);assert.equal(tracking.delivery.status,'failed');assert.equal(tracking.delivery.feeAllowed,true);
  assert.equal((await f.request('/api/redelivery/choice',{code,action:'cancel'})).status,200);tracking=await(await f.request('/api/tracking?code='+code)).json();assert.equal(tracking.delivery.status,'cancel_requested');assert.equal(tracking.paymentStatus,'PAID');assert.equal(f.creates,0);
  assert.equal((await f.request('/api/redelivery/choice',f.redeliveryBody())).status,409);
}finally{f.restore();}});
test('reentrega cobra 1000 no servidor, não duplica Pix e só inicia ciclo após PAID canônico',async()=>{const f=await createFixture();try{
  await f.failed();const original=f.row(),request=f.redeliveryBody();request.amount=1;
  assert.equal((await f.request('/api/redelivery/choice',{...request,consent:false})).status,400);
  const response=await f.request('/api/redelivery/choice',request);assert.equal(response.status,200);const payment=await response.json();assert.equal(payment.amount,1000);
  assert.equal((await f.request('/api/redelivery/choice',request)).status,200);assert.equal(f.creates,1);
  let tracking=await(await f.request('/api/tracking?code='+original.tracking_code)).json();assert.equal(tracking.delivery.cycle,1);assert.equal(tracking.delivery.status,'redelivery_pending');
  const status=await(await f.request('/api/redelivery/status?code='+original.tracking_code)).json();assert.equal(status.payment.paid,false);
  assert.equal((await f.request('/api/redelivery/choice',{code:original.tracking_code,action:'cancel'})).status,409);
  assert.equal((await f.confirmFee()).status,200);assert.equal((await f.confirmFee()).status,200);
  tracking=await(await f.request('/api/tracking?code='+original.tracking_code)).json();assert.equal(tracking.delivery.cycle,2);assert.equal(tracking.stage,1);assert.equal(tracking.delivery.attempts.length,0);assert.equal(tracking.trackingCode,original.tracking_code);assert.equal(tracking.orderCode,original.order_code);assert.equal(tracking.amount,3790);assert.equal(tracking.address.street,'Rua corrigida');assert.equal(tracking.delivery.fees[0].state,'paid');assert.ok(Date.parse(tracking.estimatedDelivery)>=tracking.delivery.cycleStartedAt+14*86400000);
  assert.equal(f.database.db.prepare("SELECT COUNT(*) AS n FROM order_events WHERE source='redelivery'").get().n,1);
  assert.ok(!JSON.stringify(tracking).includes(f.body.customer.document));
  // Canonical original transaction sync must not overwrite the corrected delivery address.
  await f.worker.saveOrder(f.env,f.worker.prepareOrder(f.body),{orderId:'local-order-1',amount:1000,status:'PAID',expiresAt:Date.now()+10000});
  const later=await(await f.request('/api/tracking?code='+original.tracking_code)).json();assert.equal(later.address.street,'Rua corrigida');assert.equal(later.delivery.cycle,2);
}finally{f.restore();}});
test('falha incerta de geração não permite uma segunda transação nem aceita status do cliente',async()=>{const f=await createFixture();try{
  await f.failed();f.failAfterCreate=true;
  assert.equal((await f.request('/api/redelivery/choice',f.redeliveryBody())).status,502);
  assert.equal((await f.request('/api/redelivery/choice',f.redeliveryBody())).status,409);assert.equal(f.creates,1);
  const tracking=await(await f.request('/api/tracking?code='+f.row().tracking_code)).json();assert.equal(tracking.delivery.cycle,1);assert.equal(tracking.delivery.status,'redelivery_pending');
  assert.equal((await f.request('/api/redelivery/choice',{code:f.row().tracking_code,action:'paid'})).status,400);
}finally{f.restore();}});
test('motivo da transportadora não habilita taxa e entrega concluída bloqueia novas tentativas',async()=>{const f=await createFixture();try{
  await f.advance(4);await f.attempt(1);await f.attempt(2);await f.attempt(3,{reason:'carrier',feeAuthorized:true});
  assert.equal((await f.request('/api/redelivery/choice',f.redeliveryBody())).status,409);assert.equal(f.creates,0);
}finally{f.restore();}const g=await createFixture();try{await g.advance(5);assert.equal((await g.attempt(1)).status,409);}finally{g.restore();}});

test('pagamento tardio depois de cancelamento exige revisão e não reinicia a entrega',async()=>{const f=await createFixture();try{
 await f.failed();const request=f.redeliveryBody(),response=await f.request('/api/redelivery/choice',request),payment=await response.json();assert.equal(response.status,200);
 f.transactions.get(payment.orderId).status='EXPIRED';await f.request('/api/redelivery/status?code='+f.row().tracking_code);
 assert.equal((await f.request('/api/redelivery/choice',{code:f.row().tracking_code,action:'cancel'})).status,200);
 assert.equal((await f.confirmFee()).status,200);const data=await(await f.request('/api/tracking?code='+f.row().tracking_code)).json();assert.equal(data.delivery.cycle,1);assert.equal(data.delivery.status,'cancel_requested');assert.equal(data.delivery.fees[0].state,'paid_review');
}finally{f.restore();}});

test('valor ou produto divergentes no provedor não iniciam reentrega',async()=>{const f=await createFixture();try{
 await f.failed();const payment=await(await f.request('/api/redelivery/choice',f.redeliveryBody())).json(),transaction=f.transactions.get(payment.orderId);
 transaction.amount=1;assert.equal((await f.confirmFee()).status,502);let data=await(await f.request('/api/tracking?code='+f.row().tracking_code)).json();assert.equal(data.delivery.cycle,1);
 transaction.amount=1000;transaction.items[0].externalRef='outro-produto';assert.equal((await f.confirmFee()).status,502);data=await(await f.request('/api/tracking?code='+f.row().tracking_code)).json();assert.equal(data.delivery.cycle,1);
}finally{f.restore();}});
