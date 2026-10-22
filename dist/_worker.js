const API = 'https://api-gateway.umbrellapag.com/api';
const PRODUCT = 'produto-exemplo';
const UNIT = 3790;
const SHIPPING = { free: 0, jadlog: 1847, sedex: 3340 };
const encoder = new TextEncoder();
const inflight = new Map();
const limits = new Map();
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const digits = value => String(value || '').replace(/\D/g, '');
const text = (value, max = 160) => String(value || '').trim().slice(0, max);
const money = cents => (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
export function cleanAttribution(value) {
  if (!value || typeof value !== 'object') return null;
  const result={};
  for(const touch of ['first','last']) {
    const data=value[touch];if(!data||typeof data!=='object')continue;
    const clean={};
    for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','fbclid','landingPath','capturedAt'])
      if(typeof data[key]==='string'&&data[key].trim())clean[key]=text(data[key],300);
    if(Object.keys(clean).length)result[touch]=clean;
  }
  return Object.keys(result).length?result:null;
}
function orderAttribution(order) {
  let metadata={};try{metadata=typeof order.metadata==='string'?JSON.parse(order.metadata):order.metadata||{};}catch{}
  return cleanAttribution(order.attribution||metadata.attribution);
}
function metaEnabled(env) {return env.META_ENABLED==='true'&&/^\d+$/.test(env.META_PIXEL_ID||'')&&Boolean(env.META_ACCESS_TOKEN)&&/^v\d+\.\d+$/.test(env.META_GRAPH_VERSION||'')&&env.STORE_MODE==='live';}
async function sha256(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function sendMetaEvent(env, event) {
  if(!metaEnabled(env)||!env.PAYMENTS_DB)return 'disabled';
  await env.PAYMENTS_DB.prepare('CREATE TABLE IF NOT EXISTS meta_events (event_id TEXT PRIMARY KEY, name TEXT NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)').run();
  await env.PAYMENTS_DB.prepare("INSERT OR IGNORE INTO meta_events (event_id,name,state,updated_at) VALUES (?,?,'pending',0)").bind(event.event_id,event.event_name).run();
  const now=Date.now();
  const claimed=await env.PAYMENTS_DB.prepare("UPDATE meta_events SET state='sending',attempts=attempts+1,updated_at=? WHERE event_id=? AND state!='sent' AND attempts<5 AND (state!='sending' OR updated_at<?) AND updated_at<?").bind(now,event.event_id,now-60000,now-10000).run();
  if(!claimed.meta?.changes)return 'already_recorded';
  try{
    const body={data:[event],access_token:env.META_ACCESS_TOKEN};if(env.META_TEST_EVENT_CODE)body.test_event_code=env.META_TEST_EVENT_CODE;
    const response=await fetch('https://graph.facebook.com/'+env.META_GRAPH_VERSION+'/'+env.META_PIXEL_ID+'/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
    const data=await response.json();if(!response.ok||data.events_received!==1)throw Error('Meta unavailable');
    await env.PAYMENTS_DB.prepare("UPDATE meta_events SET state='sent',updated_at=? WHERE event_id=?").bind(Date.now(),event.event_id).run();return 'sent';
  }catch{
    await env.PAYMENTS_DB.prepare("UPDATE meta_events SET state='pending',updated_at=? WHERE event_id=?").bind(Date.now(),event.event_id).run();return 'pending';
  }
}
async function orderMetaEvent(env,row,details,paid){
  if(!metaEnabled(env))return;
  const user={};if(details.customer.email)user.em=[await sha256(details.customer.email.trim().toLowerCase())];
  const phone=digits(details.customer.phone);if(phone)user.ph=[await sha256(phone.length===13&&phone.startsWith('55')?phone:'55'+phone)];
  const names=String(details.customer.name||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(names.length)user.fn=[await sha256(names[0])];
  if(names.length>1)user.ln=[await sha256(names[names.length-1])];
  const address=details.address||{},city=String(address.city||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
  if(city)user.ct=[await sha256(city)];
  if(address.state)user.st=[await sha256(String(address.state).trim().toLowerCase())];
  if(address.zipCode)user.zp=[await sha256(digits(address.zipCode))];
  user.country=[await sha256('br')];
  if(details.marketingContext?.userAgent)user.client_user_agent=details.marketingContext.userAgent;
  if(details.marketingContext?.ip)user.client_ip_address=details.marketingContext.ip;
  if(details.marketingContext?.fbp)user.fbp=details.marketingContext.fbp;
  if(details.marketingContext?.fbc)user.fbc=details.marketingContext.fbc;
  const touch=details.attribution?.last;
  if(!user.fbc&&touch?.fbclid&&Number.isFinite(Date.parse(touch.capturedAt)))user.fbc='fb.1.'+Date.parse(touch.capturedAt)+'.'+touch.fbclid;
  const items=details.items||[];
  await sendMetaEvent(env,{event_name:paid?'Purchase':'PixGerado',event_id:(paid?'purchase:':'pix:')+row.id,event_time:Math.floor((paid?row.paid_at:row.created_at)/1000),action_source:'website',event_source_url:SITE+'/pagamento',user_data:user,custom_data:{currency:'BRL',value:row.amount/100,order_id:row.id,content_type:'product',content_ids:items.map(item=>item.externalRef),num_items:items.reduce((sum,item)=>sum+item.quantity,0),contents:items.map(item=>({id:item.externalRef,quantity:item.quantity,item_price:item.unitPrice/100}))}});
}
export function buildPaidOrderEmail(order,payment,row){
  const link=SITE+'/rastreio?codigo='+encodeURIComponent(row.tracking_code);
  const name=order.customer.name,items=order.items.map(item=>`${item.quantity} × ${item.title} — ${money(item.quantity*item.unitPrice)}`);
  const address=order.shipping?.address||order.customer.address||{};
  const addressLine=[address.street,address.streetNumber,address.complement,address.neighborhood,address.city,address.state,address.zipCode].filter(Boolean).join(', ');
  const textBody=`Parabéns, ${name}! Sua compra foi efetuada com sucesso e o pagamento está confirmado.\nPedido: ${row.order_code}\n${items.join('\n')}\nTotal: ${money(payment.amount)}\nEntrega: ${addressLine}\nCódigo individual de acompanhamento: ${row.tracking_code}\nAcompanhe seu pedido: ${link}\nPrevisão inicial: até 15 dias após a confirmação. Movimentações registradas pela loja após contato com a transportadora.\nLoja de exemplo`;
  const html=`<div style="background:#f5f5f5;padding:24px;font-family:Arial,sans-serif;color:#161823"><div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden"><div style="padding:24px;background:#161823;color:white;font-size:24px;font-weight:bold">Escova Modeladora GOKOCO</div><div style="padding:28px"><p style="color:#059669;font-weight:bold">PAGAMENTO CONFIRMADO</p><h1 style="font-size:25px">Parabéns, ${escapeHtml(name)}!</h1><p>Sua compra foi efetuada com sucesso.</p><p>Pedido <strong>${escapeHtml(row.order_code)}</strong></p><ul>${items.map(item=>'<li style="margin:10px 0">'+escapeHtml(item)+'</li>').join('')}</ul><p style="font-size:21px;font-weight:bold">Total pago: ${escapeHtml(money(payment.amount))}</p><p><strong>Endereço de entrega</strong><br>${escapeHtml(addressLine)}</p><div style="background:#fff0f4;padding:16px;border-radius:10px"><strong>Seu código individual de acompanhamento</strong><p style="word-break:break-all;font-family:monospace">${escapeHtml(row.tracking_code)}</p></div><p>Clique abaixo para acompanhar seu pedido:</p><a href="${escapeHtml(link)}" style="display:inline-block;background:#fe2c55;color:white;text-decoration:none;padding:15px 24px;border-radius:9px;font-weight:bold">Acompanhar meu pedido</a><p style="font-size:12px;color:#71717a;margin-top:22px">Previsão inicial de até 15 dias após a confirmação. As movimentações são registradas pela loja após contato com a transportadora. Este código identifica o acompanhamento da loja; o código da transportadora será informado quando disponível.</p></div></div></div>`;
  return{to:[order.customer.email],subject:'Parabéns! Pagamento confirmado — '+row.order_code,text:textBody,html};
}
export function buildOrderEmail(order, payment) {
  const address = order.shipping?.address || order.customer.address || {};
  const addressLine = [address.street, address.streetNumber, address.complement, address.neighborhood, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
  const paid = payment.status === 'PAID';
  const status = paid ? 'Pagamento confirmado' : 'Pedido recebido — aguardando pagamento';
  const items = order.items.map(item => `${item.quantity} × ${item.title} — ${money(item.unitPrice * item.quantity)}`);
  const expiration = new Date(payment.expiresAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const plain = [`Olá, ${order.customer.name}!`, '', status + '.', `Pedido: ${payment.orderId}`, '', ...items, `Frete: ${money(order.shipping?.fee || 0)}`, `Total: ${money(payment.amount)}`, '', `Entrega: ${addressLine}`, '', paid ? 'Código Pix do pedido (para referência):' : 'Pix copia e cola:', payment.copyPaste, '', `Validade do Pix: ${expiration} (horário de Brasília).`, paid ? 'Seu pagamento foi confirmado pela operadora.' : 'Abra o aplicativo do seu banco, escolha Pix copia e cola e confira o recebedor e o valor. Este e-mail confirma o recebimento do pedido, não o pagamento.', '', 'Loja de exemplo · Escova Modeladora GOKOCO', 'https://loja-exemplo.invalid/'].join('\n');
  const html = `<div style="background:#f5f5f5;padding:24px;font-family:Arial,sans-serif;color:#161823"><div style="max-width:560px;margin:auto;background:white;border-radius:16px;overflow:hidden"><div style="padding:24px;background:#161823;color:white;font-size:22px;font-weight:bold">Loja de exemplo</div><div style="padding:24px"><h1 style="font-size:21px">${escapeHtml(status)}</h1><p>Olá, ${escapeHtml(order.customer.name)}!</p><p style="color:#71717a;font-size:12px">Pedido ${escapeHtml(payment.orderId)}</p><ul>${items.map(item => '<li style="margin:12px 0">' + escapeHtml(item) + '</li>').join('')}</ul><p>Frete: ${escapeHtml(money(order.shipping?.fee || 0))}</p><p style="font-size:20px;font-weight:bold">Total: ${escapeHtml(money(payment.amount))}</p><h2 style="font-size:16px">Endereço de entrega</h2><p>${escapeHtml(addressLine)}</p><h2 style="font-size:16px">${paid ? 'Pix do pedido' : 'Pague com Pix copia e cola'}</h2><p style="font-size:13px">Copie todo o código abaixo e cole na opção Pix do aplicativo do seu banco.</p><div style="padding:14px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;word-break:break-all;font-family:monospace;font-size:12px">${escapeHtml(payment.copyPaste)}</div><p style="font-size:12px;color:#71717a">Validade: ${escapeHtml(expiration)} (Brasília).</p><p style="font-size:13px">${paid ? 'Pagamento confirmado pela operadora.' : '<strong>Aguardando pagamento.</strong> Este e-mail confirma o recebimento do pedido. A confirmação do pagamento ocorre após aprovação pela operadora.'}</p><a href="https://loja-exemplo.invalid/" style="display:inline-block;padding:12px 20px;background:#fe2c55;color:white;border-radius:8px;text-decoration:none">Visitar a loja</a></div></div></div>`;
  return { to: [order.customer.email], subject: 'Seu pedido GOKOCO foi recebido — ' + money(payment.amount), html, text: plain };
}

export function buildDeliveryEmail(row,details,title,note){
  const link=SITE+'/rastreio?codigo='+encodeURIComponent(row.tracking_code);
  const plain=title+'\nPedido: '+row.order_code+'\n'+note+'\nAcompanhe seu pedido: '+link;
  return {to:[details.customer.email],subject:title+' — '+row.order_code,text:plain,html:'<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#172033"><h2>'+escapeHtml(title)+'</h2><p>Olá, '+escapeHtml(details.customer.name)+'.</p><p>'+escapeHtml(note)+'</p><p>Pedido: '+escapeHtml(row.order_code)+'</p><p><a style="display:inline-block;background:#fe2c55;color:white;padding:14px 20px;border-radius:8px;text-decoration:none" href="'+escapeHtml(link)+'">Acompanhar meu pedido</a></p><p>Consulte o histórico e as opções disponíveis no acompanhamento.</p></div>'};
}
async function deliveryMailStatement(env,row,key,title,note,eventId){
  if(!hasEmail(env))return null;
  await emailTable(env);
  const details=await decryptEmail(env,row.details),payload=await encryptEmail(env,buildDeliveryEmail(row,details,title,note));
  return env.PAYMENTS_DB.prepare("INSERT OR IGNORE INTO order_emails (order_id,payload,state,expires_at) SELECT ?,?,'pending',? WHERE EXISTS(SELECT 1 FROM order_events WHERE id=?)").bind(key,payload,Date.now()+86400000,eventId);
}
export async function retryPendingEmails(env){
  if(!hasEmail(env))return [];
  await emailTable(env);
  const pending=await env.PAYMENTS_DB.prepare("SELECT order_id FROM order_emails WHERE state IN ('pending','sending') AND attempts<5 AND last_attempt<? ORDER BY last_attempt LIMIT 10").bind(Date.now()-120000).all();
  const result=[];for(const row of pending.results||[])result.push({id:row.order_id,status:await deliverOrderEmail(env,row.order_id)});return result;
}

const hasEmail = env => Boolean(env.RESEND_API_KEY && env.ORDER_FROM_EMAIL && env.PAYMENTS_DB);
async function emailTable(env) { await env.PAYMENTS_DB.prepare('CREATE TABLE IF NOT EXISTS order_emails (order_id TEXT PRIMARY KEY, payload TEXT, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_attempt INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, provider_id TEXT)').run(); }
async function payloadKey(env) { const hash = await crypto.subtle.digest('SHA-256', encoder.encode('order-email:' + env.UMBRELLA_API_KEY)); return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt','decrypt']); }
async function encryptEmail(env, value) { const iv = crypto.getRandomValues(new Uint8Array(12)); const encrypted = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, await payloadKey(env), encoder.encode(JSON.stringify(value))); return base64url(iv) + '.' + base64url(encrypted); }
async function decryptEmail(env, value) { const [iv, data] = value.split('.'); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name:'AES-GCM', iv:unbase64(iv) }, await payloadKey(env), unbase64(data)))); }
async function queueOrderEmail(env, order, payment) {
  return queueEmailMessage(env, payment.orderId, buildOrderEmail(order, payment));
}
async function queueEmailMessage(env, key, message) {
  if (!hasEmail(env)) return 'not_configured';
  await emailTable(env);
  const payload = await encryptEmail(env, message);
  await env.PAYMENTS_DB.prepare("INSERT OR IGNORE INTO order_emails (order_id, payload, state, expires_at) VALUES (?, ?, 'pending', ?)").bind(key, payload, Date.now() + 86400000).run();
  return deliverOrderEmail(env, key);
}
export async function deliverOrderEmail(env, orderId) {
  if (!hasEmail(env)) return 'not_configured';
  await emailTable(env);
  const row = await env.PAYMENTS_DB.prepare('SELECT * FROM order_emails WHERE order_id = ?').bind(orderId).first();
  if (!row) return 'missing';
  if (row.state === 'sent') return 'sent';
  if (row.expires_at < Date.now()) { await env.PAYMENTS_DB.prepare("UPDATE order_emails SET payload = NULL, state = 'expired' WHERE order_id = ?").bind(orderId).run(); return 'failed'; }
  if (row.attempts >= 5 || row.last_attempt > Date.now() - 60000) return 'pending';
  const claim = await env.PAYMENTS_DB.prepare("UPDATE order_emails SET state = 'sending', attempts = attempts + 1, last_attempt = ? WHERE order_id = ? AND (state = 'pending' OR (state = 'sending' AND last_attempt < ?)) AND last_attempt < ? AND attempts < 5").bind(Date.now(), orderId, Date.now() - 120000, Date.now() - 60000).run();
  if (!claim.meta?.changes) return 'pending';
  try {
    const message = await decryptEmail(env, row.payload);
    const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:'Bearer ' + env.RESEND_API_KEY, 'Content-Type':'application/json', 'Idempotency-Key':'gokoco-order/' + orderId }, body:JSON.stringify({ ...message, from:env.ORDER_FROM_EMAIL }), signal:AbortSignal.timeout(10000) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.id) throw Error('email_provider_error');
    await env.PAYMENTS_DB.prepare("UPDATE order_emails SET state = 'sent', payload = NULL, provider_id = ? WHERE order_id = ?").bind(String(data.id), orderId).run();
    return 'sent';
  } catch { await env.PAYMENTS_DB.prepare("UPDATE order_emails SET state = 'pending' WHERE order_id = ?").bind(orderId).run(); return 'pending'; }
}
async function safeOrderEmail(env, order, payment) { try { return await queueOrderEmail(env, order, payment); } catch { return 'pending'; } }
export const STAGES = ['Pedido confirmado', 'Em preparação', 'Coletado pela transportadora', 'Em transporte', 'Entregue'];
const SITE = 'https://loja-exemplo.invalid';
const schemaReady = new WeakMap();
async function orderTables(env) {
  if (!env.PAYMENTS_DB) throw Error('Banco de pedidos indisponível.');
  if (!schemaReady.has(env.PAYMENTS_DB)) schemaReady.set(env.PAYMENTS_DB, (async () => {
    for (const sql of [
      'CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_code TEXT UNIQUE NOT NULL, tracking_code TEXT UNIQUE NOT NULL, amount INTEGER NOT NULL, payment_status TEXT NOT NULL, details TEXT NOT NULL, created_at INTEGER NOT NULL, paid_at INTEGER, stage INTEGER NOT NULL DEFAULT 0, carrier TEXT NOT NULL DEFAULT \'\', carrier_code TEXT NOT NULL DEFAULT \'\', estimated_delivery TEXT, updated_at INTEGER NOT NULL)',
      'CREATE TABLE IF NOT EXISTS order_events (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, stage INTEGER NOT NULL, note TEXT NOT NULL, location TEXT NOT NULL, occurred_at INTEGER NOT NULL, source TEXT NOT NULL)',
      'CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, occurred_at)',
      'CREATE TABLE IF NOT EXISTS order_map_points (event_id TEXT PRIMARY KEY, city TEXT NOT NULL, state TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL)',
      'CREATE TABLE IF NOT EXISTS admin_challenges (id TEXT PRIMARY KEY, hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)',
      'CREATE TABLE IF NOT EXISTS admin_rate (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)'
    ]) await env.PAYMENTS_DB.prepare(sql).run();
  })().catch(error => { schemaReady.delete(env.PAYMENTS_DB); throw error; }));
  await schemaReady.get(env.PAYMENTS_DB);
}
function randomCode() { return 'GKC-' + crypto.randomUUID().replaceAll('-', '').toUpperCase(); }
function matchesProduct(data) {
  if (data.items?.some(item => String(item.externalRef || '').startsWith(PRODUCT))) return true;
  try { return JSON.parse(data.metadata || '{}').productId === PRODUCT; } catch { return false; }
}
export async function saveOrder(env, order, payment) {
  if (!payment.orderId) return null;
  await orderTables(env);
  const now = Date.now(), paid = payment.status === 'PAID';
  const created = Number.isFinite(Date.parse(payment.createdAt || '')) ? Date.parse(payment.createdAt) : now;
  const paidAt = paid ? (Date.parse(payment.paidAt || '') || now) : null;
  const code = 'PED-' + new Date(created).toISOString().slice(0,10).replaceAll('-','') + '-' + crypto.randomUUID().slice(0,8).toUpperCase();
  const previous=await env.PAYMENTS_DB.prepare('SELECT details FROM orders WHERE id=?').bind(payment.orderId).first();
  const stored=previous?await decryptEmail(env,previous.details):{};
  const detailsObject={customer:{name:stored.customer?.name||order.customer.name,email:stored.customer?.email||order.customer.email,phone:stored.customer?.phone||order.customer.phone||''},address:stored.deliveryAddress||order.shipping?.address||order.customer.address||{},deliveryAddress:stored.deliveryAddress||null,items:order.items,shippingFee:order.shipping?.fee??stored.shippingFee??0,copyPaste:payment.copyPaste||stored.copyPaste||'',expiresAt:payment.expiresAt,attribution:stored.attribution||orderAttribution(order),marketingContext:stored.marketingContext||order.marketingContext||null};
  const details=await encryptEmail(env,detailsObject);
  await env.PAYMENTS_DB.prepare('INSERT INTO orders (id,order_code,tracking_code,amount,payment_status,details,created_at,paid_at,stage,estimated_delivery,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount, payment_status=excluded.payment_status, details=excluded.details, paid_at=COALESCE(orders.paid_at,excluded.paid_at), stage=CASE WHEN excluded.payment_status=\'PAID\' AND orders.stage=0 THEN 1 ELSE orders.stage END, estimated_delivery=COALESCE(orders.estimated_delivery,excluded.estimated_delivery), updated_at=excluded.updated_at').bind(payment.orderId,code,randomCode(),payment.amount,payment.status,details,created,paidAt,paid?1:0,paid?new Date(paidAt+15*86400000).toISOString().slice(0,10):null,now).run();
  if (paid) await env.PAYMENTS_DB.prepare("INSERT OR IGNORE INTO order_events (id,order_id,stage,note,location,occurred_at,source) VALUES (?,?,1,'Pagamento confirmado pela UmbrellaPag','',?,'provider')").bind('payment:' + payment.orderId,payment.orderId,paidAt).run();
  const row = await env.PAYMENTS_DB.prepare('SELECT * FROM orders WHERE id = ?').bind(payment.orderId).first();
  if (paid && hasEmail(env)) {
    const email=buildPaidOrderEmail({...order,customer:detailsObject.customer,items:detailsObject.items,shipping:{address:detailsObject.address,fee:detailsObject.shippingFee}},payment,row);
    await queueEmailMessage(env, 'paid/' + payment.orderId, email).catch(() => 'pending');
  }
  await orderMetaEvent(env,row,detailsObject,paid).catch(()=>null);
  return row;
}
async function syncTransaction(env, data) {
  if(await syncRedeliveryTransaction(env,data))return null;
  if (!matchesProduct(data) || !data.customer || !Array.isArray(data.items)) return null;
  if (!data.customer.name || !data.customer.email) {
    // A consulta individual da Umbrella pode omitir os contatos presentes na listagem.
    let page=1,listed;
    do { const list=await upstream(env,'/user/transactions?limit=100&page='+page);listed=(list.data||[]).find(item=>item.id===data.id);if(listed||page>=Number(list.pages||0))break;page++; } while(page<=20);
    if(!listed?.customer?.name||!listed?.customer?.email)throw Error('Dados do comprador indisponíveis na operadora.');
    data={...listed,...data,customer:{...listed.customer,...data.customer}};
  }
  const pix = data.pix || {};
  return saveOrder(env,data,{orderId:data.id,amount:Number(data.amount),status:String(data.status).toUpperCase(),copyPaste:pix.qrcode || pix.qrCode || pix.copyPaste || pix.payload || pix.code || data.qrCode || '',expiresAt:Date.parse(pix.expirationDate || pix.expiresAt || '') || Date.now()+86400000,createdAt:data.createdAt,paidAt:data.paidAt});
}
async function adminDigest(env, value) { return base64url(await crypto.subtle.sign('HMAC',await keyFor(env.UMBRELLA_API_KEY),encoder.encode('admin:' + value))); }
async function adminSession(request, env) {
  try {
    const cookie = (request.headers.get('Cookie') || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('gokoco_admin='))?.slice(13);
    if (!cookie) return false;
    const [payload,sig,extra] = cookie.split('.');
    if (extra || !await crypto.subtle.verify('HMAC',await keyFor(env.UMBRELLA_API_KEY),unbase64(sig),encoder.encode('admin:' + payload))) return false;
    const data = JSON.parse(new TextDecoder().decode(unbase64(payload)));
    return data.email === String(env.ADMIN_EMAIL || '').toLowerCase() && data.expiresAt > Date.now();
  } catch { return false; }
}
async function rateAdmin(env, key, max, ms) {
  const id=await adminDigest(env,key),now=Date.now();
  await env.PAYMENTS_DB.prepare('INSERT INTO admin_rate (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN admin_rate.reset_at<=? THEN 1 ELSE admin_rate.count+1 END, reset_at=CASE WHEN admin_rate.reset_at<=? THEN excluded.reset_at ELSE admin_rate.reset_at END').bind(id,now+ms,now,now).run();
  const row=await env.PAYMENTS_DB.prepare('SELECT count FROM admin_rate WHERE key=?').bind(id).first();return row.count<=max;
}
async function adminRoutes(request,env,url) {
  await orderTables(env);
  if (!env.ADMIN_EMAIL || !hasEmail(env)) return json({message:'Acesso administrativo ainda não configurado.'},503);
  if (url.pathname === '/api/admin/login/request' && request.method === 'POST') {
    const data=await request.json().catch(()=>({})), email=text(data.email,254).toLowerCase();
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    if (!await rateAdmin(env,'login:'+ip,5,3600000)) return json({message:'Aguarde antes de pedir outro código.'},429);
    const id=crypto.randomUUID();
    if (email!==String(env.ADMIN_EMAIL).toLowerCase()) return json({challenge:id,message:'Se o e-mail estiver autorizado, você receberá um código.'});
    if (!await rateAdmin(env,'admin-mail:'+email,3,600000)) return json({message:'Aguarde alguns minutos para solicitar outro código.'},429);
    const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
    await env.PAYMENTS_DB.prepare('INSERT INTO admin_challenges (id,hash,expires_at) VALUES (?,?,?)').bind(id,await adminDigest(env,id+':'+code),Date.now()+600000).run();
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'admin-login/'+id},body:JSON.stringify({from:env.ORDER_FROM_EMAIL,to:[env.ADMIN_EMAIL],subject:'Seu código de acesso ao painel GOKOCO',text:`Seu código de acesso é ${code}. Ele expira em 10 minutos. Não compartilhe este código. Se você não pediu acesso, ignore este e-mail.`,html:`<div style="font-family:Arial,sans-serif;padding:24px"><h2>Acesso ao painel de pedidos</h2><p>Seu código:</p><p style="font-size:32px;letter-spacing:8px;color:#fe2c55;font-weight:bold">${code}</p><p>Válido por 10 minutos. Não compartilhe este código.</p></div>`}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)return json({message:'Não foi possível enviar o código agora.'},502);
    return json({challenge:id,message:'Se o e-mail estiver autorizado, você receberá um código.'});
  }
  if(url.pathname==='/api/admin/login/verify'&&request.method==='POST'){
    const data=await request.json().catch(()=>({}));
    if(!/^[\w-]{36}$/.test(data.challenge||'')||!/^\d{6}$/.test(data.code||''))return json({message:'Código inválido ou expirado.'},401);
    const row=await env.PAYMENTS_DB.prepare('SELECT * FROM admin_challenges WHERE id=?').bind(data.challenge).first();
    if(!row||row.expires_at<Date.now()||row.attempts>=5)return json({message:'Código inválido ou expirado.'},401);
    await env.PAYMENTS_DB.prepare('UPDATE admin_challenges SET attempts=attempts+1 WHERE id=?').bind(data.challenge).run();
    const consumed=await env.PAYMENTS_DB.prepare('DELETE FROM admin_challenges WHERE id=? AND hash=? AND attempts<=5 AND expires_at>?').bind(data.challenge,await adminDigest(env,data.challenge+':'+data.code),Date.now()).run();
    if(!consumed.meta?.changes)return json({message:'Código inválido ou expirado.'},401);
    const payload=base64url(encoder.encode(JSON.stringify({email:String(env.ADMIN_EMAIL).toLowerCase(),expiresAt:Date.now()+8*3600000})));
    const response=json({ok:true});response.headers.set('Set-Cookie','gokoco_admin='+payload+'.'+await adminDigest(env,payload)+'; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=28800');return response;
  }
  if(!await adminSession(request,env))return json({message:'Faça login para acessar o painel.'},401);
  if(url.pathname==='/api/admin/emails/test'&&request.method==='POST'){
    const input=await request.json().catch(()=>({}));if(!/^[a-f0-9-]{36}$/i.test(input.testId||''))return json({message:'Identificador de teste inválido.'},400);
    if(!await rateAdmin(env,'admin-email-test',3,600000))return json({message:'Aguarde antes de enviar outro teste.'},429);
    const sample={order_code:'TESTE-EMAIL',tracking_code:'TESTE-GOKOCO'};
    const message=buildDeliveryEmail(sample,{customer:{name:'Teste administrativo',email:env.ADMIN_EMAIL}},'TESTE — Pedido em transporte','Esta é uma simulação do e-mail automático de movimentação. Nenhum pedido real foi alterado e nenhuma cobrança foi gerada.');
    const emailStatus=await queueEmailMessage(env,'admin-test/'+input.testId,message);return json({emailStatus});
  }
  if(url.pathname==='/api/admin/emails/retry'&&request.method==='POST')return json({results:await retryPendingEmails(env)});
  if(url.pathname==='/api/admin/orders'&&request.method==='GET')await retryPendingEmails(env);
  if(url.pathname==='/api/admin/session')return json({email:env.ADMIN_EMAIL});
  if(url.pathname==='/api/admin/logout'&&request.method==='POST'){const response=json({ok:true});response.headers.set('Set-Cookie','gokoco_admin=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return response;}
  if(url.pathname==='/api/admin/orders'&&request.method==='GET'){
    const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page')||'1')||1));
    const filter=url.searchParams.get('status')||'all';
    await deliveryTables(env);
    const where=filter==='paid'?"WHERE payment_status='PAID'":filter==='pending'?"WHERE payment_status IN ('WAITING_PAYMENT','PROCESSING','AUTHORIZED')":['cancel_requested','redelivery_pending','failed'].includes(filter)?"WHERE id IN (SELECT order_id FROM delivery_state WHERE status='"+filter+"')":filter==='paid_review'?"WHERE id IN (SELECT order_id FROM redelivery_payments WHERE state='paid_review')":'';
    const rows=await env.PAYMENTS_DB.prepare('SELECT * FROM orders '+where+' ORDER BY created_at DESC LIMIT 25 OFFSET ?').bind((page-1)*25).all();
    const result=[];for(const row of rows.results||[]){const details=await decryptEmail(env,row.details),delivery=await deliveryState(env,row);result.push({...row,details:undefined,customer:details.customer,items:details.items,address:details.address,attribution:details.attribution||null,deliveryStatus:delivery.status,deliveryCycle:delivery.cycle});}
    await deliveryTables(env);
    const fees=await env.PAYMENTS_DB.prepare("SELECT COALESCE(SUM(CASE WHEN state='paid' THEN 1000 ELSE 0 END),0) AS revenue FROM redelivery_payments").first();
    const stats=await env.PAYMENTS_DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN payment_status='PAID' THEN 1 ELSE 0 END) AS paid, SUM(CASE WHEN payment_status IN ('WAITING_PAYMENT','PROCESSING','AUTHORIZED') THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN payment_status='PAID' THEN amount ELSE 0 END) AS revenue FROM orders").first();
    return json({orders:result,stats:{...stats,redeliveryRevenue:fees.revenue},page,hasMore:result.length===25});
  }
  if(url.pathname==='/api/admin/sync'&&request.method==='POST'){
    const data=await request.json().catch(()=>({}));const page=Math.max(1,Math.min(100,parseInt(data.page)||1));
    const list=await upstream(env,'/user/transactions?limit=10&page='+page);
    let synced=0;for(const transaction of list.data||[]){if(matchesProduct(transaction)||env.REDELIVERY_PRODUCT_ID&&transaction.items?.some(item=>item.externalRef===env.REDELIVERY_PRODUCT_ID)){const full=await upstream(env,'/user/transactions/'+encodeURIComponent(transaction.id));if(await syncTransaction(env,{...full,customer:{...transaction.customer,...full.customer}}))synced++;}}
    return json({synced,page,hasMore:page<Number(list.pages||0)});
  }
  const attemptMatch=url.pathname.match(/^\/api\/admin\/orders\/([\w-]{1,80})\/attempt$/);
  if(attemptMatch&&request.method==='POST'){
    const row=await env.PAYMENTS_DB.prepare('SELECT * FROM orders WHERE id=?').bind(attemptMatch[1]).first();
    if(!row)return json({message:'Pedido não encontrado.'},404);
    return recordDeliveryAttempt(env,row,await request.json().catch(()=>({})));
  }
  const match=url.pathname.match(/^\/api\/admin\/orders\/([\w-]{1,80})(\/route)?$/);
  if(match){
    const row=await env.PAYMENTS_DB.prepare('SELECT * FROM orders WHERE id=?').bind(match[1]).first();if(!row)return json({message:'Pedido não encontrado.'},404);
    if(match[2]&&request.method==='POST'){
      if(row.payment_status!=='PAID')return json({message:'O pedido ainda não tem pagamento confirmado.'},409);
      const delivery=await deliveryState(env,row);if(row.stage===5||delivery.status!=='active')return json({message:'Entrega concluída ou com solicitação pendente. Confira o histórico antes de alterar.'},409);
      const data=await request.json().catch(()=>({}));const stage=Number(data.stage),note=text(data.note,1500),location=text(data.location,120),occurredAt=Date.parse(data.occurredAt||'')||Date.now();
      if(!Number.isInteger(stage)||stage<1||stage>5||!note||occurredAt>Date.now()+300000||occurredAt<(row.paid_at||row.created_at))return json({message:'Confira a etapa, a descrição e a data da movimentação.'},400);
      const estimated=text(data.estimatedDelivery,10);if(estimated&&!/^\d{4}-\d{2}-\d{2}$/.test(estimated))return json({message:'Previsão de entrega inválida.'},400);
      let point;try{point=validateMapPoint(data);}catch(error){return json({message:error.message},400);}
      const eventId=crypto.randomUUID(),mutationTime=Date.now();
      const mailKey='delivery/'+row.id+'/'+delivery.cycle+'/'+stage;
      const mail=await deliveryMailStatement(env,row,mailKey,['','Pedido confirmado','Pedido em preparação','Pedido coletado pela transportadora','Pedido em transporte','Pedido entregue'][stage],note,eventId);
      const statements=[env.PAYMENTS_DB.prepare("UPDATE orders SET stage=?,carrier=?,carrier_code=?,estimated_delivery=?,updated_at=? WHERE id=? AND stage<5 AND EXISTS(SELECT 1 FROM delivery_state WHERE order_id=? AND cycle=? AND status='active')").bind(stage,text(data.carrier,120),text(data.carrierCode,120),estimated||row.estimated_delivery,mutationTime,row.id,row.id,delivery.cycle),env.PAYMENTS_DB.prepare("INSERT INTO order_events (id,order_id,stage,note,location,occurred_at,source) SELECT ?,?,?,?,?,?,'manual' WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND updated_at=? AND stage=?)").bind(eventId,row.id,stage,note,location,occurredAt,row.id,mutationTime,stage)];
      if(point)statements.push(env.PAYMENTS_DB.prepare('INSERT INTO order_map_points (event_id,city,state,latitude,longitude) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM order_events WHERE id=?)').bind(eventId,point.city,point.state,point.latitude,point.longitude,eventId));
      if(mail)statements.push(mail);
      const result=await env.PAYMENTS_DB.batch(statements);
      if(!result[0].meta?.changes)return json({message:'O pedido mudou. Atualize o painel.'},409);
      const emailStatus=mail?await deliverOrderEmail(env,mailKey):'not_configured';
      return json({ok:true,emailStatus});
    }
    await emailTable(env);await deliveryTables(env);
    const mails=await env.PAYMENTS_DB.prepare("SELECT order_id,state,attempts,last_attempt,expires_at FROM order_emails WHERE order_id=? OR order_id=? OR order_id LIKE ? OR order_id LIKE ? OR order_id IN (SELECT 'redelivery-paid/'||transaction_id FROM redelivery_payments WHERE order_id=?) ORDER BY last_attempt DESC").bind(row.id,'paid/'+row.id,'delivery/'+row.id+'/%','attempt/'+row.id+'/%',row.id).all();
    const details=await decryptEmail(env,row.details),events=await env.PAYMENTS_DB.prepare('SELECT e.stage,e.note,e.location,e.occurred_at,e.source,p.city,p.state,p.latitude,p.longitude FROM order_events e LEFT JOIN order_map_points p ON p.event_id=e.id WHERE e.order_id=? ORDER BY e.occurred_at DESC,e.rowid DESC').bind(row.id).all();
    return json({order:{...row,details:undefined,...details,delivery:await deliverySummary(env,row)},events:events.results||[],emails:mails.results||[]});
  }
  return json({message:'Não encontrado.'},404);
}
export function validDocument(value) {
  const d = digits(value);
  if (/^(\d)\1+$/.test(d)) return false;
  if (d.length === 11) {
    const check = n => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); return (s * 10 % 11) % 10; };
    return check(9) === +d[9] && check(10) === +d[10];
  }
  if (d.length === 14) {
    const check = n => { const weights = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; const r = weights.reduce((s, w, i) => s + +d[i] * w, 0) % 11; return r < 2 ? 0 : 11 - r; };
    return check(12) === +d[12] && check(13) === +d[13];
  }
  return false;
}
export function validateMapPoint(data) {
  if(!data.mapCity&&!data.mapState&&data.latitude==null&&data.longitude==null)return null;
  const city=text(data.mapCity,120),state=text(data.mapState,2).toUpperCase(),latitude=Number(data.latitude),longitude=Number(data.longitude);
  if(data.carrierConfirmed!==true||!city||!/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(state)||data.latitude===''||data.longitude===''||!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude< -34||latitude>6||longitude< -74||longitude> -28)throw Error('Selecione a cidade/UF e confirme o contato com a transportadora para atualizar o mapa.');
  return {city,state,latitude,longitude};
}
export function prepareOrder(body) {
  const c = body.customer || {}, a = body.address || {};
  if (!validDocument(c.document)) throw Error('Confira o CPF ou CNPJ.');
  if (text(c.name).split(/\s+/).length < 2) throw Error('Informe nome e sobrenome.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text(c.email, 254))) throw Error('Confira o e-mail.');
  if (!/^\d{10,11}$/.test(digits(c.phone))) throw Error('Confira o telefone.');
  if (!/^\d{8}$/.test(digits(a.zipCode)) || !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(text(a.state).toUpperCase())) throw Error('Confira o CEP e a UF.');
  for (const name of ['street', 'streetNumber', 'neighborhood', 'city']) if (!text(a[name])) throw Error('Preencha o endereço de entrega completo.');
  if (!Array.isArray(body.colors) || !body.colors.length || body.colors.length > 3) throw Error('Selecione a cor do produto.');
  const seen = new Set();
  const colors = body.colors.map(c => {
    const color = text(c.color).toLowerCase(), quantity = Number(c.quantity);
    if (!['preta','branca','rosa'].includes(color) || seen.has(color) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw Error('Cor ou quantidade inválida.');
    seen.add(color); return { color, quantity };
  });
  const qty = colors.reduce((s, c) => s + c.quantity, 0);
  if (qty > 30) throw Error('O limite é de 30 unidades por pedido.');
  const effectiveUnit=UNIT;
  if (!Object.hasOwn(SHIPPING, body.shipping)) throw Error('Selecione a entrega.');
  const address = { street: text(a.street), streetNumber: text(a.streetNumber, 30), complement: text(a.complement), neighborhood: text(a.neighborhood), city: text(a.city), state: text(a.state).toUpperCase(), zipCode: digits(a.zipCode), country: 'BR' };
  return { amount: effectiveUnit * qty + SHIPPING[body.shipping], currency: 'BRL', paymentMethod: 'PIX', installments: 1, traceable: true,
    customer: { name: text(c.name), email: text(c.email, 254).toLowerCase(), phone: digits(c.phone), document: { number: digits(c.document), type: digits(c.document).length === 14 ? 'CNPJ' : 'CPF' }, address },
    shipping: { fee: SHIPPING[body.shipping], address },
    items: colors.map(c => ({ title: 'Escova Modeladora GOKOCO — ' + c.color + ' · Bivolt', unitPrice: effectiveUnit, quantity: c.quantity, tangible: true, externalRef: PRODUCT + ':' + c.color })),
    pix: { expiresInDays: 1 }, metadata: JSON.stringify({ productId: PRODUCT, colors, shipping: body.shipping, attribution:cleanAttribution(body.attribution) }) };
}
function base64url(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/, ''); }
function unbase64(value) { const s = value.replace(/-/g,'+').replace(/_/g,'/'); return Uint8Array.from(atob(s + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0)); }
async function keyFor(secret) { return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify']); }
export async function signPayment(data, secret) { const payload = base64url(encoder.encode(JSON.stringify(data))); const sig = await crypto.subtle.sign('HMAC', await keyFor(secret), encoder.encode(payload)); return payload + '.' + base64url(sig); }
export async function verifyPayment(token, secret) {
  try { const [payload, sig, extra] = token.split('.'); if (extra || !sig) return null; if (!await crypto.subtle.verify('HMAC', await keyFor(secret), unbase64(sig), encoder.encode(payload))) return null; const data = JSON.parse(new TextDecoder().decode(unbase64(payload))); return data.expiresAt > Date.now() && /^[\w-]{1,80}$/.test(data.id) && Number.isInteger(data.amount) ? data : null; } catch { return null; }
}
async function upstream(env, endpoint, options = {}) {
  const response = await fetch(API + endpoint, { ...options, headers: { 'x-api-key': env.UMBRELLA_API_KEY, 'User-Agent': 'UMBRELLAB2B/1.0', 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(25000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.data) throw Error('O provedor não concluiu a solicitação. Confira os dados ou entre em contato com a loja.');
  return data.data;
}
async function createPayment(request, env, body) {
  const order = prepareOrder(body);
  if (env.WEBHOOK_SECRET) order.postbackUrl = SITE + '/api/webhook/umbrella/' + env.WEBHOOK_SECRET;
  order.ip = request.headers.get('CF-Connecting-IP') || undefined;
  const data = await upstream(env, '/user/transactions', { method: 'POST', body: JSON.stringify(order) });
  const pix = data.pix || {};
  const copyPaste = pix.qrcode || pix.qrCode || pix.copyPaste || pix.copy_paste || pix.payload || pix.code || data.qrCode;
  if (!data.id || !Number.isInteger(Number(data.amount)) || Number(data.amount) !== order.amount) throw Error('O valor retornado pelo provedor não corresponde ao pedido. Entre em contato com a loja antes de tentar novamente.');
  if (typeof copyPaste !== 'string' || !copyPaste.startsWith('000201') || copyPaste.length > 4096) throw Error(data.status === 'REFUSED' ? 'O provedor recusou a geração do Pix. Entre em contato com a loja.' : 'O provedor não retornou o código Pix. Consulte a loja antes de tentar novamente.');
  const candidate = Date.parse(pix.expirationDate || pix.expiresAt || '');
  const expiresAt = Number.isFinite(candidate) && candidate > Date.now() ? candidate : Date.now() + 86400000;
  const token = await signPayment({ id: data.id, amount: order.amount, expiresAt: expiresAt + 86400000 }, env.UMBRELLA_API_KEY);
  return { copyPaste, token, amount: order.amount, expiresAt, status: data.status, orderId:data.id };
}
export function demoTracking(now=Date.now()) {
  const day=86400000,paidAt=now-6*day;
  return {demo:true,orderCode:'PED-DEMONSTRACAO',trackingCode:'TESTE-GOKOCO',paymentStatus:'PAID',amount:1000,customer:{name:'Cliente de demonstração'},address:{city:'Recife',state:'PE'},items:[{title:'Escova Modeladora GOKOCO — preta · Bivolt',quantity:1,unitPrice:1000}],paidAt,stage:3,carrier:'Transportadora fictícia — demonstração',carrierCode:'DEMO-001',estimatedDelivery:new Date(paidAt+15*day).toISOString().slice(0,10),stages:STAGES.map((title,i)=>({title,from:i*3+1,to:(i+1)*3})),events:[{stage:3,note:'Exemplo fictício de coleta confirmada. Nenhuma encomenda real está em transporte.',location:'Campinas / SP',occurred_at:paidAt+5*day,source:'manual',city:'Campinas',state:'SP',latitude:-22.9056,longitude:-47.0608},{stage:2,note:'Exemplo fictício de pedido em preparação.',location:'São Paulo / SP',occurred_at:paidAt+2*day,source:'manual',city:'São Paulo',state:'SP',latitude:-23.5505,longitude:-46.6333},{stage:1,note:'Pagamento simulado exclusivamente para demonstrar o rastreio.',location:'',occurred_at:paidAt,source:'provider',city:null,state:null,latitude:null,longitude:null}]};
}
const REDELIVERY_AMOUNT=1000;
const REDELIVERY_REASONS={absent:'Destinatário ausente',address:'Endereço incompleto ou incorreto',access:'Acesso ao endereço indisponível',carrier:'Problema da transportadora',other:'Outro motivo confirmado'};
async function deliveryTables(env){
  for(const sql of [
    "CREATE TABLE IF NOT EXISTS delivery_state (order_id TEXT PRIMARY KEY,cycle INTEGER NOT NULL DEFAULT 1,cycle_started_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'active',fee_allowed INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL)",
    'CREATE TABLE IF NOT EXISTS delivery_attempts (id TEXT PRIMARY KEY,order_id TEXT NOT NULL,cycle INTEGER NOT NULL,number INTEGER NOT NULL,reason TEXT NOT NULL,note TEXT NOT NULL,location TEXT NOT NULL,occurred_at INTEGER NOT NULL,UNIQUE(order_id,cycle,number))',
    'CREATE TABLE IF NOT EXISTS redelivery_payments (id TEXT PRIMARY KEY,order_id TEXT NOT NULL,cycle INTEGER NOT NULL,transaction_id TEXT UNIQUE,state TEXT NOT NULL,result TEXT,address TEXT,created_at INTEGER NOT NULL,paid_at INTEGER,UNIQUE(order_id,cycle))'
  ])await env.PAYMENTS_DB.prepare(sql).run();
}
async function deliveryState(env,row){
  await deliveryTables(env);await env.PAYMENTS_DB.prepare("INSERT OR IGNORE INTO delivery_state (order_id,cycle_started_at,updated_at) VALUES (?,?,?)").bind(row.id,row.paid_at||row.created_at,Date.now()).run();
  return env.PAYMENTS_DB.prepare('SELECT * FROM delivery_state WHERE order_id=?').bind(row.id).first();
}
async function deliverySummary(env,row){
  const state=await deliveryState(env,row),attempts=await env.PAYMENTS_DB.prepare('SELECT number,reason,note,location,occurred_at FROM delivery_attempts WHERE order_id=? AND cycle=? ORDER BY number').bind(row.id,state.cycle).all();
  const fees=await env.PAYMENTS_DB.prepare('SELECT id,cycle,state,transaction_id,created_at,paid_at FROM redelivery_payments WHERE order_id=? ORDER BY cycle').bind(row.id).all();
  return {cycle:state.cycle,cycleStartedAt:state.cycle_started_at,status:state.status,feeAllowed:!!state.fee_allowed,feeAmount:REDELIVERY_AMOUNT,attempts:attempts.results||[],fees:fees.results||[]};
}
export async function recordDeliveryAttempt(env,row,data){
  const state=await deliveryState(env,row),number=Number(data.number),date=Date.parse(data.occurredAt||''),id=String(data.actionId||'');
  if(row.payment_status!=='PAID'||row.stage!==4||state.status!=='active')return json({message:'Tentativas exigem pedido pago, em transporte e sem solicitação em aberto.'},409);
  if(!/^[a-f0-9-]{36}$/i.test(id)||!Number.isInteger(number)||number<1||number>3||!REDELIVERY_REASONS[data.reason]||!text(data.note,1500)||!text(data.location,120)||data.carrierConfirmed!==true||!Number.isFinite(date)||date<state.cycle_started_at||date>Date.now()+300000)return json({message:'Preencha data, local, motivo e observação e confirme o contato com a transportadora.'},400);
  const existing=await env.PAYMENTS_DB.prepare('SELECT * FROM delivery_attempts WHERE id=?').bind(id).first();
  if(existing)return existing.order_id===row.id&&existing.cycle===state.cycle?json({ok:true,repeated:true}):json({message:'Identificador inválido.'},409);
  const prior=await env.PAYMENTS_DB.prepare('SELECT MAX(number) AS last,MAX(occurred_at) AS date FROM delivery_attempts WHERE order_id=? AND cycle=?').bind(row.id,state.cycle).first();
  if(number!==Number(prior.last||0)+1||date<Number(prior.date||0))return json({message:'Registre as tentativas na ordem 1, 2 e 3, com datas em sequência.'},409);
  const faults=await env.PAYMENTS_DB.prepare("SELECT COUNT(*) AS n FROM delivery_attempts WHERE order_id=? AND cycle=? AND reason IN ('carrier','other')").bind(row.id,state.cycle).first();
  const feeAllowed=number===3&&data.feeAuthorized===true&&!faults.n&&!['carrier','other'].includes(data.reason);
  const mailKey='attempt/'+row.id+'/'+state.cycle+'/'+number;
  const mail=await deliveryMailStatement(env,row,mailKey,number===3?'Três tentativas de entrega sem sucesso':number+'ª tentativa de entrega sem sucesso',REDELIVERY_REASONS[data.reason]+'. '+text(data.note,1500)+(number===3?' Consulte as opções de atendimento, cancelamento solicitado e eventual reentrega no acompanhamento.':''),'attempt:'+id);
  try{const results=await env.PAYMENTS_DB.batch([
    env.PAYMENTS_DB.prepare("INSERT INTO delivery_attempts (id,order_id,cycle,number,reason,note,location,occurred_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders o JOIN delivery_state d ON d.order_id=o.id WHERE o.id=? AND o.payment_status='PAID' AND o.stage=4 AND d.cycle=? AND d.status='active') AND (SELECT COUNT(*) FROM delivery_attempts WHERE order_id=? AND cycle=?)=?").bind(id,row.id,state.cycle,number,data.reason,text(data.note,1500),text(data.location,120),date,row.id,state.cycle,row.id,state.cycle,number-1),
    env.PAYMENTS_DB.prepare("INSERT INTO order_events (id,order_id,stage,note,location,occurred_at,source) SELECT ?,?,4,?,?,?,'attempt' WHERE EXISTS(SELECT 1 FROM delivery_attempts WHERE id=?)").bind('attempt:'+id,row.id,`Ciclo ${state.cycle} · ${number}ª tentativa sem sucesso — ${REDELIVERY_REASONS[data.reason]}. ${text(data.note,1500)}`,text(data.location,120),date,id),
    env.PAYMENTS_DB.prepare('UPDATE delivery_state SET status=?,fee_allowed=?,updated_at=? WHERE order_id=? AND cycle=? AND EXISTS(SELECT 1 FROM delivery_attempts WHERE id=?)').bind(number===3?'failed':'active',feeAllowed?1:0,Date.now(),row.id,state.cycle,id),...(mail?[mail]:[])
  ]);if(!results[0].meta?.changes)return json({message:'O pedido mudou. Atualize o painel antes de continuar.'},409);}catch{return json({message:'A tentativa já foi registrada ou o pedido mudou. Atualize o painel.'},409);}
  return json({ok:true,emailStatus:mail?await deliverOrderEmail(env,mailKey):'not_configured',delivery:await deliverySummary(env,row)});
}
export async function syncRedeliveryTransaction(env,data){
  await deliveryTables(env);
  let fee=await env.PAYMENTS_DB.prepare('SELECT * FROM redelivery_payments WHERE transaction_id=?').bind(String(data.id||'')).first();
  if(!fee){let metadata;try{metadata=typeof data.metadata==='string'?JSON.parse(data.metadata):data.metadata;}catch{}
    if(metadata?.kind==='redelivery'&&/^[a-f0-9-]{36}$/i.test(metadata.attemptId||'')){
      const candidate=await env.PAYMENTS_DB.prepare('SELECT * FROM redelivery_payments WHERE id=? AND order_id=? AND cycle=?').bind(metadata.attemptId,metadata.orderId,Number(metadata.cycle)).first();
      if(candidate&&!candidate.transaction_id)fee=candidate;
    }
  }
  if(!fee)return null;
  const product=env.REDELIVERY_PRODUCT_ID;
  if(Number(data.amount)!==REDELIVERY_AMOUNT||data.paymentMethod&&data.paymentMethod!=='PIX'||!data.items?.some(item=>item.externalRef===product))throw Error('Pagamento de reentrega incompatível.');
  await env.PAYMENTS_DB.prepare('UPDATE redelivery_payments SET transaction_id=COALESCE(transaction_id,?) WHERE id=?').bind(data.id,fee.id).run();
  if(fee.state==='paid'||fee.state==='paid_review'){if(fee.state==='paid')await deliverOrderEmail(env,'redelivery-paid/'+data.id).catch(()=>null);return {handled:true,paid:true,review:fee.state==='paid_review'};}
  if(data.status!=='PAID'){
    if(['REFUSED','CANCELED','CANCELLED','EXPIRED'].includes(data.status)){
      await env.PAYMENTS_DB.batch([
        env.PAYMENTS_DB.prepare('UPDATE redelivery_payments SET state=? WHERE id=? AND state NOT IN (\'paid\',\'paid_review\')').bind('closed',fee.id),
        env.PAYMENTS_DB.prepare("UPDATE delivery_state SET status='failed',updated_at=? WHERE order_id=? AND cycle=? AND status='redelivery_pending'").bind(Date.now(),fee.order_id,fee.cycle)
      ]);
    }
    return {handled:true,paid:false};
  }
  const row=await env.PAYMENTS_DB.prepare('SELECT * FROM orders WHERE id=?').bind(fee.order_id).first(),state=await deliveryState(env,row);
  if(state.cycle!==fee.cycle||!['failed','redelivery_pending'].includes(state.status)){
    await env.PAYMENTS_DB.prepare("UPDATE redelivery_payments SET state='paid_review',paid_at=? WHERE id=? AND state!='paid'").bind(Date.now(),fee.id).run();return {handled:true,paid:true,review:true};
  }
  const paidAt=Date.parse(data.paidAt||'')||Date.now(),details=await decryptEmail(env,row.details),address=await decryptEmail(env,fee.address);
  details.address=address;details.deliveryAddress=address;
  const encrypted=await encryptEmail(env,details),estimated=new Date(paidAt+15*86400000).toISOString().slice(0,10);
  const mailKey='redelivery-paid/'+data.id;
  const mail=await deliveryMailStatement(env,row,mailKey,'Reentrega confirmada',`Sua taxa de reentrega de R$ 10,00 foi confirmada. O ciclo ${fee.cycle+1} começou com nova previsão de até 15 dias.`,'redelivery:'+data.id);
  // Conditional writes and the unique payment event keep repeated webhooks idempotent.
  await env.PAYMENTS_DB.batch([
    env.PAYMENTS_DB.prepare("UPDATE orders SET stage=1,details=?,estimated_delivery=?,carrier_code='',updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM delivery_state WHERE order_id=? AND cycle=? AND status IN ('failed','redelivery_pending')) AND EXISTS(SELECT 1 FROM redelivery_payments WHERE id=? AND state NOT IN ('paid','paid_review'))").bind(encrypted,estimated,Date.now(),row.id,row.id,fee.cycle,fee.id),
    env.PAYMENTS_DB.prepare("UPDATE delivery_state SET cycle=cycle+1,cycle_started_at=?,status='active',fee_allowed=0,updated_at=? WHERE order_id=? AND cycle=? AND status IN ('failed','redelivery_pending') AND EXISTS(SELECT 1 FROM redelivery_payments WHERE id=? AND state NOT IN ('paid','paid_review'))").bind(paidAt,Date.now(),row.id,fee.cycle,fee.id),
    env.PAYMENTS_DB.prepare("INSERT OR IGNORE INTO order_events (id,order_id,stage,note,location,occurred_at,source) SELECT ?,?,1,?,'',?,'redelivery' WHERE EXISTS(SELECT 1 FROM delivery_state WHERE order_id=? AND cycle=? AND status='active')").bind('redelivery:'+data.id,row.id,`Reentrega paga — ciclo ${fee.cycle+1} iniciado. Nova previsão de até 15 dias.`,paidAt,row.id,fee.cycle+1),
    env.PAYMENTS_DB.prepare("UPDATE redelivery_payments SET state=CASE WHEN EXISTS(SELECT 1 FROM delivery_state WHERE order_id=? AND cycle=? AND status='active') THEN 'paid' ELSE 'paid_review' END,paid_at=? WHERE id=? AND state NOT IN ('paid','paid_review')").bind(row.id,fee.cycle+1,paidAt,fee.id),...(mail?[mail]:[])
  ]);
  const applied=await env.PAYMENTS_DB.prepare('SELECT state FROM redelivery_payments WHERE id=?').bind(fee.id).first();
  if(applied.state==='paid_review')return {handled:true,paid:true,review:true};
  if(mail)await deliverOrderEmail(env,mailKey).catch(()=>null);
  return {handled:true,paid:true,cycle:fee.cycle+1};
}
async function publicDeliveryRow(env,code){
  if(!/^GKC-[A-F0-9]{32}$/.test(String(code||'')))return null;
  await orderTables(env);return env.PAYMENTS_DB.prepare('SELECT * FROM orders WHERE tracking_code=?').bind(code).first();
}
async function redeliveryRoutes(request,env,url){
  const body=request.method==='POST'?await request.json().catch(()=>({})):{};
  const code=String(body.code||url.searchParams.get('code')||'').toUpperCase(),row=await publicDeliveryRow(env,code);
  if(!row)return json({message:'Confira o código privado de acompanhamento.'},404);
  if(row.payment_status!=='PAID')return json({message:'Este pedido ainda não tem pagamento confirmado.'},409);
  let state=await deliveryState(env,row),fee=await env.PAYMENTS_DB.prepare('SELECT * FROM redelivery_payments WHERE order_id=? AND cycle=?').bind(row.id,state.cycle).first();
  if(url.pathname==='/api/redelivery/status'&&request.method==='GET'){
    if(!fee)return json({delivery:await deliverySummary(env,row),payment:null});
    if(fee.transaction_id&&!['paid','paid_review','closed'].includes(fee.state))await syncRedeliveryTransaction(env,await upstream(env,'/user/transactions/'+encodeURIComponent(fee.transaction_id)));
    fee=await env.PAYMENTS_DB.prepare('SELECT * FROM redelivery_payments WHERE id=?').bind(fee.id).first();
    const payment=fee.result?await decryptEmail(env,fee.result):null;
    return json({delivery:await deliverySummary(env,row),payment:payment?{...payment,paid:fee.state==='paid',review:fee.state==='paid_review',closed:fee.state==='closed'}:null});
  }
  if(request.method!=='POST')return json({message:'Não encontrado.'},404);
  if(!['failed','redelivery_pending'].includes(state.status))return json({message:'Esta opção não está disponível neste momento.'},409);
  if(body.action==='cancel'){
    if(fee&&['creating','uncertain','ready'].includes(fee.state))return json({message:'Há uma solicitação de Pix em andamento. Confira o pagamento com a loja antes de solicitar cancelamento.'},409);
    const changed=await env.PAYMENTS_DB.prepare("UPDATE delivery_state SET status='cancel_requested',updated_at=? WHERE order_id=? AND cycle=? AND status='failed'").bind(Date.now(),row.id,state.cycle).run();
    if(changed.meta?.changes)await env.PAYMENTS_DB.prepare("INSERT INTO order_events (id,order_id,stage,note,location,occurred_at,source) VALUES (?,?,?,'Cliente solicitou cancelamento. A loja analisará a solicitação e o eventual reembolso.','',?,'customer')").bind(crypto.randomUUID(),row.id,row.stage,Date.now()).run();
    return json({ok:true,message:'Solicitação de cancelamento enviada à loja. Isso não confirma estorno automático.'});
  }
  if(body.action!=='redelivery')return json({message:'Escolha uma opção válida.'},400);
  if(!state.fee_allowed)return json({message:'Entre em contato com a loja para resolver esta entrega sem cobrança automática.'},409);
  if(fee){
    if(fee.state==='ready'&&fee.result)return json({...await decryptEmail(env,fee.result),repeated:true});
    return json({message:'Esta taxa já foi solicitada. Acompanhe o status ou fale com a loja; nenhum segundo Pix será criado.'},409);
  }
  if(body.consent!==true)return json({message:'Confirme a taxa opcional de R$ 10,00 e o novo prazo estimado.'},400);
  if(!env.REDELIVERY_PRODUCT_ID)return json({message:'A reentrega ainda não está configurada.'},503);
  const details=await decryptEmail(env,row.details);let validated;
  try{validated=prepareOrder({customer:{...details.customer,document:body.document,phone:details.customer.phone||body.phone},address:body.address,colors:[{color:'preta',quantity:1}],shipping:'free'});}catch(error){return json({message:error.message},400);}
  const id=crypto.randomUUID(),encryptedAddress=await encryptEmail(env,validated.shipping.address);
  try{
    const results=await env.PAYMENTS_DB.batch([
      env.PAYMENTS_DB.prepare("INSERT INTO redelivery_payments (id,order_id,cycle,state,address,created_at) SELECT ?,?,?,'creating',?,? WHERE EXISTS(SELECT 1 FROM delivery_state WHERE order_id=? AND cycle=? AND status='failed' AND fee_allowed=1)").bind(id,row.id,state.cycle,encryptedAddress,Date.now(),row.id,state.cycle),
      env.PAYMENTS_DB.prepare("UPDATE delivery_state SET status='redelivery_pending',updated_at=? WHERE order_id=? AND cycle=? AND status='failed' AND EXISTS(SELECT 1 FROM redelivery_payments WHERE id=?)").bind(Date.now(),row.id,state.cycle,id)
    ]);
    if(!results[0].meta?.changes||!results[1].meta?.changes)return json({message:'O pedido mudou. Atualize o rastreio antes de continuar.'},409);
  }catch{return json({message:'Outra solicitação já está em andamento. Atualize o rastreio.'},409);}
  const order={amount:REDELIVERY_AMOUNT,currency:'BRL',paymentMethod:'PIX',installments:1,traceable:true,customer:validated.customer,shipping:{fee:0,address:validated.shipping.address},items:[{title:'Taxa de reentrega',unitPrice:REDELIVERY_AMOUNT,quantity:1,tangible:false,externalRef:env.REDELIVERY_PRODUCT_ID}],pix:{expiresInDays:1},metadata:JSON.stringify({kind:'redelivery',attemptId:id,orderId:row.id,cycle:state.cycle}),ip:request.headers.get('CF-Connecting-IP')||undefined};
  if(env.WEBHOOK_SECRET)order.postbackUrl=SITE+'/api/webhook/umbrella/'+env.WEBHOOK_SECRET;
  try{
    const data=await upstream(env,'/user/transactions',{method:'POST',body:JSON.stringify(order)}),pix=data.pix||{},copyPaste=pix.qrcode||pix.qrCode||pix.copyPaste||pix.copy_paste||pix.payload||pix.code||data.qrCode;
    if(!data.id||Number(data.amount)!==REDELIVERY_AMOUNT||typeof copyPaste!=='string'||!copyPaste.startsWith('000201')||copyPaste.length>4096)throw Error('Resposta de pagamento inválida');
    const expiresAt=Date.parse(pix.expirationDate||pix.expiresAt||'')||Date.now()+86400000,payment={orderId:data.id,amount:REDELIVERY_AMOUNT,copyPaste,expiresAt,status:data.status};
    await env.PAYMENTS_DB.prepare("UPDATE redelivery_payments SET transaction_id=?,state='ready',result=? WHERE id=? AND state='creating'").bind(data.id,await encryptEmail(env,payment),id).run();
    if(hasEmail(env))await safeOrderEmail(env,order,payment).catch(()=>null);
    if(data.status==='PAID')await syncRedeliveryTransaction(env,data);
    return json(payment);
  }catch{
    await env.PAYMENTS_DB.prepare("UPDATE redelivery_payments SET state='uncertain' WHERE id=? AND state='creating'").bind(id).run();
    return json({message:'A geração está em verificação. Não tente pagar novamente. Entre em contato com a loja para conferir.'},502);
  }
}

async function handle(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if(url.pathname==='/api/marketing/config'&&request.method==='GET')return json({enabled:metaEnabled(env),pixelId:metaEnabled(env)?env.META_PIXEL_ID:null});
  if(url.pathname==='/api/marketing/checkout'&&request.method==='POST'){
    if(!metaEnabled(env))return json({status:'disabled'});
    if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({message:'Solicitação inválida.'},403);
    const raw=await request.text();if(raw.length>200)return json({message:'Solicitação inválida.'},413);
    let input;try{input=JSON.parse(raw);}catch{return json({message:'Solicitação inválida.'},400);}
    if(!/^[a-f0-9-]{36}$/i.test(input.eventId||''))return json({message:'Solicitação inválida.'},400);
    const ip=request.headers.get('CF-Connecting-IP')||'unknown',key='meta:'+ip,rate=limits.get(key),now=Date.now();
    if(rate?.until>now&&rate.count>=20)return json({message:'Aguarde.'},429);
    limits.set(key,{count:rate?.until>now?rate.count+1:1,until:rate?.until>now?rate.until:now+600000});
    const user={client_user_agent:request.headers.get('User-Agent')||''};if(ip!=='unknown')user.client_ip_address=ip;
    const status=await sendMetaEvent(env,{event_name:'InitiateCheckout',event_id:input.eventId,event_time:Math.floor(now/1000),action_source:'website',event_source_url:SITE+'/pagamento',user_data:user}).catch(()=>'pending');return json({status});
  }
  if(url.pathname==='/api/location' && request.method==='GET') {
    const city=request.cf?.country==='BR' && typeof request.cf?.city==='string' ? request.cf.city.trim().slice(0,100) : null;
    const response=json({city:city || null});response.headers.set('Cache-Control','private, no-store');return response;
  }
  if (url.pathname.startsWith('/api/cep/') && request.method === 'GET') {
    const cep = url.pathname.slice('/api/cep/'.length);
    if (!/^\d{8}$/.test(cep)) return json({ message: 'Informe um CEP com 8 dígitos.' }, 400);
    try {
      const response = await fetch('https://viacep.com.br/ws/' + cep + '/json/', { signal: AbortSignal.timeout(8000), cf: { cacheTtl: 86400, cacheEverything: true } });
      if (!response.ok) return json({ message: 'Não foi possível consultar o CEP. Preencha o endereço manualmente.' }, 502);
      const data = await response.json();
      if (data.erro) return json({ message: 'CEP não encontrado. Confira os números ou preencha manualmente.' }, 404);
      return json({ cep, street: text(data.logradouro), neighborhood: text(data.bairro), city: text(data.localidade), state: text(data.uf, 2) });
    } catch { return json({ message: 'Consulta de CEP indisponível. Você pode preencher o endereço manualmente.' }, 502); }
  }
  if(url.pathname==='/api/tracking'&&request.method==='GET'&&(url.searchParams.get('code')||'').trim().toUpperCase()==='TESTE-GOKOCO')return json(demoTracking());
  if(env.STORE_MODE!=='live')return json({message:'Esta matriz está em modo demonstração. Configure uma nova loja antes de ativar os pagamentos.'},503);
  if (!env.UMBRELLA_API_KEY) return json({ message: 'Pagamento temporariamente indisponível.' }, 503);
  if (url.pathname.startsWith('/api/webhook/umbrella/')) {
    if (request.method !== 'POST' || !env.WEBHOOK_SECRET || url.pathname !== '/api/webhook/umbrella/' + env.WEBHOOK_SECRET) return json({message:'Não encontrado.'},404);
    const raw=await request.text();if(raw.length>24000)return json({message:'Solicitação muito grande.'},413);
    let body;try{body=JSON.parse(raw);}catch{return json({message:'Solicitação inválida.'},400);}
    const id=String(body.objectId||body.data?.id||'');if(!/^[\w-]{1,80}$/.test(id))return json({message:'Identificador inválido.'},400);
    try { const data=await upstream(env,'/user/transactions/'+encodeURIComponent(id));await syncTransaction(env,data);return json({ok:true}); }
    catch{return json({message:'Não foi possível confirmar o pedido.'},502);}
  }
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== url.origin || !request.headers.get('Content-Type')?.startsWith('application/json')) return json({ message: 'Solicitação inválida.' }, 403);
    if (Number(request.headers.get('Content-Length') || 0) > 12000) return json({ message: 'Solicitação muito grande.' }, 413);
  }
  if (url.pathname.startsWith('/api/admin/')) return adminRoutes(request,env,url);
  if(url.pathname.startsWith('/api/redelivery/'))return redeliveryRoutes(request,env,url);
  if (url.pathname === '/api/tracking' && request.method === 'GET') {
    const code=(url.searchParams.get('code')||'').toUpperCase();
    if(!/^GKC-[A-F0-9]{32}$/.test(code))return json({message:'Confira o código de acompanhamento enviado por e-mail.'},404);
    await orderTables(env);
    const row=await env.PAYMENTS_DB.prepare('SELECT * FROM orders WHERE tracking_code=?').bind(code).first();
    if(!row)return json({message:'Pedido não encontrado. Confira o código enviado por e-mail.'},404);
    const details=await decryptEmail(env,row.details);
    const events=await env.PAYMENTS_DB.prepare('SELECT e.stage,e.note,e.location,e.occurred_at,e.source,p.city,p.state,p.latitude,p.longitude FROM order_events e LEFT JOIN order_map_points p ON p.event_id=e.id WHERE e.order_id=? ORDER BY e.occurred_at DESC,e.rowid DESC').bind(row.id).all();
    return json({orderCode:row.order_code,trackingCode:row.tracking_code,paymentStatus:row.payment_status,amount:row.amount,customer:{name:details.customer.name},address:details.address,items:details.items,paidAt:row.paid_at,stage:row.stage,carrier:row.carrier,carrierCode:row.carrier_code,estimatedDelivery:row.estimated_delivery,stages:STAGES.map((title,i)=>({title,from:i*3+1,to:(i+1)*3})),delivery:await deliverySummary(env,row),events:events.results||[]});
  }
  if (url.pathname === '/api/pix' && request.method === 'POST') {
    let body; try { const raw = await request.text(); if (raw.length > 12000) return json({ message: 'Solicitação muito grande.' }, 413); body = JSON.parse(raw); prepareOrder(body); } catch (e) { return json({ message: e.message || 'Confira os dados.' }, 400); }
    if (!/^[a-f0-9-]{36}$/i.test(body.checkoutId || '')) return json({ message: 'Identificador inválido.' }, 400);
    const fingerprint = base64url(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(prepareOrder(body)))));
    const id = body.checkoutId + ':' + fingerprint;
    const marketingContext=metaEnabled(env)?{userAgent:text(request.headers.get('User-Agent'),500),ip:text(request.headers.get('CF-Connecting-IP'),100)}:null;
    if(marketingContext)for(const key of ['fbp','fbc']){const value=body.marketingCookies?.[key];if(typeof value==='string'&&/^fb\.\d+\.\d+\.[A-Za-z0-9_.-]+$/.test(value))marketingContext[key]=value.slice(0,300);}
    if (!env.PAYMENTS_DB) return json({ message: 'Pagamento temporariamente indisponível.' }, 503);
    await orderTables(env);
    await env.PAYMENTS_DB.prepare('CREATE TABLE IF NOT EXISTS payment_attempts (id TEXT PRIMARY KEY, state TEXT NOT NULL, result TEXT, expires_at INTEGER NOT NULL)').run();
    const cached = await env.PAYMENTS_DB.prepare('SELECT state, result, expires_at FROM payment_attempts WHERE id = ?').bind(id).first();
    if (cached) {
      if (cached.state === 'ready' && cached.result) { const payment = JSON.parse(cached.result); const exists=await env.PAYMENTS_DB.prepare('SELECT id FROM orders WHERE id=?').bind(payment.orderId).first();if(!exists)await saveOrder(env,prepareOrder(body),payment); const emailStatus = await safeOrderEmail(env, prepareOrder(body), payment); return json({ ...payment, emailStatus }); }
      return json({ message: 'Este Pix já foi solicitado e está sendo verificado. Aguarde antes de tentar novamente; consulte a loja se o código não aparecer.' }, 409);
    }
    if (inflight.has(id)) return json({ message: 'O Pix já está sendo gerado. Aguarde.' }, 409);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rate = limits.get(ip); if (rate?.until > Date.now() && rate.count >= 5) return json({ message: 'Aguarde alguns minutos antes de gerar outro Pix.' }, 429);
    if (!rate || rate.until < Date.now()) limits.set(ip, { count: 1, until: Date.now() + 600000 }); else rate.count++;
    if (limits.size > 2000) for (const [key, value] of limits) if (value.until < Date.now()) limits.delete(key);
    const inserted = await env.PAYMENTS_DB.prepare("INSERT OR IGNORE INTO payment_attempts (id, state, expires_at) VALUES (?, 'pending', ?)").bind(id, Date.now() + 172800000).run();
    if (!inserted.meta?.changes) return json({ message: 'Este Pix já foi solicitado. Aguarde a geração.' }, 409);
    const pending = createPayment(request, env, body);
    inflight.set(id, pending);
    try { const result = await pending; await env.PAYMENTS_DB.prepare("UPDATE payment_attempts SET state = 'ready', result = ? WHERE id = ?").bind(JSON.stringify(result), id).run(); await saveOrder(env,{...prepareOrder(body),marketingContext},result).catch(()=>null); const emailStatus = await safeOrderEmail(env, prepareOrder(body), result); return json({ ...result, emailStatus }); }
    catch (e) { await env.PAYMENTS_DB.prepare("UPDATE payment_attempts SET state = 'uncertain' WHERE id = ?").bind(id).run(); return json({ message: e.message || 'Não foi possível gerar o Pix. Não houve confirmação de pagamento.' }, 502); }
    finally { inflight.delete(id); }
  }
  if (url.pathname === '/api/pix/status' && request.method === 'GET') {
    const payment = await verifyPayment(url.searchParams.get('token') || '', env.UMBRELLA_API_KEY);
    if (!payment) return json({ message: 'Consulta inválida ou expirada.' }, 403);
    try {
      const data = await upstream(env, '/user/transactions/' + payment.id);
      if (Number(data.amount) !== payment.amount) return json({ message: 'Pedido inválido.' }, 409);
      const storedOrder=await syncTransaction(env,data);
      let emailStatus = 'not_configured';
      if (hasEmail(env)) {
        emailStatus = await deliverOrderEmail(env, payment.id).catch(() => 'pending');
        if (emailStatus === 'missing' && storedOrder) {
          const saved=await decryptEmail(env,storedOrder.details);
          const pix = data.pix || {};
          const copyPaste = pix.qrcode || pix.qrCode || pix.copyPaste || pix.copy_paste || pix.payload || pix.code || data.qrCode;
          if (typeof copyPaste === 'string' && copyPaste.startsWith('000201')) emailStatus = await safeOrderEmail(env, {...data,customer:saved.customer,shipping:{fee:saved.shippingFee,address:saved.address}}, { orderId:payment.id, amount:payment.amount, copyPaste, status:data.status, expiresAt:Date.parse(pix.expirationDate || pix.expiresAt || '') || payment.expiresAt - 86400000 });
        }
      }
      return json({ status: data.status, amount: payment.amount, paid: String(data.status).toUpperCase() === 'PAID', emailStatus });
    }
    catch { return json({ message: 'Não foi possível consultar o pagamento agora.' }, 502); }
  }
  return json({ message: 'Não encontrado.' }, 404);
}
export default { async fetch(request, env) { try { return await handle(request, env); } catch { return json({ message: 'Pagamento temporariamente indisponível. Tente consultar novamente mais tarde.' }, 503); } } };
