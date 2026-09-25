/* Reveal and hero network canvas. */
'use strict';
/* ================= REVEAL ================= */
const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});},{threshold:.14,rootMargin:'0px 0px -40px 0px'});
$$('.rv').forEach(el=>io.observe(el));

/* ================= HERO NETWORK CANVAS ================= */
const net=(()=>{
  const cv=$('#net');if(!cv)return{resize(){},recolor(){}};
  const ctx=cv.getContext('2d');
  let W=0,H=0,nodes=[],parts=[],mouse={x:-999,y:-999},colors={n:'11,31,58',g:'160,125,50',link:'11,31,58'};
  function recolor(){colors=document.documentElement.dataset.theme==='dark'
    ?{n:'214,228,248',g:'201,165,92',link:'160,190,230'}
    :{n:'11,31,58',g:'160,125,50',link:'11,31,58'};}
  recolor();
  function init(){
    const N=Math.min(85,Math.floor(W/15));
    nodes=Array.from({length:N},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:Math.random()*1.6+.8,g:Math.random()<.2}));
    parts=Array.from({length:16},()=>({x:Math.random()*W,y:Math.random()*H,s:Math.random()*.5+.25,ph:Math.random()*6.28,r:Math.random()*1.4+.6}));
  }
  function step(){
    ctx.clearRect(0,0,W,H);
    for(const n of nodes){
      n.x+=n.vx;n.y+=n.vy;
      if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1;
      const dx=n.x-mouse.x,dy=n.y-mouse.y,d=Math.hypot(dx,dy);
      if(d<150&&d>0){n.x+=dx/d*.6;n.y+=dy/d*.6;}
    }
    for(let i=0;i<nodes.length;i++){const a=nodes[i];
      for(let j=i+1;j<nodes.length;j++){const b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d=dx*dx+dy*dy;
        if(d<16900){ctx.strokeStyle='rgba('+colors.link+','+((1-d/16900)*.28)+')';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}}
    for(const n of nodes){ctx.fillStyle=n.g?'rgba('+colors.g+',.8)':'rgba('+colors.n+',.55)';
      ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,6.283);ctx.fill();}
    for(const p of parts){p.y-=p.s;p.ph+=.02;const x=p.x+Math.sin(p.ph)*12;
      if(p.y<-10){p.y=H+10;p.x=Math.random()*W;}
      ctx.fillStyle='rgba('+colors.g+','+(.25+Math.sin(p.ph*2)*.15)+')';
      ctx.beginPath();ctx.arc(x,p.y,p.r,0,6.283);ctx.fill();}
    if(!REDUCED)requestAnimationFrame(step);
  }
  function resize(){
    const r=cv.parentElement.getBoundingClientRect();W=r.width;H=r.height;
    if(!W)return;
    const dpr=Math.min(2,devicePixelRatio||1);
    cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    init();if(REDUCED)step();
  }
  cv.parentElement.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;});
  cv.parentElement.addEventListener('pointerleave',()=>{mouse.x=-999;mouse.y=-999;});
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{resize();if(!REDUCED)requestAnimationFrame(step);},200);});
  resize();if(!REDUCED)requestAnimationFrame(step);
  return{resize(){resize();if(!REDUCED)requestAnimationFrame(step);},recolor};
})();
window.net=net;

