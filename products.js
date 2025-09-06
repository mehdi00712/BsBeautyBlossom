// products.js — renders a category grid from Firestore and enables search.js
(async function(){
  if (!window.db) {
    console.error('products.js: Firestore not available (firebase-config.js must run first)');
    return;
  }

  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const cat = (window.PRODUCT_CATEGORY || '').toLowerCase();
  let all = [];

  function minPrice(p) {
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes.map(s => Number((s && s.price) || 0)).filter(n => n > 0);
    return prices.length ? Math.min(...prices) : base;
  }

  function render(list){
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p>No products</p>';
      if (window.applySearch) window.applySearch();
      return;
    }

    list.forEach(({id, data: p}) => {
      const from = minPrice(p);
      const card = document.createElement('div');
      card.className = 'product';
      // expose searchable fields
      card.setAttribute('data-name',  p.name  || '');
      card.setAttribute('data-brand', p.brand || '');

      card.innerHTML = `
        <a href="product.html?id=${id}">
          <img src="${p.imageURL || 'https://via.placeholder.com/600x600?text=No+Image'}" alt="${(p.name||'').replace(/"/g,'&quot;')}">
        </a>
        <h3><a href="product.html?id=${id}">${p.name || ''}</a></h3>
        ${p.brand ? `<div class="muted">${p.brand}</div>` : ''}
        <p class="price">${from > 0 ? 'From Rs' + from : ''}</p>
      `;
      grid.appendChild(card);
    });

    // let the search bar filter the freshly-rendered cards
    if (window.applySearch) window.applySearch();
  }

  async function load(){
    grid.innerHTML = '<p>Loading…</p>';
    try {
      const snap = await db.collection('products')
        .where('category','==',cat)
        .where('active','==',true)
        .get();

      all = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      render(all);
    } catch (e) {
      console.error('products load error:', e);
      grid.innerHTML = `<p style="color:#ff9c9c">Error: ${e.message}</p>`;
    }
  }

  load();
})();
