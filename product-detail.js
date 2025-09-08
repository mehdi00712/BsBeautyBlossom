// product-detail.js
// Renders a product detail page with:
// - Main hero image + clickable thumbnail gallery
// - Brand, description
// - Size select that updates price
// - Quantity controls
// - Add to Cart (saves to localStorage, updates cart count)

(function () {
  const $ = (sel) => document.querySelector(sel);
  const heroImg = $('#pd-hero-img');
  const thumbsEl = $('#pd-thumbs');
  const titleEl = $('#pd-title');
  const brandEl = $('#pd-brand');
  const priceEl = $('#pd-price');
  const descEl  = $('#pd-desc');
  const sizeSel = $('#size-select');
  const qtyVal  = $('#qty-val');
  const qtyInc  = $('#qty-inc');
  const qtyDec  = $('#qty-dec');
  const addBtn  = $('#add-to-cart');
  const detailWrap = $('#product-detail');
  const errBox = $('#pd-error');

  // Helpers
  const money = (n) => 'Rs' + Number(n || 0).toFixed(0);

  function getQueryId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('id') || '';
  }

  function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((s, i) => s + (Number(i.qty ?? i.quantity ?? 1) || 1), 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
  }

  function setHero(src) {
    heroImg.src = src || 'https://via.placeholder.com/800x800?text=No+Image';
  }

  function renderThumbs(images) {
    thumbsEl.innerHTML = '';
    images.forEach((src, idx) => {
      const t = document.createElement('img');
      t.src = src;
      t.alt = 'Thumbnail ' + (idx + 1);
      t.addEventListener('click', () => setHero(src));
      thumbsEl.appendChild(t);
    });
  }

  function renderSizes(p) {
    sizeSel.innerHTML = '';
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];

    if (sizes.length) {
      sizes.forEach(s => {
        const opt = document.createElement('option');
        const label = s?.label ?? '';
        const price = Number(s?.price ?? 0) || 0;
        opt.value = label;
        opt.dataset.price = String(price);
        opt.textContent = `${label} — ${money(price)}`;
        sizeSel.appendChild(opt);
      });
    } else {
      // Fallback to basePrice
      const base = Number(p.basePrice || 0) || 0;
      const opt = document.createElement('option');
      opt.value = 'default';
      opt.dataset.price = String(base);
      opt.textContent = money(base);
      sizeSel.appendChild(opt);
    }
  }

  function currentUnitPrice() {
    const opt = sizeSel.options[sizeSel.selectedIndex];
    return Number(opt?.dataset?.price || 0) || 0;
  }

  function updatePrice() {
    priceEl.textContent = money(currentUnitPrice());
  }

  function buildCartItem(p) {
    const qty = Number(qtyVal.textContent || '1') || 1;
    const price = currentUnitPrice();
    const sizeLabel = sizeSel.value && sizeSel.value !== 'default' ? ` (${sizeSel.value})` : '';
    const nameFull = (p.name || 'Product') + sizeLabel;
    const firstImg = (Array.isArray(p.images) && p.images[0]) || p.imageURL || '';

    return {
      id: p.id,
      name: nameFull,
      price: price,
      qty: qty,
      imageURL: firstImg
    };
  }

  function addToCart(item) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    // Check if same product+size already exists → merge qty
    const key = `${item.id}__${item.name}`;
    let merged = false;
    for (const it of cart) {
      const itKey = `${it.id || ''}__${it.name || ''}`;
      if (itKey === key) {
        it.qty = (Number(it.qty || it.quantity || 1) || 1) + item.qty;
        merged = true;
        break;
      }
    }
    if (!merged) cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
  }

  async function loadProduct() {
    try {
      const id = getQueryId();
      if (!id) throw new Error('Missing product id');

      const doc = await db.collection('products').doc(id).get();
      if (!doc.exists) throw new Error('Not found');

      const p = { id: doc.id, ...doc.data() };

      // Title & brand
      titleEl.textContent = p.name || 'Product';
      brandEl.textContent = p.brand ? String(p.brand) : '';
      brandEl.style.display = p.brand ? 'block' : 'none';

      // Description
      descEl.textContent = p.description || '—';

      // Images
      const images = (Array.isArray(p.images) && p.images.length ? p.images : [])
        .filter(Boolean);
      if (!images.length && p.imageURL) images.push(p.imageURL);

      setHero(images[0] || '');
      renderThumbs(images);

      // Sizes & price
      renderSizes(p);
      updatePrice();

      // Quantity controls
      qtyInc.addEventListener('click', () => {
        const q = Math.max(1, (Number(qtyVal.textContent || '1') || 1) + 1);
        qtyVal.textContent = String(q);
      });
      qtyDec.addEventListener('click', () => {
        const q = Math.max(1, (Number(qtyVal.textContent || '1') || 1) - 1);
        qtyVal.textContent = String(q);
      });
      sizeSel.addEventListener('change', updatePrice);

      // Add to cart
      addBtn.addEventListener('click', () => {
        const item = buildCartItem(p);
        if (!item.price) {
          alert('Please select a valid size.');
          return;
        }
        addToCart(item);
        alert('Added to cart!');
      });

      // Show detail, hide error
      detailWrap.style.display = 'grid';
      errBox.style.display = 'none';
      updateCartCount();
    } catch (e) {
      console.error('Product load error:', e);
      detailWrap.style.display = 'none';
      errBox.style.display = 'block';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProduct, { once: true });
  } else {
    loadProduct();
  }
})();
