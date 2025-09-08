// products.js — category loader with client-side sorting & loud diagnostics
(function () {
  const grid = document.getElementById('product-grid');
  const searchInput = document.getElementById('search-bar');
  const sortSel = document.getElementById('sort');

  function ui(msg) {
    if (!grid) return;
    grid.innerHTML = `<p style="padding:12px">${msg}</p>`;
  }

  // Guards
  if (!window.firebase) { ui('Init error: Firebase SDK not loaded'); return; }
  if (!window.db) { ui('Init error: firebase-config.js did not initialize Firestore'); return; }

  const CAT = (window.PRODUCT_CATEGORY || '').toLowerCase();
  if (!CAT) { ui('Init error: PRODUCT_CATEGORY not set on this page'); return; }

  // Helpers
  function priceFrom(p) {
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes.map(s => Number((s?.price) || 0)).filter(n => n > 0);
    return prices.length ? Math.min(...prices) : base;
  }

  function cardHTML(id, p) {
    const img = (p.images && p.images[0]) || p.imageURL || 'https://via.placeholder.com/600x600?text=No+Image';
    const from = priceFrom(p);
    const brand = p.brand ? `<div class="muted">${p.brand}</div>` : '';
    const price = from > 0 ? `<p class="price">From Rs${from}</p>` : '';
    return `
      <div class="product" data-name="${(p.name||'')}" data-brand="${(p.brand||'')}">
        <a href="product.html?id=${id}">
          <img src="${img}" alt="${p.name||''}">
        </a>
        <h3><a href="product.html?id=${id}">${p.name || ''}</a></h3>
        ${brand}
        ${price}
        <button onclick="location.href='product.html?id=${id}'">View</button>
      </div>
    `;
  }

  function render(items) {
    if (!items.length) {
      ui(`No products in “${CAT}”. Tip: Firestore “products” docs need { category: "${CAT}", active: true }.`);
      return;
    }
    grid.innerHTML = items.map(p => cardHTML(p.id, p)).join('');
  }

  function sortItems(items, mode) {
    const toName = x => String(x.name||'');
    const toPrice = x => priceFrom(x);
    if (mode === 'az') items.sort((a,b)=> toName(a).localeCompare(toName(b), undefined, {sensitivity:'base'}));
    else if (mode === 'za') items.sort((a,b)=> toName(b).localeCompare(toName(a), undefined, {sensitivity:'base'}));
    else if (mode === 'low') items.sort((a,b)=> toPrice(a) - toPrice(b));
    else if (mode === 'high') items.sort((a,b)=> toPrice(b) - toPrice(a));
  }

  let ALL = [];

  async function load() {
    try {
      ui('Loading…');

      const snap = await db.collection('products')
        .where('category', '==', CAT)
        .where('active', '==', true)
        .get();

      if (snap.empty) { render([]); return; }

      ALL = [];
      snap.forEach(doc => ALL.push({ id: doc.id, ...doc.data() }));

      // Default sort by name A–Z
      sortItems(ALL, 'az');
      render(ALL);
      bindSearch();
      bindSort();
    } catch (e) {
      console.error('[products.js] Load error:', e);
      ui('Error loading products. Open console for details.');
    }
  }

  function bindSort() {
    if (!sortSel) return;
    sortSel.addEventListener('change', ()=>{
      const copy = ALL.slice();
      sortItems(copy, sortSel.value);
      render(copy);
      if (searchInput && searchInput.value.trim()) {
        applySearch(searchInput.value.trim().toLowerCase());
      }
    });
  }

  function applySearch(q) {
    const cards = grid.querySelectorAll('.product');
    let visible = 0;
    cards.forEach(c => {
      const name = c.getAttribute('data-name')?.toLowerCase() || '';
      const brand = c.getAttribute('data-brand')?.toLowerCase() || '';
      const showCard = !q || name.includes(q) || brand.includes(q);
      c.style.display = showCard ? '' : 'none';
      if (showCard) visible++;
    });
    // remove old “no matches”
    grid.querySelectorAll('p._nomatch').forEach(el=>el.remove());
    if (!visible) {
      grid.insertAdjacentHTML('beforeend',
        `<p class="_nomatch" style="grid-column:1/-1;padding:8px">No matches for “${q}”.</p>`);
    }
  }

  function bindSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', ()=>{
      applySearch(searchInput.value.trim().toLowerCase());
    });
  }

  load();
})();
