
(function(){
  var c=document.getElementById('lv-carousel');
  if(!c) return;
  var section=c.closest('[data-carousel]');
  var slides=c.querySelector('.flex')?c.querySelector('.flex').children:[];
  var n=slides.length;
  function mk(cls,html,onclick){var b=document.createElement('button');b.className=cls;b.innerHTML=html;b.type='button';b.addEventListener('click',onclick);return b;}
  var prev=mk('lv-arrow prev','<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',function(){c.scrollBy({left:-c.clientWidth,behavior:'smooth'});});
  var next=mk('lv-arrow next','<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',function(){c.scrollBy({left:c.clientWidth,behavior:'smooth'});});
  section.appendChild(prev);section.appendChild(next);
  var dots=document.createElement('div');dots.className='lv-dots';
  for(var i=0;i<n;i++){(function(i){var d=document.createElement('button');d.className='lv-dot'+(i===0?' active':'');d.type='button';d.addEventListener('click',function(){c.scrollTo({left:i*c.clientWidth,behavior:'smooth'});});dots.appendChild(d);})(i);}
  section.appendChild(dots);
  c.addEventListener('scroll',function(){
    var idx=Math.round(c.scrollLeft/c.clientWidth);
    Array.prototype.forEach.call(dots.children,function(d,k){d.classList.toggle('active',k===idx);});
    var cnt=document.getElementById('lv-carousel-count');
    if(cnt){cnt.textContent=(idx+1)+'/'+n;}
    var v=document.getElementById('lv-carousel-video');
    if(v){var vi=Array.prototype.indexOf.call(slides,v.closest('[data-video-slide]'));
      if(idx===vi){ if(window.lvLoadCarouselVideo){window.lvLoadCarouselVideo();} else {var pr=v.play();if(pr&&pr.catch)pr.catch(function(){});} }else{v.pause();}}
  });
})();

  (function(){
    var v=document.getElementById('lv-carousel-video');
    var btn=document.getElementById('lv-video-sound');
    if(!v||!btn) return;
    function sync(){btn.innerHTML=v.muted?'🔇 Toque para ouvir':'🔊 Som ligado';btn.setAttribute('aria-label',v.muted?'Ativar som':'Desativar som');}
    btn.addEventListener('click',function(e){e.stopPropagation();if(window.lvLoadCarouselVideo)window.lvLoadCarouselVideo();v.muted=!v.muted;if(!v.muted){v.volume=1;var pr=v.play();if(pr&&pr.catch)pr.catch(function(){});}sync();});
    v.addEventListener('click',function(){if(v.muted){v.muted=false;v.volume=1;var pr=v.play();if(pr&&pr.catch)pr.catch(function(){});sync();}});
    sync();
  })();

  (function(){
    var v=document.getElementById('lv-carousel-video');
    if(!v) return;
    // O vídeo só é baixado quando o usuário chega no slide dele.
    // Antes ele pesava ~3,8MB no primeiro carregamento da página (4G lento).
    window.lvLoadCarouselVideo=function(){
      if(v.dataset.lvLoaded) { var p0=v.play(); if(p0&&p0.catch)p0.catch(function(){}); return; }
      v.dataset.lvLoaded='1';
      var src=v.getAttribute('data-src');
      if(src && !v.getAttribute('src')) v.setAttribute('src',src);
      v.muted=true;
      try{ v.load(); }catch(_){}
      var pr=v.play(); if(pr&&pr.catch) pr.catch(function(){});
    };
    v.addEventListener('error',function(){ v.dataset.lvLoaded=''; });
  })();
