/* Tilt/magnet hover and the portfolio filter. */
'use strict';
/* ================= TILT + MAGNET ================= */
if(FINE&&!REDUCED){
  $$('.tilt').forEach(el=>{
    el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      el.style.transform='translateY(-8px) perspective(900px) rotateX('+(-y*5)+'deg) rotateY('+(x*6)+'deg)';});
    el.addEventListener('mouseleave',()=>{el.style.transform='';});
  });
  $$('.magnet').forEach(el=>{
    el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();
      el.style.transform='translate('+((e.clientX-r.left-r.width/2)*.16)+'px,'+((e.clientY-r.top-r.height/2)*.2)+'px)';});
    el.addEventListener('mouseleave',()=>{el.style.transform='';});
  });
}

/* ================= FILTERS ================= */
function bindFilter(barSel,itemSel,attr){
  const bar=$(barSel);if(!bar)return;
  bar.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    $$('button',bar).forEach(x=>x.classList.toggle('on',x===b));
    const f=b.dataset.filter;
    $$(itemSel).forEach(it=>{
      const show=f==='all'||it.dataset[attr]===f;
      if(show){it.style.display='';requestAnimationFrame(()=>requestAnimationFrame(()=>it.classList.remove('hide')));}
      else{it.classList.add('hide');setTimeout(()=>{if(it.classList.contains('hide'))it.style.display='none';},330);}
    });
  });
}
bindFilter('#pfFilters','.pf-item','sector');

