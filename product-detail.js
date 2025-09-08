// product-detail.js — product page with stock control + gallery
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

  const stockBadgeId = 'pd-oos-msg';
  const money = (n)=>'Rs'+Number(n||0).toFixed(0);

  if (!id) {
    nameEl.textContent = 'Product not found';
    hero.src = 'https://via.placeholder.com/800x800?text=Not+Found';
    addBtn.disabled = true;
    return;
  }

  function mountOOS(msg){
    let el = document.getElementById(stockBadgeId);
    if (!el) {
      el = document.createElement('div');
      el.id = stockBadgeId;
      el.style.marginTop = '8px';
      el.className = 'muted';
      addBtn.insertAdjacentElement('beforebegin', el);
    }
    el.textContent = msg;
  }
  function clearOOS(){
    const el = document.getElementById(stockBadgeId);
    if (el) el.textContent = '';
  }

  function setQty(n, max) {
    const v = Math.max(1, Math.min(Number(n||1), Number(max||9999)));
    qtyVal.textContent = v;
  }

  function renderSizes(p){
    sizeSel.innerHTML = '';
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    if (sizes.length) {
      sizes.forEach(s=>{
        const opt = document.createElement('option');
        opt.value = s.label;
        opt.textContent = s.stock === 0
          ? `${s.label} — Out of stock`
          : `${s.label} — ${money(s.price)}` + (typeof s.stock === 'number' ? ` — ${s.stock} left` : '');
        opt.dataset.price = Number(s.price||0);
        if (typeof s.stock === 'number') opt.dataset.stock = String(s.stock);
        sizeSel.appendChild(opt);
      });
    } else {
      const opt = document.createElement('option');
      opt.value = 'default';
      opt.textContent = `${money(p.basePrice||0)}` + (typeof p.stock === 'number' ? ` — ${p.stock} left` : '');
      opt.dataset.price = Number(p.basePrice||0);
      if (typeof p.stock === 'number') opt.dataset.stock = String(p.stock);
      sizeSel.appendChild(opt);
    }
    updatePriceAndStock();
  }

  function currentStock(){
    const opt = sizeSel.selectedOptions[0];
    const s = opt?.dataset?.stock;
    return (s === undefined) ? null : Number(s);
  }
  function currentPrice(){
    return Number(sizeSel.selectedOptions[0]?.dataset?.price || 0);
  }

  function updatePriceAndStock(){
    const st = currentStock();
    priceEl.textContent = money(currentPrice());

    if (st !== null) {
      if (st <= 0) {
        addBtn.disabled = true;
        addBtn.classList.add('disabled');
        mountOOS('Out of stock');
        setQty(1, 1);
      } else {
        addBtn.disabled = false;
        addBtn.classList.remove('disabled');
        clearOOS();
        setQty(1, st);
      }
    } else {
      addBtn.disabled = false;
      addBtn.classList.remove('disabled');
      clearOOS();
      setQty(1, 9999);
    }
  }

  sizeSel.addEventListener('change', updatePriceAndStock);

  btnDec.addEventListener('click', ()=>{
    const st = currentStock();
    setQty(Number(qtyVal.textContent) - 1, st ?? 9999);
  });
  btnInc.addEventListener('click', ()=>{
    const st = currentStock();
    setQty(Number(qtyVal.textContent) + 1, st ?? 9999);
  });

  addBtn.addEventListener('click', ()=>{
    if (addBtn.disabled) return;

    const qty = Number(qtyVal.textContent||1) || 1;
    const st = currentStock();
    if (st !== null && qty > st) {
      alert('Not enough stock.');
      return;
    }

    const label = sizeSel.value;
    const unitPrice = currentPrice();

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
    const count = cart.reduce((s,i)=>s+(Number(i.qty || i.quantity || 1)||1),0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
    alert('Added to cart!');
  });

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

  async function load() {
    try {
      const doc = await db.collection('products').doc(id).get();
      if (!doc.exists) {
        nameEl.textContent = 'Product not found';
        hero.src = 'https://via.placeholder.com/800x800?text=Not+Found';
        addBtn.disabled = true;
        return;
      }
      const p = doc.data();

      nameEl.textContent = p.name || 'Product';
      brandEl.textContent = p.brand ? p.brand : '';
      descEl.textContent = p.description || '—';

      renderSizes(p);

      const gallery = [];
      if (Array.isArray(p.images)) p.images.filter(Boolean).forEach(u=>gallery.push(u));
      if (p.imageURL && (!gallery.length || gallery[0] !== p.imageURL)) gallery.unshift(p.imageURL);
      renderGallery(gallery);
    } catch (e) {
      console.error('Load product error:', e);
      nameEl.textContent = 'Product not found';
      hero.src = 'https://via.placeholder.com/800x800?text=Error';
      addBtn.disabled = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, {once:true});
  } else {
    load();
  }
})();
