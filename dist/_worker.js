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
  const details = await encryptEmail(env, { customer:{ name:order.customer.name, email:order.customer.email, phone:order.customer.phone || '' }, address:order.shipping?.address || order.customer.address || {}, items:order.items, shippingFee:order.shipping?.fee || 0, copyPaste:payment.copyPaste || '', expiresAt:payment.expiresAt });
  await env.PAYMENTS_DB.prepare('INSERT INTO orders (id,order_code,tracking_code,amount,payment_status,details,created_at,paid_at,stage,estimated_delivery,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount, payment_status=excluded.payment_status, details=excluded.details, paid_at=COALESCE(orders.paid_at,excluded.paid_at), stage=CASE WHEN excluded.payment_status=\'PAID\' AND orders.stage=0 THEN 1 ELSE orders.stage END, estimated_delivery=COALESCE(orders.estimated_delivery,excluded.estimated_delivery), updated_at=excluded.updated_at').bind(payment.orderId,code,randomCode(),payment.amount,payment.status,details,created,paidAt,paid?1:0,paid?new Date(paidAt+15*86400000).toISOString().slice(0,10):null,now).run();
  if (paid) await env.PAYMENTS_DB.prepare("INSERT OR IGNORE INTO order_events (id,order_id,stage,note,location,occurred_at,source) VALUES (?,?,1,'Pagamento confirmado pela UmbrellaPag','',?,'provider')").bind('payment:' + payment.orderId,payment.orderId,paidAt).run();
  const row = await env.PAYMENTS_DB.prepare('SELECT * FROM orders WHERE id = ?').bind(payment.orderId).first();
  if (paid && hasEmail(env)) {
    const email = buildOrderEmail(order, { ...payment, status:'PAID' });
    const link = SITE + '/rastreio?codigo=' + encodeURIComponent(row.tracking_code);
    email.subject = 'Pagamento confirmado — acompanhe seu pedido ' + row.order_code;
    email.text = `Pagamento confirmado!\nPedido: ${row.order_code}\nCódigo de acompanhamento: ${row.tracking_code}\nAcompanhe seu pedido: ${link}\nPrevisão inicial: até 15 dias após a confirmação. As movimentações são atualizadas pela loja após contato com a transportadora.\n\n` + email.text;
    email.html = email.html.replace('<h1 style="font-size:21px">', `<p style="color:#fe2c55;font-weight:bold">${escapeHtml(row.order_code)}</p><h1 style="font-size:21px">`).replace('href="https://loja-exemplo.invalid/"', 'href="' + escapeHtml(link) + '"').replace('Visitar a loja','Acompanhar meu pedido').replace('</h1>', `</h1><p>Código de acompanhamento: <strong>${escapeHtml(row.tracking_code)}</strong></p><p style="font-size:13px">Previsão inicial: até 15 dias após a confirmação. As movimentações são atualizadas pela loja após contato com a transportadora.</p>`);
    await queueEmailMessage(env, 'paid/' + payment.orderId, email).catch(() => 'pending');
  }
  return row;
}
async function syncTransaction(env, data) {
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
  if(url.pathname==='/api/admin/session')return json({email:env.ADMIN_EMAIL});
  if(url.pathname==='/api/admin/logout'&&request.method==='POST'){const response=json({ok:true});response.headers.set('Set-Cookie','gokoco_admin=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return response;}
  if(url.pathname==='/api/admin/orders'&&request.method==='GET'){
    const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page')||'1')||1));
    const filter=url.searchParams.get('status')||'all';
    const where=filter==='paid'?"WHERE payment_status='PAID'":filter==='pending'?"WHERE payment_status IN ('WAITING_PAYMENT','PROCESSING','AUTHORIZED')":'';
    const rows=await env.PAYMENTS_DB.prepare('SELECT * FROM orders '+where+' ORDER BY created_at DESC LIMIT 25 OFFSET ?').bind((page-1)*25).all();
    const result=[];for(const row of rows.results||[]){const details=await decryptEmail(env,row.details);result.push({...row,details:undefined,customer:details.customer,items:details.items,address:details.address});}
    const stats=await env.PAYMENTS_DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN payment_status='PAID' THEN 1 ELSE 0 END) AS paid, SUM(CASE WHEN payment_status IN ('WAITING_PAYMENT','PROCESSING','AUTHORIZED') THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN payment_status='PAID' THEN amount ELSE 0 END) AS revenue FROM orders").first();
    return json({orders:result,stats,page,hasMore:result.length===25});
  }
  if(url.pathname==='/api/admin/sync'&&request.method==='POST'){
    const data=await request.json().catch(()=>({}));const page=Math.max(1,Math.min(100,parseInt(data.page)||1));
    const list=await upstream(env,'/user/transactions?limit=10&page='+page);
    let synced=0;for(const transaction of list.data||[]){if(matchesProduct(transaction)){const full=await upstream(env,'/user/transactions/'+encodeURIComponent(transaction.id));if(await syncTransaction(env,{...full,customer:{...transaction.customer,...full.customer}}))synced++;}}
    return json({synced,page,hasMore:page<Number(list.pages||0)});
  }
  const match=url.pathname.match(/^\/api\/admin\/orders\/([\w-]{1,80})(\/route)?$/);
  if(match){
    const row=await env.PAYMENTS_DB.prepare('SELECT * FROM orders WHERE id=?').bind(match[1]).first();if(!row)return json({message:'Pedido não encontrado.'},404);
    if(match[2]&&request.method==='POST'){
      if(row.payment_status!=='PAID')return json({message:'O pedido ainda não tem pagamento confirmado.'},409);
      const data=await request.json().catch(()=>({}));const stage=Number(data.stage),note=text(data.note,1500),location=text(data.location,120),occurredAt=Date.parse(data.occurredAt||'')||Date.now();
      if(!Number.isInteger(stage)||stage<1||stage>5||!note||occurredAt>Date.now()+300000||occurredAt<(row.paid_at||row.created_at))return json({message:'Confira a etapa, a descrição e a data da movimentação.'},400);
      const estimated=text(data.estimatedDelivery,10);if(estimated&&!/^\d{4}-\d{2}-\d{2}$/.test(estimated))return json({message:'Previsão de entrega inválida.'},400);
      let point;try{point=validateMapPoint(data);}catch(error){return json({message:error.message},400);}
      const eventId=crypto.randomUUID();
      const statements=[env.PAYMENTS_DB.prepare('UPDATE orders SET stage=?,carrier=?,carrier_code=?,estimated_delivery=?,updated_at=? WHERE id=?').bind(stage,text(data.carrier,120),text(data.carrierCode,120),estimated||row.estimated_delivery,Date.now(),row.id),env.PAYMENTS_DB.prepare("INSERT INTO order_events (id,order_id,stage,note,location,occurred_at,source) VALUES (?,?,?,?,?,?,'manual')").bind(eventId,row.id,stage,note,location,occurredAt)];
      if(point)statements.push(env.PAYMENTS_DB.prepare('INSERT INTO order_map_points (event_id,city,state,latitude,longitude) VALUES (?,?,?,?,?)').bind(eventId,point.city,point.state,point.latitude,point.longitude));
      await env.PAYMENTS_DB.batch(statements);
      return json({ok:true});
    }
    const details=await decryptEmail(env,row.details),events=await env.PAYMENTS_DB.prepare('SELECT e.stage,e.note,e.location,e.occurred_at,e.source,p.city,p.state,p.latitude,p.longitude FROM order_events e LEFT JOIN order_map_points p ON p.event_id=e.id WHERE e.order_id=? ORDER BY e.occurred_at DESC,e.rowid DESC').bind(row.id).all();
    return json({order:{...row,details:undefined,...details},events:events.results||[]});
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
    pix: { expiresInDays: 1 }, metadata: JSON.stringify({ productId: PRODUCT, colors, shipping: body.shipping }) };
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
  return {demo:true,orderCode:'PED-DEMONSTRACAO',trackingCode:'TESTE-GOKOCO',paymentStatus:'PAID',amount:3790,customer:{name:'Cliente de demonstração'},address:{city:'Recife',state:'PE'},items:[{title:'Escova Modeladora GOKOCO — preta · Bivolt',quantity:1,unitPrice:3790}],paidAt,stage:3,carrier:'Transportadora fictícia — demonstração',carrierCode:'DEMO-001',estimatedDelivery:new Date(paidAt+15*day).toISOString().slice(0,10),stages:STAGES.map((title,i)=>({title,from:i*3+1,to:(i+1)*3})),events:[{stage:3,note:'Exemplo fictício de coleta confirmada. Nenhuma encomenda real está em transporte.',location:'Campinas / SP',occurred_at:paidAt+5*day,source:'manual',city:'Campinas',state:'SP',latitude:-22.9056,longitude:-47.0608},{stage:2,note:'Exemplo fictício de pedido em preparação.',location:'São Paulo / SP',occurred_at:paidAt+2*day,source:'manual',city:'São Paulo',state:'SP',latitude:-23.5505,longitude:-46.6333},{stage:1,note:'Pagamento simulado exclusivamente para demonstrar o rastreio.',location:'',occurred_at:paidAt,source:'provider',city:null,state:null,latitude:null,longitude:null}]};
}
async function handle(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
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
  if (url.pathname === '/api/tracking' && request.method === 'GET') {
    const code=(url.searchParams.get('code')||'').toUpperCase();
    if(!/^GKC-[A-F0-9]{32}$/.test(code))return json({message:'Confira o código de acompanhamento enviado por e-mail.'},404);
    await orderTables(env);
    const row=await env.PAYMENTS_DB.prepare('SELECT * FROM orders WHERE tracking_code=?').bind(code).first();
    if(!row)return json({message:'Pedido não encontrado. Confira o código enviado por e-mail.'},404);
    const details=await decryptEmail(env,row.details);
    const events=await env.PAYMENTS_DB.prepare('SELECT e.stage,e.note,e.location,e.occurred_at,e.source,p.city,p.state,p.latitude,p.longitude FROM order_events e LEFT JOIN order_map_points p ON p.event_id=e.id WHERE e.order_id=? ORDER BY e.occurred_at DESC,e.rowid DESC').bind(row.id).all();
    return json({orderCode:row.order_code,trackingCode:row.tracking_code,paymentStatus:row.payment_status,amount:row.amount,customer:{name:details.customer.name},address:details.address,items:details.items,paidAt:row.paid_at,stage:row.stage,carrier:row.carrier,carrierCode:row.carrier_code,estimatedDelivery:row.estimated_delivery,stages:STAGES.map((title,i)=>({title,from:i*3+1,to:(i+1)*3})),events:events.results||[]});
  }
  if (url.pathname === '/api/pix' && request.method === 'POST') {
    let body; try { const raw = await request.text(); if (raw.length > 12000) return json({ message: 'Solicitação muito grande.' }, 413); body = JSON.parse(raw); prepareOrder(body); } catch (e) { return json({ message: e.message || 'Confira os dados.' }, 400); }
    if (!/^[a-f0-9-]{36}$/i.test(body.checkoutId || '')) return json({ message: 'Identificador inválido.' }, 400);
    const fingerprint = base64url(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(prepareOrder(body)))));
    const id = body.checkoutId + ':' + fingerprint;
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
    try { const result = await pending; await env.PAYMENTS_DB.prepare("UPDATE payment_attempts SET state = 'ready', result = ? WHERE id = ?").bind(JSON.stringify(result), id).run(); await saveOrder(env,prepareOrder(body),result).catch(()=>null); const emailStatus = await safeOrderEmail(env, prepareOrder(body), result); return json({ ...result, emailStatus }); }
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
