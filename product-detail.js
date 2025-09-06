// product-detail.js — loads one product, handles sizes/qty, adds to cart
(function(){
  if (!window.db) { console.error('product-detail: Firestore not available'); return; }

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { alert('No product id'); location.href = 'index.html'; return; }

  const el = (id) => document.getElementById(id);
  const main = el('pd-main'), thumbs = el('pd-thumbs');
  const nameEl = el('pd-name'), brandEl = el('pd-brand'), priceEl = el('pd-price'), descEl = el('pd-desc');
  const sizeEl = el('pd-size'), qtyEl = el('pd-qty'), plus = el('pd-plus'), minus = el('pd-minus'), add = el('pd-add');

  function setPriceLabel(p) { priceEl.textContent = p>0 ? 'Rs ' + p : ''; }
  function updateCount() {
    const cart = JSON.parse(localStorage.getItem('cart')||'[]');
    const c = cart.reduce((s,i)=>s + Number(i.quantity||i.qty||0), 0);
    const cc = document.getElementById('cart-count'); if (cc) cc.textContent = c;
  }

  function addToCart(item){
    const cart = JSON.parse(localStorage.getItem('cart')||'[]');
    cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCount();
    alert('Added to cart');
  }

  function buildSelect(p){
    sizeEl.innerHTML = '';
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    if (sizes.length){
      sizes.forEach(s=>{
        const opt = document.createElement('option');
        opt.value = s.label; opt.textContent = `${s.label} - Rs${s.price}`; opt.dataset.price = Number(s.price||0);
        sizeEl.appendChild(opt);
      });
    } else {
      const opt = document.createElement('option');
      opt.value = 'default'; opt.textContent = `Rs${Number(p.basePrice||0)}`; opt.dataset.price = Number(p.basePrice||0);
      sizeEl.appendChild(opt);
    }
    const sel = sizeEl.options[sizeEl.selectedIndex]; setPriceLabel(Number(sel?.dataset.price||0));
  }

  minus.onclick = ()=>{ const q = Math.max(1, Number(qtyEl.textContent||'1')-1); qtyEl.textContent = q; };
  plus.onclick  = ()=>{ const q = Math.min(99, Number(qtyEl.textContent||'1')+1); qtyEl.textContent = q; };
  sizeEl.onchange = ()=>{ const sel = sizeEl.options[sizeEl.selectedIndex]; setPriceLabel(Number(sel?.dataset.price||0)); };

  add.onclick = ()=>{
    const sel = sizeEl.options[sizeEl.selectedIndex];
    const unitPrice = Number(sel?.dataset.price||0);
    const qty = Number(qtyEl.textContent||'1');
    const label = sel ? sel.value : 'default';
    const n = nameEl.textContent || 'Item';
    const item = {
      name: label && label!=='default' ? `${n} (${label})` : n,
      unitPrice,
      qty,
      imageURL: main?.src || ''
    };
    addToCart(item);
  };

  async function load(){
    try{
      const snap = await db.collection('products').doc(id).get();
      if (!snap.exists) { alert('Product not found'); location.href='index.html'; return; }
      const p = snap.data();
      nameEl.textContent = p.name || 'Product';
      brandEl.textContent = p.brand ? p.brand : '';
      descEl.textContent = p.description || '';
      buildSelect(p);

      const images = Array.isArray(p.images) && p.images.length ? p.images : (p.imageURL ? [p.imageURL] : []);
      const first = images[0] || 'https://via.placeholder.com/900x600?text=Image';
      main.src = first;
      thumbs.innerHTML = '';
      images.forEach(u=>{
        const t = document.createElement('img');
        t.src = u; t.className = 'pd-thumb'; t.alt='thumb';
        t.onclick = ()=>{ main.src = u; };
        thumbs.appendChild(t);
      });
      updateCount();
    }catch(e){ console.error(e); alert('Load error: '+e.message); }
  }
  load();
})();
