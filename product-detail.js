// product-detail.js — gallery + normalized sizes + safe pricing
(function () {
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  const main = $('#pd-main');
  const thumbs = $('#pd-thumbs');
  const title = $('#pd-title');
  const brand = $('#pd-brand');
  const price = $('#pd-price');
  const desc = $('#pd-desc');
  const sizeSel = $('#pd-size');
  const qtyEl = $('#pd-qty');
  const minus = $('#pd-minus');
  const plus = $('#pd-plus');
  const addBtn = $('#pd-add');

  if (!id) {
    title.textContent = 'Product not found';
    main.src = 'https://via.placeholder.com/800x800?text=Product+Not+Found';
    return;
  }

  function normalizeSizes(raw, basePrice) {
    const base = Number(basePrice || 0) || 0;
    const out = [];
    if (!Array.isArray(raw)) { if (base > 0) out.push({ label: 'Default', price: base }); return out; }
    for (const s of raw) {
      if (s && typeof s === 'object' && 'label' in s) {
        const p = Number(s.price || 0);
        if (s.label && p > 0) out.push({ label: String(s.label), price: p });
        continue;
      }
      if (typeof s === 'string') {
        const m = s.trim().match(/^(.*?)[\s|:\-–—]*\s*(?:Rs)?\s*([\d.,]+)\s*$/i);
        if (m) {
          const label = m[1].trim().replace(/[|:\-–—]$/, '').trim();
          const p = Number((m[2] || '0').replace(/[^\d.]/g, ''));
          if (label && p > 0) out.push({ label, price: p });
        }
      }
    }
    if (!out.length && base > 0) out.push({ label: 'Default', price: base });
    return out;
  }

  const setPriceText = (p) => { price.textContent = p ? `From Rs${p}` : ''; };

  function renderImages(images = [], imageURL = '') {
    const list = images && images.length ? images : (imageURL ? [imageURL] : []);
    if (list.length) {
      main.src = list[0];
      thumbs.innerHTML = '';
      list.forEach((u, idx) => {
        const img = document.createElement('img');
        img.className = 'pd-thumb';
        img.src = u; img.alt = `thumb ${idx + 1}`;
        img.onclick = () => { main.src = u; };
        thumbs.appendChild(img);
      });
    } else {
      main.src = 'https://via.placeholder.com/800x800?text=No+Image';
      thumbs.innerHTML = '';
    }
  }

  function renderSizes(normSizes, base) {
    sizeSel.innerHTML = '';
    if (normSizes.length) {
      normSizes.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.label;
        opt.textContent = `${s.label} - Rs${s.price}`;
        opt.dataset.price = s.price;
        sizeSel.appendChild(opt);
      });
      setPriceText(Number(normSizes[0].price));
    } else {
      const b = Number(base || 0) || 0;
      const opt = document.createElement('option');
      opt.value = 'Default';
      opt.textContent = `Rs${b}`;
      opt.dataset.price = b;
      sizeSel.appendChild(opt);
      setPriceText(b);
    }
  }

  minus.onclick = () => { const n = Math.max(1, Number(qtyEl.textContent) - 1); qtyEl.textContent = n; };
  plus.onclick = () => { qtyEl.textContent = Number(qtyEl.textContent) + 1; };

  db.collection('products').doc(id).get().then(doc => {
    if (!doc.exists) {
      title.textContent = 'Product not found';
      main.src = 'https://via.placeholder.com/800x800?text=Product+Not+Found';
      return;
    }
    const p = doc.data();
    const normSizes = normalizeSizes(p.sizes, p.basePrice);

    title.textContent = p.name || 'Product';
    brand.textContent = p.brand ? `by ${p.brand}` : '';
    desc.textContent = p.description || '';
    renderImages(p.images, p.imageURL);
    renderSizes(normSizes, p.basePrice);

    addBtn.onclick = () => {
      const sel = sizeSel.options[sizeSel.selectedIndex];
      let unitPrice = Number(sel?.dataset?.price || 0);
      if (!unitPrice || unitPrice <= 0) unitPrice = (normSizes[0]?.price || Number(p.basePrice || 0) || 0);
      if (!unitPrice || unitPrice <= 0) return alert('This product has no valid price set.');

      const qty = Math.max(1, Number(qtyEl.textContent || 1));
      const nameSafe = (p.name || '').trim();

      const key = 'bbb_cart_v2';
      const cart = JSON.parse(localStorage.getItem(key) || '[]');
      const idKey = `${nameSafe}__${unitPrice}__${sel?.value || 'Default'}`;
      const found = cart.find(i => i.id === idKey);
      if (found) found.qty += qty;
      else cart.push({ id: idKey, name: `${nameSafe} (${sel?.value || 'Default'})`, unitPrice, qty, imageURL: (p.images && p.images[0]) || p.imageURL || '' });

      localStorage.setItem(key, JSON.stringify(cart));
      const count = cart.reduce((n, i) => n + (i.qty || 0), 0);
      const cc = document.getElementById('cart-count'); if (cc) cc.textContent = count;

      addBtn.textContent = 'Added ✓';
      setTimeout(() => addBtn.textContent = 'Add to Cart', 1200);
    };
  }).catch(err => {
    console.error(err);
    title.textContent = 'Error loading product';
    main.src = 'https://via.placeholder.com/800x800?text=Error';
  });
})();
