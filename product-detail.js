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
  const oldPriceEl = document.getElementById('old-price');   // ⭐ Add in product.html
  const addBtn     = document.getElementById('add-to-cart');
  const nameEl     = document.getElementById('product-name');
  const brandEl    = document.getElementById('product-brand');
  const descEl     = document.getElementById('product-desc');

  // ✅ thumbs arrows (optional on pages that include them)
  const thumbPrev  = document.getElementById('thumbPrev');
  const thumbNext  = document.getElementById('thumbNext');

  // 🔥 Product data injected from Firestore in product.js
  const data = window.__productData || {};

  /** Compute price with discount logic */
  function computePrice(){
    if (!sizeSelect) return 0;

    const opt = sizeSelect.selectedOptions[0];
    const base = Number(opt?.dataset?.price || 0);

    const hasDiscount = data.discountPrice && Number(data.discountPrice) > 0;

    let finalPrice = base;

    if (hasDiscount) {
      const discount = Number(data.discountPrice);
      finalPrice = discount < base ? discount : base;

      // Show old price
      if (oldPriceEl) {
        oldPriceEl.style.display = "inline-block";
        oldPriceEl.textContent = "Rs" + base;
      }
    } else {
      if (oldPriceEl) oldPriceEl.style.display = "none";
    }

    if (priceLabel) priceLabel.textContent = `Rs${finalPrice}`;
    return finalPrice;
  }

  // Thumbnails → swap big image
  if (thumbWrap && !thumbWrap.dataset.bound) {
    thumbWrap.dataset.bound = "1";
    thumbWrap.addEventListener('click', (e)=>{
      const t = e.target.closest('[data-src]');
      if (!t) return;
      const src = t.getAttribute('data-src');
      if (bigImg) bigImg.src = src;
      thumbWrap.querySelectorAll('[data-src].active').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
    });
  }

  // ✅ Thumbs arrows (scroll left/right) — binds ONLY ONCE
  (function bindThumbArrows(){
    if (!thumbWrap || !thumbPrev || !thumbNext) return;
    if (thumbWrap.dataset.arrowBound === "1") return;
    thumbWrap.dataset.arrowBound = "1";

    const step = () => Math.max(200, Math.floor(thumbWrap.clientWidth * 0.7));

    function update(){
      const max = thumbWrap.scrollWidth - thumbWrap.clientWidth - 2;
      thumbPrev.disabled = thumbWrap.scrollLeft <= 2;
      thumbNext.disabled = thumbWrap.scrollLeft >= max;
    }

    if (!thumbPrev.dataset.bound){
      thumbPrev.dataset.bound = "1";
      thumbPrev.addEventListener("click", ()=> thumbWrap.scrollBy({ left: -step(), behavior: "smooth" }));
    }
    if (!thumbNext.dataset.bound){
      thumbNext.dataset.bound = "1";
      thumbNext.addEventListener("click", ()=> thumbWrap.scrollBy({ left:  step(), behavior: "smooth" }));
    }

    thumbWrap.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    setTimeout(update, 150);
  })();

  // ✅ Qty controls (bind ONLY ONCE even if script loads multiple times)
  if (qtyMinus && qtyInput && !qtyMinus.dataset.bound) {
    qtyMinus.dataset.bound = "1";
    qtyMinus.addEventListener('click', ()=>{
      const v = Number(qtyInput?.value || 1);
      qtyInput.value = Math.max(1, v - 1);
    });
  }

  if (qtyPlus && qtyInput && !qtyPlus.dataset.bound) {
    qtyPlus.dataset.bound = "1";
    qtyPlus.addEventListener('click', ()=>{
      const v = Number(qtyInput?.value || 1);
      qtyInput.value = v + 1; // ✅ ALWAYS +1
    });
  }

  // ✅ If user types manually (or mobile stepper), sanitize to >= 1
  if (qtyInput && !qtyInput.dataset.bound) {
    qtyInput.dataset.bound = "1";
    qtyInput.addEventListener("input", ()=>{
      const n = Number(qtyInput.value);
      if (!Number.isFinite(n) || n < 1) qtyInput.value = 1;
    });
    qtyInput.addEventListener("blur", ()=>{
      const n = Number(qtyInput.value);
      if (!Number.isFinite(n) || n < 1) qtyInput.value = 1;
    });
  }

  // Size change
  if (sizeSelect && !sizeSelect.dataset.bound) {
    sizeSelect.dataset.bound = "1";
    sizeSelect.addEventListener('change', computePrice);
  }

  computePrice();

  // Add to cart (bind ONLY ONCE)
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = "1";
    addBtn.addEventListener('click', ()=>{
      const name = nameEl?.textContent?.trim() || 'Product';
      const brand= brandEl?.textContent?.trim() || '';
      const qty  = Number(qtyInput?.value || 1);
      const opt  = sizeSelect?.selectedOptions?.[0];
      const size = opt ? opt.value : '';
      const img  = bigImg?.src || '';

      const basePrice = Number(opt?.dataset?.price || 0);

      // ⭐ Apply discount
      const finalPrice = (data.discountPrice && Number(data.discountPrice) > 0)
        ? Math.min(Number(data.discountPrice), basePrice)
        : basePrice;

      const itemName = size ? `${name} (${size})` : name;

      const cartItem = {
        name: itemName,
        brand,
        price: finalPrice,
        quantity: qty,
        imageURL: img
      };

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
