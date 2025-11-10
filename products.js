// products.js — Category page renderer grouped by Brand
// Requirements:
// - firebase compat SDK + firebase-config.js already loaded (window.db available)
// - Each category page defines: window.PRODUCT_CATEGORY = 'perfume' | 'body' | ...
// - HTML contains: <div id="brand-container"></div>

(function () {
  const cat = String(window.PRODUCT_CATEGORY || "").toLowerCase();
  const wrap = document.getElementById("brand-container") || document.getElementById("product-grid");

  if (!wrap) return console.warn("products.js: missing #brand-container or #product-grid");

  // Helpers
  const getFromPrice = (p) => {
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes.map(s => Number((s && s.price) || 0)).filter(n => n > 0);
    return prices.length ? Math.min(...prices) : base;
  };

  const escapeHtml = (s = "") =>
    String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const productCardHTML = (id, p) => {
    const from = getFromPrice(p);
    const img = p.imageURL || (Array.isArray(p.images) && p.images[0]) || "https://via.placeholder.com/600x600?text=No+Image";
    return `
      <div class="product" data-name="${escapeHtml(p.name||'')}" data-brand="${escapeHtml(p.brand||'')}">
        <a href="product.html?id=${id}">
          <img src="${img}" alt="${escapeHtml(p.name||'')}">
        </a>
        <h3><a href="product.html?id=${id}">${escapeHtml(p.name||'')}</a></h3>
        ${p.brand ? `<div class="muted">${escapeHtml(p.brand)}</div>` : ""}
        <p class="price">${from > 0 ? "From Rs" + from : ""}</p>
      </div>
    `;
  };

  const renderEmpty = () => {
    wrap.innerHTML = `
      <div class="card" style="text-align:center">
        <p class="muted">No products found in this category yet.</p>
      </div>
    `;
  };

  const renderGroups = (groups) => {
    // Clear and render each brand group
    wrap.innerHTML = "";
    const brandNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    brandNames.forEach(brand => {
      const section = document.createElement("section");
      section.className = "brand-section";
      section.innerHTML = `
        <h2 class="brand-title">${escapeHtml(brand)}</h2>
        <div class="brand-grid"></div>
      `;
      const grid = section.querySelector(".brand-grid");
      groups[brand]
        .sort((a, b) => a.data.name.localeCompare(b.data.name))
        .forEach(item => {
          grid.insertAdjacentHTML("beforeend", productCardHTML(item.id, item.data));
        });
      wrap.appendChild(section);
    });
  };

  async function load() {
    if (!window.db) {
      wrap.innerHTML = `<div class="card"><p class="muted">Init error: database not ready.</p></div>`;
      return;
    }
    try {
      wrap.innerHTML = `<div class="card"><p class="muted">Loading…</p></div>`;
      const snap = await db.collection("products")
        .where("category", "==", cat)
        .where("active", "==", true)
        .get();

      if (snap.empty) return renderEmpty();

      // Build groups by brand (fallback "Other")
      const groups = {};
      snap.forEach(doc => {
        const data = doc.data() || {};
        const brand = (data.brand && String(data.brand).trim()) ? String(data.brand).trim() : "Other";
        if (!groups[brand]) groups[brand] = [];
        groups[brand].push({ id: doc.id, data });
      });

      renderGroups(groups);
    } catch (e) {
      console.error("Category load error:", e);
      wrap.innerHTML = `<div class="card"><p class="muted">Error loading products. Please try again.</p></div>`;
    }
  }

  load();
})();
