// product-detail.js — safe to include on any page
(function(){
  // Only run on product.html where #product-main exists
  const main = document.getElementById('product-main');
  if (!main) return;

  const bigImg     = document.getElementById('product-image');
  const thumbWrap  = document.getElementById('product-thumbs');
  const qtyMinus   = document.getElementById('qty-minus');
  const qtyPlus    = document.getElementById('qty-plus');
  const qtyInput   = document.getElementById('qty');
  const sizeSelect = document.getElementById('size');
  const priceLabel = document.getElementById('price');
  const addBtn     = document.getElementById('add-to-cart');
  const nameEl     = document.getElementById('product-name');
  const brandEl    = document.getElementById('product-brand');
  const descEl     = document.getElementById('product-desc');

  function computePrice(){
    if (!sizeSelect) return 0;
    const opt = sizeSelect.selectedOptions[0];
    const p = Number(opt?.dataset?.price || 0);
    if (priceLabel) priceLabel.textContent = p > 0 ? `Rs${p}` : 'Rs0';
    return p;
  }

  // Thumbnails → swap big image
  if (thumbWrap) {
    thumbWrap.addEventListener('click', (e)=>{
      const t = e.target.closest('[data-src]');
      if (!t) return;
      const src = t.getAttribute('data-src');
      if (bigImg) bigImg.src = src;
      thumbWrap.querySelectorAll('[data-src].active').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
    });
  }

  // Qty controls
  if (qtyMinus) qtyMinus.addEventListener('click', ()=>{
    const v = Number(qtyInput?.value || 1);
    if (qtyInput) qtyInput.value = Math.max(1, v-1);
  });
  if (qtyPlus) qtyPlus.addEventListener('click', ()=>{
    const v = Number(qtyInput?.value || 1);
    if (qtyInput) qtyInput.value = v+1;
  });

  // Size change
  if (sizeSelect) {
    sizeSelect.addEventListener('change', computePrice);
  }
  computePrice();

  // Add to cart
  if (addBtn) {
    addBtn.addEventListener('click', ()=>{
      const name = nameEl?.textContent?.trim() || 'Product';
      const brand= brandEl?.textContent?.trim() || '';
      const qty  = Number(qtyInput?.value || 1);
      const opt  = sizeSelect?.selectedOptions?.[0];
      const size = opt ? opt.value : '';
      const unit = Number(opt?.dataset?.price || 0);
      const img  = bigImg?.src || '';

      const itemName = size ? `${name} (${size})` : name;
      const cartItem = { name: itemName, brand, price: unit, quantity: qty, imageURL: img };

      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const idx = cart.findIndex(i => i.name === cartItem.name && i.price === cartItem.price);
      if (idx >= 0) cart[idx].quantity += qty;
      else cart.push(cartItem);
      localStorage.setItem('cart', JSON.stringify(cart));

      // update cart badge
      const badge = document.getElementById('cart-count');
      if (badge) {
        const total = cart.reduce((s,i)=> s + Number(i.quantity||0), 0);
        badge.textContent = total;
      }

      alert('Added to cart!');
    });
  }
})();
