// products.js — robust category loader with clear errors
(function () {
  const grid = document.getElementById('product-grid');
  const searchInput = document.getElementById('search-bar'); // optional live filter

  function show(msg) {
    if (!grid) return;
    grid.innerHTML = `<p style="padding:12px">${msg}</p>`;
  }

  // Guard: Firebase must be ready
  if (!window.firebase) { show('Init error: Firebase SDK not loaded'); return; }
  if (!window.db) { show('Init error: firebase-config.js did not initialize Firestore'); return; }

  const CAT = (window.PRODUCT_CATEGORY || '').toLowerCase(); // e.g. 'perfume'
  if (!CAT) { show('Init error: PRODUCT_CATEGORY not set on this page'); return; }

  // Render helpers
  function priceFrom(p) {
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes
      .map(s => Number((s && s.price) || 0))
      .filter(n => n > 0);
    return prices.length ? Math.min(...prices) : base;
  }

  function cardHTML(id, p) {
    const img = (p.images && p.images[0]) || p.imageURL || 'https://via.placeholder.com/600x600?text=No+Image';
    const from = priceFrom(p);
    const brand = p.brand ? `<div class="muted">${p.brand}</div>` : '';
    const price = from > 0 ? `<p class="price">From Rs${from}</p>` : '';
    // Card
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

  async function load() {
    try {
      show('Loading…');

      // Query products for this category that are active
      const snap = await db.collection('products')
        .where('category', '==', CAT)
        .where('active', '==', true)
        .orderBy('name')
        .get();

      if (snap.empty) {
        show(`No products in “${CAT}”. Tip: check Firestore “products” docs: category must be exactly “${CAT}” (lower-case) and active=true.`);
        return;
      }

      const items = [];
      snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

      // Render list
      grid.innerHTML = items.map(p => cardHTML(p.id, p)).join('');

      // Optional: simple client-side filtering by name/brand
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const q = searchInput.value.trim().toLowerCase();
          const cards = grid.querySelectorAll('.product');
          let visible = 0;
          cards.forEach(c => {
            const name = c.getAttribute('data-name')?.toLowerCase() || '';
            const brand = c.getAttribute('data-brand')?.toLowerCase() || '';
            const showCard = !q || name.includes(q) || brand.includes(q);
            c.style.display = showCard ? '' : 'none';
            if (showCard) visible++;
          });
          if (!visible) {
            grid.insertAdjacentHTML('beforeend',
              `<p style="grid-column:1/-1;padding:8px">No matches for “${q}”.</p>`);
          } else {
            // remove any previous “No matches” messages
            grid.querySelectorAll('p').forEach(p => {
              if (p.textContent?.startsWith('No matches for')) p.remove();
            });
          }
        });
      }
    } catch (e) {
      console.error(e);
      show('Error loading products. Open console for details.');
    }
  }

  load();
})();
