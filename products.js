// products.js — render products for a category page
(async function(){
  if (!window.db) { console.error('No Firestore on this page.'); return; }

  const gridHost = document.getElementById('product-grid');
  if (!gridHost) return;

  const CAT = (window.PRODUCT_CATEGORY || '').toLowerCase();
  const GROUP = !!window.GROUP_BY_BRAND;

  function money(n){ return 'Rs'+Number(n||0).toFixed(0); }

  // Create a product card
  function cardFor(docId, p){
    const base = Number(p.basePrice||0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes.map(s=>Number(s?.price||0)).filter(n=>n>0);
    const from = prices.length ? Math.min(...prices) : base;
    const img = (Array.isArray(p.images) && p.images[0]) || p.imageURL || 'https://via.placeholder.com/600x600?text=No+Image';

    const wrap = document.createElement('div');
    wrap.className = 'product';
    wrap.setAttribute('data-name', p.name||'');
    wrap.setAttribute('data-brand', p.brand||'');
    wrap.innerHTML = `
      <a href="product.html?id=${docId}">
        <img src="${img}" alt="${p.name||''}">
      </a>
      <h3><a href="product.html?id=${docId}">${p.name||''}</a></h3>
      ${p.brand ? `<div class="muted">${p.brand}</div>` : ''}
      <p class="price">${from>0 ? 'From '+money(from) : ''}</p>
    `;
    return wrap;
  }

  async function load(){
    const snap = await db.collection('products')
      .where('category','==',CAT)
      .where('active','==',true)
      .orderBy('name')
      .get();

    if (snap.empty){
      gridHost.innerHTML = '<div class="product-grid"><p>No products</p></div>';
      return;
    }

    if (!GROUP){
      const grid = document.createElement('div');
      grid.className = 'product-grid';
      snap.forEach(d=>grid.appendChild(cardFor(d.id, d.data())));
      gridHost.innerHTML = '';
      gridHost.appendChild(grid);
    } else {
      // group by brand
      const byBrand = {};
      snap.forEach(d=>{
        const p = d.data();
        const brand = (p.brand||'Other').trim() || 'Other';
        byBrand[brand] = byBrand[brand] || [];
        byBrand[brand].push({id:d.id, data:p});
      });
      gridHost.innerHTML = '';
      Object.keys(byBrand).sort().forEach(b=>{
        const sec = document.createElement('div');
        sec.className = 'brand-section';
        sec.innerHTML = `<h2 class="brand-title">${b}</h2>`;
        const grid = document.createElement('div');
        grid.className = 'brand-grid';
        byBrand[b].forEach(({id,data}) => grid.appendChild(cardFor(id, data)));
        sec.appendChild(grid);
        gridHost.appendChild(sec);
      });
    }
  }

  await load();
})();
