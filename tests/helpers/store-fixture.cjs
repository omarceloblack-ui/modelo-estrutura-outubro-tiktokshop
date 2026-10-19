const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
class Database{
  constructor(){this.db=new DatabaseSync(':memory:');}
  prepare(sql){const db=this.db;return{args:[],bind(...args){this.args=args;return this;},async first(){return db.prepare(sql).get(...this.args)||null;},async all(){return{results:db.prepare(sql).all(...this.args)};},async run(){const r=db.prepare(sql).run(...this.args);return{meta:{changes:Number(r.changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.db.exec('COMMIT');return results;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
async function createFixture(){
  const worker=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.resolve(__dirname,'../../dist/_worker.js'))).toString('base64'));
  const database=new Database(),transactions=new Map(),emails=[];let creates=0,otp='',failAfterCreate=false;
  const env={STORE_MODE:'live',UMBRELLA_API_KEY:'local-fake-key-not-a-credential',WEBHOOK_SECRET:'local-fake-webhook',RESEND_API_KEY:'local-fake-email-key',ORDER_FROM_EMAIL:'Simulação <orders@example.invalid>',ADMIN_EMAIL:'admin@example.invalid',PAYMENTS_DB:database,REDELIVERY_PRODUCT_ID:'redelivery-demo-product',META_ENABLED:'false'};
  const previousFetch=global.fetch;
  global.fetch=async(url,options={})=>{
    url=String(url);
    if(url==='https://api.resend.com/emails'){const email=JSON.parse(options.body);emails.push(email);otp=email.text?.match(/\b\d{6}\b/)?.[0]||otp;return Response.json({id:'email-simulated-'+emails.length});}
    if(url.startsWith('https://viacep.com.br/'))return Response.json({logradouro:'Rua de exemplo',bairro:'Centro',localidade:'Recife',uf:'PE'});
    if(!url.startsWith('https://api-gateway.umbrellapag.com/api/'))throw Error('Serviço externo bloqueado pela simulação: '+url);
    const api=url.slice('https://api-gateway.umbrellapag.com/api'.length);
    if(api==='/user/transactions'&&options.method==='POST'){
      creates++;const order=JSON.parse(options.body),id='local-redelivery-'+creates;
      const transaction={...order,id,status:'WAITING_PAYMENT',createdAt:new Date().toISOString(),pix:{qrcode:'000201SIMULACAOLOCALNAOPAGAR',expirationDate:new Date(Date.now()+3600000).toISOString()}};
      transactions.set(id,transaction);if(failAfterCreate)throw Error('Timeout simulado após criar transação');return Response.json({data:transaction});
    }
    if(api.startsWith('/user/transactions?'))return Response.json({data:{data:[...transactions.values()],pages:1,page:1}});
    const id=decodeURIComponent(api.split('/').pop());if(transactions.has(id))return Response.json({data:transactions.get(id)});
    return Response.json({message:'Transação inexistente na simulação'}, {status:404});
  };
  const body={checkoutId:crypto.randomUUID(),customer:{name:'Cliente de demonstração',email:'cliente@example.invalid',document:'52998224725',phone:'81999999999'},address:{zipCode:'50010000',street:'Rua de exemplo',streetNumber:'123',neighborhood:'Centro',city:'Recife',state:'PE'},colors:[{color:'preta',quantity:1}],shipping:'free'};
  const order=worker.prepareOrder(body),createdAt=new Date(Date.now()-86400000).toISOString();
  await worker.saveOrder(env,order,{orderId:'local-order-1',amount:3790,status:'PAID',paidAt:createdAt,createdAt,expiresAt:Date.now()+3600000,copyPaste:'000201SIMULACAOLOCALNAOPAGAR'});
  await worker.saveOrder(env,order,{orderId:'local-pending-1',amount:3790,status:'WAITING_PAYMENT',createdAt,expiresAt:Date.now()+3600000,copyPaste:'000201SIMULACAOLOCALNAOPAGAR'});
  transactions.set('local-order-1',{...order,id:'local-order-1',status:'PAID',paidAt:createdAt,createdAt});
  transactions.set('local-pending-1',{...order,id:'local-pending-1',status:'WAITING_PAYMENT',createdAt});
  let cookie='';
  async function request(route,data,authenticated=false){return worker.default.fetch(new Request('https://local.example'+route,{method:data?'POST':'GET',headers:{...(data?{Origin:'https://local.example','Content-Type':'application/json'}:{}),...(authenticated?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined}),env);}
  const challenge=await(await request('/api/admin/login/request',{email:env.ADMIN_EMAIL})).json();
  const auth=await request('/api/admin/login/verify',{challenge:challenge.challenge,code:otp});cookie=auth.headers.get('Set-Cookie')?.split(';')[0];if(!cookie)throw Error('Falha no login fictício');
  await request('/api/admin/orders',undefined,true);
  const row=()=>database.db.prepare('SELECT * FROM orders WHERE id=?').get('local-order-1');
  async function advance(stage){return request('/api/admin/orders/local-order-1/route',{stage,note:'SIMULAÇÃO LOCAL — etapa '+stage+' confirmada ficticiamente.',occurredAt:new Date().toISOString(),location:'Recife / PE',carrier:'Transportadora fictícia'},true);}
  async function attempt(number,overrides={}){return request('/api/admin/orders/local-order-1/attempt',{actionId:crypto.randomUUID(),number,reason:'absent',note:'SIMULAÇÃO LOCAL — tentativa '+number+' fictícia, destinatário ausente.',location:'Recife / PE',occurredAt:new Date().toISOString(),carrierConfirmed:true,feeAuthorized:number===3,...overrides},true);}
  async function failed(){await advance(4);for(let n=1;n<=3;n++){const result=await attempt(n);if(!result.ok)throw Error(JSON.stringify(await result.json()));}}
  const redeliveryBody=()=>({code:row().tracking_code,action:'redelivery',document:body.customer.document,phone:body.customer.phone,consent:true,address:{...body.address,street:'Rua corrigida',streetNumber:'456'}});
  async function confirmFee(){const fee=database.db.prepare('SELECT * FROM redelivery_payments WHERE order_id=? ORDER BY cycle DESC').get('local-order-1');if(!fee?.transaction_id)throw Error('Gere o Pix simulado da reentrega primeiro.');const transaction=transactions.get(fee.transaction_id);transaction.status='PAID';transaction.paidAt=new Date().toISOString();return worker.default.fetch(new Request('https://local.example/api/webhook/umbrella/'+env.WEBHOOK_SECRET,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({objectId:transaction.id})}),env);}
  return{worker,env,database,transactions,emails,body,row,request,advance,attempt,failed,redeliveryBody,confirmFee,get cookie(){return cookie;},get creates(){return creates;},set failAfterCreate(value){failAfterCreate=value;},restore(){global.fetch=previousFetch;}};
}
module.exports={createFixture,Database};
