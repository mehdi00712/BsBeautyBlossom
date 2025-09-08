// product-detail.js
(function(){
  const $ = (s)=>document.querySelector(s);
  const id = new URLSearchParams(location.search).get('id');

  const hero = $('#pd-hero'), thumbs = $('#pd-thumbs');
  const nameEl = $('#pd-name'), brandEl = $('#pd-brand'), priceEl = $('#pd-price');
  const descEl = $('#pd-desc'), sizeSel = $('#pd-size');
  const addBtn = $('#pd-add'), qtyVal = $('#qty-val'), dec = $('#qty-dec'), inc = $('#qty-inc');

  if (!id){ nameEl.textContent='Product not found'; hero.src='https://via.placeholder.com/800x800?text=Not+Found'; return; }
  const money = (n)=>'Rs'+Number(n||0).toFixed(0);

  function renderSizes(p){
    sizeSel.innerHTML = '';
    const sizes = Array.isArray(p.sizes)?p.sizes:[];
    if (sizes.length){
      sizes.forEach(s=>{
        const o=document.createElement('option'); o.value=s.label; o.textContent=`${s.label} — ${money(s.price)}`; o.dataset.price=Number(s.price||0);
        sizeSel.appendChild(o);
      });
    }else{
      const o=document.createElement('option'); o.value='default'; o.textContent=money(p.basePrice||0); o.dataset.price=Number(p.basePrice||0);
      sizeSel.appendChild(o);
    }
    priceEl.textContent = money(Number(sizeSel.options[0]?.dataset.price||0));
  }
  function renderGallery(imgs){
    if (!imgs.length){ hero.src='https://via.placeholder.com/900x900?text=No+Image'; thumbs.innerHTML=''; return; }
    hero.src = imgs[0]; thumbs.innerHTML='';
    imgs.forEach((src,i)=>{
      const t=document.createElement('img'); t.src=src; if(i===0)t.classList.add('active');
      t.addEventListener('click', ()=>{ hero.src=src; thumbs.querySelectorAll('img').forEach(x=>x.classList.remove('active')); t.classList.add('active');});
      thumbs.appendChild(t);
    });
  }
  function setQty(n){ const v=Math.max(1,Number(n||1)); qtyVal.textContent=v; }
  dec.addEventListener('click', ()=>setQty(Number(qtyVal.textContent)-1));
  inc.addEventListener('click', ()=>setQty(Number(qtyVal.textContent)+1));
  sizeSel.addEventListener('change', ()=> priceEl.textContent = money(Number(sizeSel.selectedOptions[0]?.dataset.price||0)));

  addBtn.addEventListener('click', ()=>{
    const qty = Number(qtyVal.textContent||1)||1;
    const label = sizeSel.value;
    const unitPrice = Number(sizeSel.selectedOptions[0]?.dataset.price||0)||0;
    const item = { id, name:`${nameEl.textContent}${label && label!=='default'?' ('+label+')':''}`, price:unitPrice, qty, imageURL: hero.src };
    const cart = JSON.parse(localStorage.getItem('cart')||'[]'); cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCartCount?.();
    alert('Added to cart!');
  });

  async function load(){
    try{
      const doc = await db.collection('products').doc(id).get();
      if (!doc.exists){ nameEl.textContent='Product not found'; hero.src='https://via.placeholder.com/800x800?text=Not+Found'; return; }
      const p = doc.data();
      nameEl.textContent = p.name||'Product';
      brandEl.textContent = p.brand||'';
      descEl.textContent = p.description||'—';
      renderSizes(p);
      const gallery = [];
      if (Array.isArray(p.images)) p.images.filter(Boolean).forEach(u=>gallery.push(u));
      if (p.imageURL && gallery[0] !== p.imageURL) gallery.unshift(p.imageURL);
      renderGallery(gallery);
    }catch(e){
      console.error('Load product error:', e);
      nameEl.textContent='Product not found'; hero.src='https://via.placeholder.com/800x800?text=Error';
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', load, {once:true}); else load();
})();
