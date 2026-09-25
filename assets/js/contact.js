/* Contact forms: the Contact page form and the investor form on Home. */
'use strict';
const FORM_ENDPOINT='/api/contact.php';
const formOpened=Date.now();
const ERRTXT={net:'Could not send. Please try again or email us directly.',val:'Please check the highlighted fields.',rate:'Please wait a moment before sending again.'};

function fieldValue(form,name){
  const el=form.elements[name];
  if(!el)return '';
  if(el.tagName==='SELECT')return el.value||((el.selectedOptions[0]||{}).textContent||'');
  return el.value.trim();
}

function bindContactForm(form){
  const btn=$('button[type="submit"]',form),err=$('.form-err',form),ok=form.parentElement.querySelector('.form-ok');
  const showError=kind=>{err.textContent=ERRTXT[kind];err.hidden=false;};
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    err.hidden=true;
    btn.classList.add('loading');btn.disabled=true;
    const payload={
      name:fieldValue(form,'name'),
      email:fieldValue(form,'email'),
      company:fieldValue(form,'company'),
      interest:form.dataset.interest||fieldValue(form,'interest'),
      message:fieldValue(form,'message'),
      website:form.elements.website?form.elements.website.value:'',
      elapsed:Date.now()-formOpened,
      lang:'en'
    };
    try{
      const r=await fetch(FORM_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(r.status===422)showError('val');
      else if(r.status===429)showError('rate');
      else if(!r.ok)showError('net');
      else{
        const d=await r.json();
        if(d&&d.ok){form.hidden=true;ok.classList.add('show');return;}
        showError('net');
      }
    }catch(_){showError('net');}
    btn.classList.remove('loading');btn.disabled=false;
  });
}

$$('form.js-contact').forEach(bindContactForm);
$$('.field select').forEach(s=>s.addEventListener('change',()=>s.classList.add('filled')));
