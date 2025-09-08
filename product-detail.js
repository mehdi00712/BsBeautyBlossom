// product-detail.js
(function(){
  const $ = (s)=>document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  const hero = $('#pd-hero');
  const thumbs = $('#pd-thumbs');
  const nameEl = $('#pd-name');
  const brandEl = $('#pd-brand');
  const priceEl = $('#pd-price');
  const descEl = $('#pd-desc');
  const sizeSel = $('#pd-size');
  const addBtn = $('#pd-add');
  const qtyVal = $('#qty-val');
  const btnDec = $('#qty-dec');
  const btnInc = $('#qty-inc');

  if (!id) {
    nameEl.textContent = 'Product not found';
    hero.src = 'https://via.placeholder.com/800x800?text=Not+Found';
    return;
  }

  const money = (n)=>'Rs'+Number(n||0).toFixed(0);

  function renderSizes(p){
    sizeSel.innerHTML = '';
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    if (sizes.length) {
      sizes.forEach(s=>{
        const opt = document.createElement('option');
        opt.value = s.label;
        opt.textContent = `${s.label} — ${money(s.price)}`;
        opt.dataset.price = Number(s.price||0);
        sizeSel.appendChild(opt);
      });
    } else {
      const opt = document.createElement('option');
      opt.value = 'default';
      opt.textContent = money(p.basePrice||0);
      opt.dataset.price = Number(p.basePrice||0);
      sizeSel.appendChild(opt);
    }
    const firstPrice = Number(sizeSel.options[0]?.dataset.price||0);
    priceEl.textContent = money(firstPrice);
  }

  function renderGallery(imgs){
    if (!imgs.length) {
      hero.src = 'https://via.placeholder.com/900x900?text=No+Image';
      thumbs.innerHTML = '';
      return;
    }
    hero.src = imgs[0];
    thumbs.innerHTML = '';
    imgs.forEach((src, i)=>{
      const t = document.createElement('img');
      t.src = src;
      if (i===0) t.classList.add('active');
      t.addEventListener('click', ()=>{
        hero.src = src;
        thumbs.querySelectorAll('img').forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
      });
      thumbs.appendChild(t);
    });
  }

  function setQty(n){
    qtyVal.textContent = Math.max(1, Number(n||1));
  }
  btnDec.addEventListener('click', ()=>setQty(Number(qtyVal.textContent)-1));
  btnInc.addEventListener('click', ()=>setQty(Number(qtyVal.textContent)+1));
  sizeSel.addEventListener('change', ()=>{
    const p = Number(sizeSel.selectedOptions[0]?.dataset.price||0);
    priceEl.textContent = money(p);
  });

  addBtn.addEventListener('click', ()=>{
    const qty = Number(qtyVal.textContent||1) || 1;
    const label = sizeSel.value;
    const unitPrice = Number(sizeSel.selectedOptions[0]?.dataset.price||0) || 0;

    const item = {
      id,
      name: `${nameEl.textContent}${label && label!=='default' ? ' ('+label+')' : ''}`,
      price: unitPrice,
      qty,
      imageURL: hero.src
    };
    const cart = JSON.parse(localStorage.getItem('cart')||'[]');
    cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
    const count = cart.reduce((s,i)=>s+(Number(i.qty||i.quantity||1)||1),0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
    alert('Added to cart!');
  });

  async function load(){
    try {
      const doc = await db.collection('products').doc(id).get();
      if (!doc.exists) {
        nameEl.textContent = 'Product not found';
        hero.src = 'https://via.placeholder.com/800x800?text=Not+Found';
        return;
      }
      const p = doc.data();
      nameEl.textContent = p.name || 'Product';
      brandEl.textContent = p.brand ? p.brand : '';
      descEl.textContent = p.description || '—';
      renderSizes(p);

      const gallery = [];
      if (Array.isArray(p.images)) p.images.filter(Boolean).forEach(u=>gallery.push(u));
      if (p.imageURL && (!gallery.length || gallery[0]!==p.imageURL)) gallery.unshift(p.imageURL);
      renderGallery(gallery);
    } catch (e) {
      console.error('Load product error:', e);
      nameEl.textContent = 'Product not found';
      hero.src = 'https://via.placeholder.com/800x800?text=Error';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, {once:true});
  else load();
})();
