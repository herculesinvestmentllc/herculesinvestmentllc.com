/* Contact forms: the Contact page form and the investor form on Home. */
'use strict';
const FORM_ENDPOINT='/api/contact.php';
const ERRTXT={net:'Could not send. Please try again or email us directly.',val:'Please check the highlighted fields.',rate:'Please wait a moment before sending again.'};

function fieldValue(form,name){
  const el=form.elements[name];
  if(!el)return '';
  if(el.tagName==='SELECT')return el.value||((el.selectedOptions[0]||{}).textContent||'');
  return el.value.trim();
}

function clearInvalid(form){
  $$('.is-invalid',form).forEach(el=>el.classList.remove('is-invalid'));
  $$('[aria-invalid]',form).forEach(el=>el.removeAttribute('aria-invalid'));
}
// The 422 body lists the offending field names; mirror that on the inputs so the
// "check the highlighted fields" message points at something. The mark clears as
// soon as the visitor edits that field.
function markInvalid(form,fields){
  const els=fields.map(n=>form.elements[n]).filter(el=>el&&el.classList);
  els.forEach(el=>{
    el.classList.add('is-invalid');el.setAttribute('aria-invalid','true');
    el.addEventListener('input',()=>{el.classList.remove('is-invalid');el.removeAttribute('aria-invalid');},{once:true});
  });
  if(els[0])els[0].focus();
}

function bindContactForm(form){
  const btn=$('button[type="submit"]',form),err=$('.form-err',form),ok=form.parentElement.querySelector('.form-ok');
  const showError=kind=>{err.textContent=ERRTXT[kind];err.hidden=false;};
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    err.hidden=true;clearInvalid(form);
    btn.classList.add('loading');btn.disabled=true;
    const payload={
      name:fieldValue(form,'name'),
      email:fieldValue(form,'email'),
      company:fieldValue(form,'company'),
      interest:form.dataset.interest||fieldValue(form,'interest'),
      message:fieldValue(form,'message'),
      website:form.elements.website?form.elements.website.value:'',
      lang:'en'
    };
    try{
      const r=await fetch(FORM_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(r.status===422){
        showError('val');
        const d=await r.json().catch(()=>({}));
        if(d&&Array.isArray(d.fields))markInvalid(form,d.fields);
      }
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
