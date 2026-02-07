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
  const oldPriceEl = document.getElementById('old-price');   // optional
  const addBtn     = document.getElementById('add-to-cart');
  const nameEl     = document.getElementById('product-name');
  const brandEl    = document.getElementById('product-brand');
  const descEl     = document.getElementById('product-desc');

  // thumbs arrows (optional)
  const thumbPrev  = document.getElementById('thumbPrev');
  const thumbNext  = document.getElementById('thumbNext');

  // Product data injected from Firestore in product.html loader
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

  // Thumbnails → swap big image (bind once)
  if (thumbWrap && !thumbWrap.dataset.bound) {
    thumbWrap.dataset.bound = "1";
    thumbWrap.addEventListener('click', (e)=>{
      const t = e.target.closest('img[data-src]');
      if (!t) return;
      const src = t.getAttribute('data-src');
      if (bigImg) bigImg.src = src;
      thumbWrap.querySelectorAll('img.active').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
    });
  }

  // ✅ Arrow controls for thumbnail scroller (bind once)
  function bindThumbArrows(){
    if (!thumbWrap || !thumbPrev || !thumbNext) return;

    // Ensure the thumbs container is scrollable (some CSS might override)
    if (!thumbWrap.style.overflowX) thumbWrap.style.overflowX = "auto";
    if (!thumbWrap.style.overflowY) thumbWrap.style.overflowY = "hidden";
    if (!thumbWrap.style.scrollBehavior) thumbWrap.style.scrollBehavior = "smooth";

    if (thumbWrap.dataset.arrowBound === "1") return;
    thumbWrap.dataset.arrowBound = "1";

    const step = () => Math.max(240, Math.floor(thumbWrap.clientWidth * 0.8));

    function update(){
      const max = Math.max(0, thumbWrap.scrollWidth - thumbWrap.clientWidth - 2);

      const needsScroll = thumbWrap.scrollWidth > thumbWrap.clientWidth + 2;

      // IMPORTANT: don't hide arrows (you said you want them)
      thumbPrev.style.display = "";
      thumbNext.style.display = "";

      // Disable if not needed / at edge
      thumbPrev.disabled = !needsScroll || thumbWrap.scrollLeft <= 2;
      thumbNext.disabled = !needsScroll || thumbWrap.scrollLeft >= max;
    }

    function safeScrollBy(dx){
      try{
        thumbWrap.scrollBy({ left: dx, behavior: "smooth" });
      }catch{
        // fallback for older browsers
        thumbWrap.scrollLeft += dx;
      }
      setTimeout(update, 220);
    }

    // Bind clicks
    if (!thumbPrev.dataset.bound) {
      thumbPrev.dataset.bound = "1";
      thumbPrev.addEventListener("click", (e)=>{
        e.preventDefault();
        e.stopPropagation();
        safeScrollBy(-step());
      });
    }

    if (!thumbNext.dataset.bound) {
      thumbNext.dataset.bound = "1";
      thumbNext.addEventListener("click", (e)=>{
        e.preventDefault();
        e.stopPropagation();
        safeScrollBy(step());
      });
    }

    // Keep state updated
    thumbWrap.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    // initial state (after thumbs/images render)
    requestAnimationFrame(update);
    setTimeout(update, 250);
    setTimeout(update, 900);

    // When images load late, width changes → re-check
    thumbWrap.querySelectorAll("img").forEach(img=>{
      img.addEventListener("load", update, { once: true });
      img.addEventListener("error", update, { once: true });
    });
  }

  // Try bind now + again shortly (covers late rendered thumbs)
  bindThumbArrows();
  setTimeout(bindThumbArrows, 400);

  // Qty controls (bind once)
  if (qtyMinus && qtyInput && !qtyMinus.dataset.bound) {
    qtyMinus.dataset.bound = "1";
    qtyMinus.addEventListener('click', ()=>{
      const v = Number(qtyInput.value || 1);
      qtyInput.value = Math.max(1, v - 1);
    });
  }

  if (qtyPlus && qtyInput && !qtyPlus.dataset.bound) {
    qtyPlus.dataset.bound = "1";
    qtyPlus.addEventListener('click', ()=>{
      const v = Number(qtyInput.value || 1);
      qtyInput.value = v + 1;
    });
  }

  // sanitize manual typing
  if (qtyInput && !qtyInput.dataset.sanitize) {
    qtyInput.dataset.sanitize = "1";
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

  // Add to cart (bind once)
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

      const badge = document.getElementById('cart-count');
      if (badge) {
        const total = cart.reduce((s,i)=> s + Number(i.quantity||0), 0);
        badge.textContent = total;
      }

      alert('Added to cart!');
    });
  }
})();
