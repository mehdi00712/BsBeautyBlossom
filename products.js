// products.js — render category grid with ml/flavour variants (no stock)
(async function () {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const cat = (window.PRODUCT_CATEGORY || '').toLowerCase();

  function cardHTML(p, id) {
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const opts = (sizes.length
      ? sizes.map(s => {
          const price = Number(s.price || 0);
          return `<option value="${s.label}" data-price="${price}">${s.label} - Rs${price}</option>`;
        }).join('')
      : `<option value="default" data-price="${Number(p.basePrice||0)}">Default - Rs${Number(p.basePrice||0)}</option>`
    );

    return `
      <div class="product">
        <a href="product.html?id=${id}">
          <img src="${p.imageURL || 'https://via.placeholder.com/600x600?text=No+Image'}" alt="${p.name||''}">
        </a>
        <h3><a href="product.html?id=${id}">${p.name||''}</a></h3>
        ${p.brand ? <div class="muted">${p.brand}</div> : ''}
        <div class="buy-row">
          <select class="variant">${opts}</select>
          <div class="qty">
            <button class="minus" type="button">−</button>
            <input class="q" type="number" value="1" min="1" step="1">
            <button class="plus" type="button">+</button>
          </div>
          <button class="add">Add</button>
        </div>
      </div>
    `;
  }

  function attachHandlers(cardEl, p) {
    const sel = cardEl.querySelector('.variant');
    const q   = cardEl.querySelector('.q');
    const plus= cardEl.querySelector('.plus');
    const minus= cardEl.querySelector('.minus');
    const add = cardEl.querySelector('.add');

    plus.onclick = () => { q.value = String(Math.max(1, Number(q.value||1) + 1)); };
    minus.onclick= () => { q.value = String(Math.max(1, Number(q.value||1) - 1)); };

    add.onclick = () => {
      const opt = sel.options[sel.selectedIndex];
      const variant = opt.value;
      const price = Number(opt.dataset.price || 0);
      const qty = Math.max(1, Number(q.value || 1));
      const image = p.imageURL || (Array.isArray(p.images) && p.images[0]) || '';

      const item = {
        id: p.id,
        name: p.name + (variant && variant!=='default' ? ` (${variant})` : ''),
        price,
        quantity: qty,
        imageURL: image
      };

      addToCart(item);
    };
  }

  function addToCart(item) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const idx = cart.findIndex(x => x.name === item.name && Number(x.price) === Number(item.price));
    if (idx >= 0) {
      cart[idx].quantity = Number(cart[idx].quantity || 0) + Number(item.quantity || 1);
    } else {
      cart.push(item);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    const count = cart.reduce((s,i)=>s+Number(i.quantity||0),0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = String(count);
    alert('Added to cart');
  }

  // Load products for this category
  const snap = await db.collection('products')
    .where('category','==',cat)
    .where('active','==',true)
    .get();

  grid.innerHTML = '';
  if (snap.empty) {
    grid.innerHTML = '<p>No products</p>';
    return;
  }
  snap.forEach(d => {
    const p = d.data(); p.id = d.id;
    const div = document.createElement('div');
    div.innerHTML = cardHTML(p, d.id);
    const cardEl = div.firstElementChild;
    grid.appendChild(cardEl);
    attachHandlers(cardEl, p);
  });
})();
