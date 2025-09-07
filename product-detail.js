// product-detail.js — single main image + unique thumbnails
(function(){
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  function getParam(name){
    const u = new URL(location.href);
    return u.searchParams.get(name);
  }

  // Cloudinary on-the-fly optimization (safe no-op for non-Cloudinary)
  function cOpt(url, w){
    try{
      if(!url || !/res\.cloudinary\.com/.test(url)) return url;
      return url.replace(/\/upload\/(?!.*\/)/, `/upload/f_auto,q_auto,w_${w}/`);
    }catch{return url;}
  }

  function number(val){ const n = Number(val); return Number.isFinite(n) ? n : 0; }

  async function load(){
    const id = getParam('id');
    if(!id){ $('#pd-name').textContent='Product not found'; return; }

    const doc = await db.collection('products').doc(id).get();
    if(!doc.exists){ $('#pd-name').textContent='Product not found'; return; }
    const p = doc.data();

    // ----- Build images list (unique, truthy) -----
    const arr = Array.isArray(p.images) ? p.images.slice() : [];
    if(p.imageURL) arr.unshift(p.imageURL);
    // Keep only first occurrence of each URL
    const seen = new Set();
    const allImages = arr.filter(u => u && !seen.has(u) && seen.add(u));
    const mainImage = allImages[0] || 'https://via.placeholder.com/800x800?text=No+Image';
    const thumbImages = allImages.slice(1); // exclude main

    // ----- Fill DOM -----
    $('#pd-name').textContent = p.name || '';
    $('#pd-brand').textContent = p.brand || '';
    $('#pd-desc').textContent = p.description || '';

    // sizes & pricing
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const sizeSel = $('#pd-size');
    sizeSel.innerHTML = '';
    if(sizes.length){
      sizes.forEach(s=>{
        const opt = document.createElement('option');
        opt.value = s.label;
        opt.textContent = `${s.label} — Rs${number(s.price).toFixed(0)}`;
        opt.dataset.price = number(s.price);
        sizeSel.appendChild(opt);
      });
    }else{
      const opt = document.createElement('option');
      opt.value = 'default';
      const base = number(p.basePrice);
      opt.textContent = `Default — Rs${base.toFixed(0)}`;
      opt.dataset.price = base;
      sizeSel.appendChild(opt);
    }

    const setPrice = ()=>{
      const sel = sizeSel.options[sizeSel.selectedIndex];
      const price = number(sel?.dataset?.price || 0);
      $('#pd-price-text').textContent = `Rs${price.toFixed(0)}`;
    };
    setPrice();
    sizeSel.onchange = setPrice;

    // gallery
    const mainEl = $('#pd-main');
    mainEl.src = cOpt(mainImage, 900);
    mainEl.alt = p.name || 'Product image';

    const thumbs = $('#pd-thumbs');
    thumbs.innerHTML = '';
    if(thumbImages.length){
      thumbImages.forEach(u=>{
        const t = document.createElement('img');
        t.src = cOpt(u, 160);
        t.alt = 'Thumbnail';
        t.className = 'pd-thumb';
        t.addEventListener('click', ()=>{
          // swap main image with clicked one
          mainEl.src = cOpt(u, 900);
        });
        thumbs.appendChild(t);
      });
    }

    // qty controls
    const qtyInput = $('#qty-input');
    $('#qty-minus').onclick = ()=>{ const v = Math.max(1, Number(qtyInput.value||1)-1); qtyInput.value = v; };
    $('#qty-plus').onclick  = ()=>{ const v = Math.max(1, Number(qtyInput.value||1)+1); qtyInput.value = v; };

    // add to cart
    $('#pd-add').onclick = ()=>{
      const sel = sizeSel.options[sizeSel.selectedIndex];
      const price = number(sel?.dataset?.price || 0);
      const sizeLabel = sel?.value || 'default';
      const qty = Math.max(1, Number(qtyInput.value||1));

      const item = {
        id,
        name: p.name + (sizeLabel && sizeLabel!=='default' ? ` (${sizeLabel})` : ''),
        price,
        quantity: qty,
        imageURL: mainImage,
        brand: p.brand || '',
      };

      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      cart.push(item);
      localStorage.setItem('cart', JSON.stringify(cart));
      if(window.updateCartCount) window.updateCartCount();
      alert('Added to cart!');
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once:true });
  } else {
    load();
  }
})();
