const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let worker,map;
before(async()=>{worker=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('dist/_worker.js')).toString('base64'));const original=worker.default.fetch;worker.default.fetch=(request,env)=>original(request,{STORE_MODE:'live',...env});const context={window:{},fetch:()=>{throw Error('Não deve consultar serviços externos neste teste.');}};vm.runInNewContext(fs.readFileSync('dist/js/delivery-map.js','utf8'),context);map=context.window.DeliveryMap;});
test('posição no mapa exige confirmação explícita e coordenadas brasileiras válidas',()=>{
 const point={mapCity:'Campinas',mapState:'SP',latitude:-22.9056,longitude:-47.0608,carrierConfirmed:true};assert.equal(worker.validateMapPoint(point).city,'Campinas');
 for(const invalid of [{carrierConfirmed:false},{latitude:NaN},{longitude:120},{mapState:'XX'},{mapCity:''},{latitude:''}])assert.throws(()=>worker.validateMapPoint({...point,...invalid}));
 assert.equal(worker.validateMapPoint({}),null);
});
test('agenda prevê cinco contatos em 15 dias e exclui confirmação automática do pagamento',()=>{
 const paid=Date.UTC(2026,9,18),events=[{source:'provider',occurred_at:paid},{source:'manual',occurred_at:paid+86400000}];
 const slots=map.schedule(paid,events,paid+16*86400000);assert.equal(slots.length,5);assert.equal(slots[0].done,true);assert.equal(slots[4].done,false);assert.equal(slots[4].dueAt,paid+15*86400000);assert.equal(slots[4].overdue,true);
 assert.equal(map.schedule(null,[],Date.now())[0].overdue,false);
});
test('mapa usa apenas pontos manuais com coordenadas; passagem do tempo não inventa posições',()=>{
 const events=[{source:'manual',latitude:-19.9,longitude:-43.9,occurred_at:200},{source:'manual',latitude:null,longitude:null,occurred_at:150},{source:'manual',latitude:-22.9,longitude:-47,occurred_at:100},{source:'provider',latitude:0,longitude:0,occurred_at:1}];
 const points=map.confirmedPoints(events);assert.equal(points.length,2);assert.equal(points[0].latitude,-22.9);assert.equal(points[1].latitude,-19.9);assert.equal(events.length,4);
});
test('destino é localizado por cidade e UF sem enviar o endereço do cliente a um geocodificador',()=>{
 const rows=JSON.parse(fs.readFileSync('dist/data/cidades.json'));assert.ok(rows.length>=5500);const city=map.findCity(rows,'sao paulo','SP');assert.ok(city);assert.ok(city[2]<-23&&city[2]>-24);assert.equal(map.findCity(rows,'São Paulo','PI'),undefined);
});
test('código permanente de demonstração funciona sem credenciais, banco ou cobrança',async()=>{
 const old=global.fetch;global.fetch=()=>{throw Error('Não deve chamar serviços no pedido fictício.');};
 try{const response=await worker.default.fetch(new Request('https://loja.example/api/tracking?code=teste-gokoco'),{});assert.equal(response.status,200);const data=await response.json();assert.equal(data.demo,true);assert.equal(data.trackingCode,'TESTE-GOKOCO');assert.equal(data.customer.name,'Cliente de demonstração');assert.equal(map.confirmedPoints(data.events).length,2);assert.equal(worker.demoTracking(Date.UTC(2030,0,1)).paidAt,Date.UTC(2030,0,1)-6*86400000);}finally{global.fetch=old;}
});
