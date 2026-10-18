(() => {
  'use strict';
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const ORIGIN={city:'São Paulo',state:'SP',latitude:-23.5505,longitude:-46.6333};
  let citiesPromise,activeMap;
  function cities(){if(!citiesPromise)citiesPromise=fetch('/data/cidades.json').then(response=>{if(!response.ok)throw Error('Não foi possível carregar a lista de cidades.');return response.json();}).catch(error=>{citiesPromise=null;throw error;});return citiesPromise;}
  function findCity(rows,city,state){return rows.find(row=>normalize(row[0])===normalize(city)&&row[1]===String(state).toUpperCase());}
  function confirmedPoints(events){return events.filter(event=>event.source==='manual'&&typeof event.latitude==='number'&&typeof event.longitude==='number'&&Number.isFinite(event.latitude)&&Number.isFinite(event.longitude)).slice().reverse();}
  function schedule(paidAt,events,now=Date.now()){
    const contacts=events.filter(event=>event.source==='manual').slice().reverse();
    return [3,6,9,12,15].map((day,i)=>({day,dueAt:paidAt?paidAt+day*86400000:null,done:!!contacts[i],occurredAt:contacts[i]?.occurred_at||null,overdue:!!paidAt&&!contacts[i]&&now>paidAt+day*86400000}));
  }
  const format=value=>value?new Date(value).toLocaleDateString('pt-BR'):'após o pagamento';
  async function render(data){
    if(activeMap){activeMap.remove();activeMap=null;}
    const card=document.createElement('section');card.className='card delivery-map-card';
    const points=confirmedPoints(data.events),last=points.at(-1),destination=[data.address?.city,data.address?.state].filter(Boolean).join(' / ');
    card.innerHTML=`<div class="summary"><div><span class="eyebrow">Da distribuição até você</span><h2>Mapa da entrega</h2></div><span class="badge">${points.length} atualização(ões) no mapa</span></div><div class="map-endpoints"><div><span class="map-dot origin"></span><div><small>ORIGEM PREVISTA</small><strong>São Paulo / SP</strong></div></div><div><span class="map-dot destination"></span><div><small>DESTINO</small><strong>${escape(destination)}</strong></div></div></div><p class="muted">${last?'Último local informado pela loja: <strong>'+escape(last.city+' / '+last.state)+'</strong> · '+escape(format(last.occurred_at)):'Aguardando uma localização confirmada pela transportadora.'}</p><div class="delivery-map" id="delivery-map" role="region" aria-label="Mapa ilustrativo do percurso entre São Paulo e a cidade de entrega"></div><p class="map-error message" role="status"></p><div class="map-legend"><span><i class="line confirmed"></i>Pontos registrados pela loja</span><span><i class="line planned"></i>Ligação estimada até o destino</span></div>`;
    const first=document.querySelector('#result > section');first.after(card);
    try{
      const rows=await cities(),found=findCity(rows,data.address?.city,data.address?.state);
      if(!found){card.querySelector('.delivery-map').hidden=true;throw Error('A cidade de destino ainda não foi localizada no mapa. Consulte as atualizações abaixo.');}
      const end=[found[2],found[3]],start=[ORIGIN.latitude,ORIGIN.longitude],L=window.L;
      if(!L)throw Error('O mapa está indisponível. As informações do pedido continuam disponíveis abaixo.');
      const map=L.map(card.querySelector('.delivery-map'),{scrollWheelZoom:false,maxZoom:16,minZoom:3});activeMap=map;
      const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',referrerPolicy:'strict-origin'}).addTo(map);
      tiles.on('tileerror',()=>{card.querySelector('.map-error').textContent='O fundo do mapa não carregou. Os pontos e o histórico continuam disponíveis.';});
      function marker(coordinates,color,label,radius=8){const text=document.createElement('span');text.textContent=label;return L.circleMarker(coordinates,{radius,color:'#fff',weight:3,fillColor:color,fillOpacity:1}).addTo(map).bindTooltip(text,{direction:'top'});}
      marker(start,'#161823','Origem prevista: São Paulo / SP');marker(end,'#fe2c55','Destino aproximado: '+destination,10);
      const recorded=points.map(point=>[point.latitude,point.longitude]),all=[start,...recorded,end];
      L.polyline(all,{color:'#fe2c55',weight:3,dashArray:'7 9',opacity:.6}).addTo(map);
      if(recorded.length){L.polyline([start,...recorded],{color:'#21835b',weight:4,opacity:.85}).addTo(map);points.forEach((point,i)=>marker(recorded[i],'#21835b',(i+1)+'. '+point.city+' / '+point.state+' · '+format(point.occurred_at),i===points.length-1?11:7));}
      map.fitBounds(L.latLngBounds(all).pad(.22),{maxZoom:10});
      requestAnimationFrame(()=>map.invalidateSize());
    }catch(error){card.querySelector('.map-error').textContent=error.message;}
  }
  async function prepareAdmin(order,events){
    const form=document.getElementById('route-form');
    const plan=document.createElement('section');plan.className='contact-plan';
    const contacts=events.filter(event=>event.source==='manual').length;
    plan.innerHTML=`<h3>Contatos com a transportadora <span class="badge">${contacts} / 5 mínimo</span></h3><p class="muted">Planeje pelo menos cinco contatos em 15 dias. Cada atualização salva registra um contato; não é necessário mudar a etapa se o pedido continuar no mesmo local.</p><ol class="contact-slots">${schedule(order.paid_at,events).map((slot,i)=>`<li class="${slot.done?'done':slot.overdue?'overdue':''}"><strong>Contato ${i+1}</strong><span>Até o dia ${slot.day}</span><small>${slot.done?'Registrado em '+format(slot.occurredAt):'Previsto: '+format(slot.dueAt)}</small></li>`).join('')}</ol>`;
    if(!form)return;
    form.before(plan);
    const container=document.createElement('div');container.className='full map-fields';
    container.innerHTML='<label for="map-city">Cidade confirmada pela transportadora (para o mapa)</label><input id="map-city" list="map-cities" placeholder="Ex.: Campinas / SP" autocomplete="off" required disabled><datalist id="map-cities"></datalist><p class="muted">Selecione uma cidade da lista. A posição no mapa representa o centro aproximado do município.</p><label class="confirm-contact"><input id="carrier-confirmed" type="checkbox" required> Confirmei esta movimentação com a transportadora e autorizo a atualização no mapa.</label>';
    form.querySelector('button').closest('div').before(container);
    const button=form.querySelector('button');button.disabled=true;
    try{
      const rows=await cities(),input=container.querySelector('input');
      const last=confirmedPoints(events).at(-1);
      input.value=last?last.city+' / '+last.state:'São Paulo / SP';
      container.querySelector('datalist').innerHTML=rows.map(row=>'<option value="'+escape(row[0]+' / '+row[1])+'"></option>').join('');
      input.disabled=false;button.disabled=false;
      input.addEventListener('input',()=>input.setCustomValidity(''));
      form.mapPoint=()=>{const selected=rows.find(row=>normalize(row[0]+' / '+row[1])===normalize(input.value));if(!selected){input.setCustomValidity('Selecione uma cidade / UF da lista.');input.reportValidity();throw Error('Selecione uma cidade válida para atualizar o mapa.');}if(!container.querySelector('#carrier-confirmed').checked)throw Error('Confirme o contato com a transportadora.');return{mapCity:selected[0],mapState:selected[1],latitude:selected[2],longitude:selected[3],carrierConfirmed:true};};
    }catch(error){document.getElementById('route-message').textContent=error.message+' Reabra o pedido para tentar novamente.';}
  }
  window.DeliveryMap={render,prepareAdmin,findCity,confirmedPoints,schedule};
})();
