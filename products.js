// products.js — render category grid + enable search
(async function(){
  if (window.__PROD_LIST_INIT__) return;
  window.__PROD_LIST_INIT__ = true;

  if (!window.db) { console.error('products.js: Firestore not available'); return; }
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const cat = (window.PRODUCT_CATEGORY || '').toLowerCase();
  function minPrice(p){
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes.map(s => Number((s && s.price) || 0)).filter(n => n > 0);
    return prices.length ? Math.min(...prices) : base;
  }

  async function load(){
    grid.innerHTML = '<p>Loading…</p>';
    try{
      const snap = await db.collection('products')
        .where('category','==',cat)
        .where('active','==',true).get();

      grid.innerHTML = '';
      if (snap.empty){ grid.innerHTML = '<p>No products</p>'; if(window.applySearch) window.applySearch(); return; }

      snap.forEach(d=>{
        const p = d.data(); const id = d.id; const from = minPrice(p);
        const card = document.createElement('div');
        card.className = 'product';
        card.setAttribute('data-name', p.name || '');
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
      if (window.applySearch) window.applySearch();
    }catch(e){
      console.error('products load error:', e);
      grid.innerHTML = `<p style="color:#ff9c9c">Error: ${e.message}</p>`;
    }
  }
  load();
})();
