/* Theme, cursor, scroll chrome, router, mobile menu. */
'use strict';
/* ================= THEME ================= */
const saved=localStorage.getItem('hi-theme');
document.documentElement.dataset.theme=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
$('#themeBtn').addEventListener('click',()=>{
  const t=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=t;try{localStorage.setItem('hi-theme',t)}catch(e){}
  if(window.net&&window.net.recolor)window.net.recolor();
});

/* ================= CURSOR + GLOW ================= */
if(FINE&&!REDUCED){
  document.documentElement.classList.add('has-cursor');
  const dot=$('#cursorDot'),ring=$('#cursorRing'),glow=$('#glow');
  let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my,gx=mx,gy=my;
  addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';dot.classList.add('show');ring.classList.add('show');});
  (function loop(){rx+=(mx-rx)*.16;ry+=(my-ry)*.16;gx+=(mx-gx)*.06;gy+=(my-gy)*.06;
    ring.style.left=rx+'px';ring.style.top=ry+'px';glow.style.left=gx+'px';glow.style.top=gy+'px';
    requestAnimationFrame(loop);})();
  document.addEventListener('mouseover',e=>{ring.classList.toggle('hov',!!(e.target.closest&&e.target.closest('a,button,.tilt,input,select,textarea')));});
}

/* ================= SCROLL CHROME ================= */
const nav=$('#nav'),prog=$('#progress');
let sTick=false;
function onScroll(){
  const y=scrollY,h=document.documentElement.scrollHeight-innerHeight;
  prog.style.transform='scaleX('+(h?y/h:0)+')';
  nav.classList.toggle('scrolled',y>10);
  sTick=false;
}
addEventListener('scroll',()=>{if(!sTick){requestAnimationFrame(onScroll);sTick=true;}},{passive:true});
onScroll();

/* ================= ROUTER + PAGE TRANSITION ================= */
const pages=$$('.page'),PAGES=['home','about','services','portfolio','contact'];
let current='home',animLock=false;
const wipe=$('#wipe');
function setActiveNav(id){$$('.nav-links a').forEach(a=>a.classList.toggle('on',a.dataset.page===id));}
function swap(id){pages.forEach(p=>p.classList.toggle('active',p.id==='page-'+id));current=id;setActiveNav(id);
  try{scrollTo({top:0,left:0,behavior:'instant'})}catch(e){scrollTo(0,0)}
  if(id==='home'&&window.net&&window.net.resize)window.net.resize();}
// mode: 'push' for a click (adds a history entry), 'none' when the browser has
// already moved through history (popstate / hashchange). Pushing on every click is
// what makes the Back button return to the previous page instead of leaving the site.
function go(id,mode){
  if(!PAGES.includes(id))id='home';
  if(id===current){scrollTo({top:0,behavior:'smooth'});return;}
  closeMenu();
  const record=()=>{if(mode!=='none')history[mode==='push'?'pushState':'replaceState']({page:id},'','#'+id);};
  if(REDUCED){swap(id);record();return;}
  if(animLock)return;animLock=true;
  wipe.classList.add('cover');
  setTimeout(()=>{swap(id);record();
    requestAnimationFrame(()=>{wipe.classList.add('leave');wipe.classList.remove('cover');
      setTimeout(()=>{wipe.classList.remove('leave');animLock=false;},600);});
  },570);
}
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-page]');
  if(a){e.preventDefault();go(a.dataset.page,'push');}
});
// popstate drives Back/Forward; hashchange covers a hand-edited address bar.
addEventListener('popstate',e=>{const id=(e.state&&e.state.page)||location.hash.slice(1)||'home';if(PAGES.includes(id))go(id,'none');});
addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(id&&PAGES.includes(id)&&id!==current)go(id,'none');});
const initId=location.hash.slice(1);
if(PAGES.includes(initId))swap(initId);else setActiveNav('home');
history.replaceState({page:current},'');

/* ================= MOBILE MENU ================= */
const burger=$('#burger'),menu=$('#mobileMenu'),firstLink=$('#mobileMenu a');
// While closed the menu is aria-hidden and inert, so its links stay out of the tab
// order and the accessibility tree. Opening reverses both and moves focus inside.
function closeMenu(){
  if(!document.body.classList.contains('menu-open'))return;
  document.body.classList.remove('menu-open');
  burger.setAttribute('aria-expanded','false');
  menu.setAttribute('aria-hidden','true');menu.setAttribute('inert','');
  burger.focus();
}
function openMenu(){
  document.body.classList.add('menu-open');
  burger.setAttribute('aria-expanded','true');
  menu.setAttribute('aria-hidden','false');menu.removeAttribute('inert');
  firstLink.focus();
}
burger.addEventListener('click',()=>{document.body.classList.contains('menu-open')?closeMenu():openMenu();});
$$('#mobileMenu a').forEach(a=>a.addEventListener('click',closeMenu));

