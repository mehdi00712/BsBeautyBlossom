// products.js — groups products by brand into sections on category pages.
// Requires: firebase-config.js (sets window.db), script.js (navbar/cart), search.js (optional).
// Usage: on a category page, set:
//   window.PRODUCT_CATEGORY = 'perfume' (or body/skincare/...)
//   window.GROUP_BY_BRAND = true

(async function () {
  const gridHost = document.getElementById('product-grid');
  if (!gridHost) return;

  const category = String(window.PRODUCT_CATEGORY || '').toLowerCase();
  const groupByBrand = !!window.GROUP_BY_BRAND;

  // Helpers
  const money = (n) => 'Rs' + Number(n || 0).toFixed(0);
  const minPrice = (p) => {
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes
      .map((s) => Number((s && s.price) || 0))
      .filter((x) => x > 0);
    return prices.length ? Math.min(...prices) : base;
  };
  const safeBrand = (b) => (b && String(b).trim()) || 'Other';

  function productCard(id, p) {
    const from = minPrice(p);
    const img = p.imageURL || 'https://via.placeholder.com/600x750?text=No+Image';
    const brand = p.brand ? `<div class="muted">${p.brand}</div>` : '';
    return `
      <a class="product" href="product.html?id=${id}" data-name="${p.name || ''}" data-brand="${p.brand || ''}">
        <img src="${img}" alt="${p.name || ''}">
        <div class="pad">
          <h3>${p.name || ''}</h3>
          ${brand}
          <div class="price">${from > 0 ? 'From ' + money(from) : ''}</div>
        </div>
      </a>
    `;
  }

  async function load() {
    try {
      gridHost.innerHTML = `<p class="muted">Loading products…</p>`;
      const snap = await db
        .collection('products')
        .where('category', '==', category)
        .where('active', '==', true)
        .get();

      if (snap.empty) {
        gridHost.innerHTML = `<p class="muted">No products in this category yet.</p>`;
        return;
      }

      // Build list
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));

      if (!groupByBrand) {
        // Flat grid (legacy mode)
        gridHost.innerHTML = `<div class="product-grid"></div>`;
        const grid = gridHost.querySelector('.product-grid');
        items.forEach((p) => grid.insertAdjacentHTML('beforeend', productCard(p.id, p)));
        return;
      }

      // Group by brand
      const buckets = new Map();
      for (const p of items) {
        const key = safeBrand(p.brand);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(p);
      }

      // Sort brands A→Z, and items by name
      const brandNames = Array.from(buckets.keys()).sort((a, b) => a.localeCompare(b));
      gridHost.innerHTML = ''; // reset

      brandNames.forEach((brandName) => {
        const list = buckets.get(brandName).slice().sort((a, b) => {
          const an = (a.name || '').toLowerCase();
          const bn = (b.name || '').toLowerCase();
          return an.localeCompare(bn);
        });

        const section = document.createElement('section');
        section.className = 'brand-section';
        section.innerHTML = `
          <h2 class="brand-title">${brandName}</h2>
          <div class="brand-grid"></div>
        `;
        const grid = section.querySelector('.brand-grid');

        list.forEach((p) => grid.insertAdjacentHTML('beforeend', productCard(p.id, p)));

        gridHost.appendChild(section);
      });
    } catch (e) {
      console.error('Category load error:', e);
      gridHost.innerHTML = `<p class="muted">Couldn’t load products.</p>`;
    }
  }

  // Kick off
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
