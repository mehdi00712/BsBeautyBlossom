// product-detail.js — big image + thumbs + ml/flavour variants
(async function(){
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const title = document.getElementById('p-title');
  const img   = document.getElementById('p-image');
  const thumbs= document.getElementById('p-thumbs');
  const sel   = document.getElementById('p-variant');
  const qtyEl = document.getElementById('p-qty');
  const priceEl = document.getElementById('p-price');
  const btn   = document.getElementById('p-add');

  if (!id) { title.textContent = 'Product not found'; return; }

  const doc = await db.collection('products').doc(id).get();
  if (!doc.exists) { title.textContent = 'Product not found'; return; }
  const p = doc.data();

  title.textContent = p.name || '';
  img.src = p.imageURL || 'https://via.placeholder.com/800x800?text=No+Image';

  // thumbnails
  const gallery = [p.imageURL].concat(Array.isArray(p.images)?p.images:[]).filter(Boolean);
  thumbs.innerHTML = '';
  gallery.forEach(u => {
    const t = document.createElement('img');
    t.src = u; t.className = 'thumb';
    t.onclick = () => { img.src = u; };
    thumbs.appendChild(t);
  });

  // variants (ml/flavour)
  const sizes = Array.isArray(p.sizes) ? p.sizes : [];
  if (sizes.length) {
    sel.innerHTML = sizes.map(s=>{
      const price = Number(s.price || 0);
      return <option value="${s.label}" data-price="${price}">${s.label} - Rs${price}</option>;
    }).join('');
  } else {
    sel.innerHTML = `<option value="default" data-price="${Number(p.basePrice||0)}">Default - Rs${Number(p.basePrice||0)}</option>;`
  }

  priceEl.textContent = 'Rs' + Number(sel.options[sel.selectedIndex].dataset.price || 0);
  sel.onchange = () => {
    priceEl.textContent = 'Rs' + Number(sel.options[sel.selectedIndex].dataset.price || 0);
  };

  document.getElementById('p-plus').onclick = ()=> qtyEl.value = String(Math.max(1, Number(qtyEl.value||1)+1));
  document.getElementById('p-minus').onclick = ()=> qtyEl.value = String(Math.max(1, Number(qtyEl.value||1)-1));

  btn.onclick = () => {
    const opt = sel.options[sel.selectedIndex];
    const variant = opt.value;
    const price = Number(opt.dataset.price || 0);
    const qty   = Math.max(1, Number(qtyEl.value || 1));
    const image = p.imageURL || (Array.isArray(p.images) && p.images[0]) || '';

    const item = {
      id: id,
      name: p.name + (variant && variant!=='default' ? ` (${variant})` : ''),
      price,
      quantity: qty,
      imageURL: image
    };

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const idx = cart.findIndex(x => x.name === item.name && Number(x.price) === Number(item.price));
    if (idx >= 0) cart[idx].quantity = Number(cart[idx].quantity||0) + qty;
    else cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));

    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = String(cart.reduce((s,i)=>s+Number(i.quantity||0),0));
    alert('Added to cart');
  };
})();
