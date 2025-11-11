// products.js — Category page renderer (grouped by Brand when requested)
// Requirements:
// - firebase compat SDK + firebase-config.js already loaded (window.db available)
// - Each category page sets: window.PRODUCT_CATEGORY = 'perfume' | 'body' | ...
// - Page has: <div id="brand-container"></div> OR <div id="product-grid"></div>

(function () {
  console.log("✅ products.js loaded");

  // ---------- Ensure Firestore is ready ----------
  if (!window.db) {
    console.error("Firestore not ready. Check firebase-config.js initialization.");
    const wrap = document.getElementById("product-grid") || document.getElementById("brand-container");
    if (wrap) wrap.innerHTML = `<div class="card"><p class="muted">⚠️ Database not initialized.</p></div>`;
    return;
  }

  // ---------- Identify target + category ----------
  const cat  = String(window.PRODUCT_CATEGORY || "").toLowerCase();
  const wrap = document.getElementById("brand-container") || document.getElementById("product-grid");
  if (!wrap) {
    console.error("products.js: missing #brand-container or #product-grid");
    return;
  }

  const GROUP_BY_BRAND = !!window.GROUP_BY_BRAND; // if true => render sections per brand; else one flat grid

  // ---------- Helpers ----------
  const getFromPrice = (p) => {
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes.map(s => Number(s?.price || 0)).filter(n => n > 0);
    return prices.length ? Math.min(...prices) : base;
  };

  const escapeHtml = (s = "") =>
    String(s).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));

  const isOutOfStock = (p) => {
    // honor both the boolean-ish numeric `stock` and the explicit `stockStatus`
    if (String(p.stockStatus || "").toLowerCase() === "out") return true;
    const n = Number(p.stock);
    if (!isNaN(n)) return n <= 0;
    return false;
  };

  // ---------- Product Card ----------
  const productCardHTML = (id, p) => {
    const from = getFromPrice(p);
    const img =
      p.imageURL ||
      (Array.isArray(p.images) && p.images[0]) ||
      "https://via.placeholder.com/600x600?text=No+Image";

    const out = isOutOfStock(p);

    return `
      <div class="product ${out ? "out-of-stock" : ""}"
           data-name="${escapeHtml(p.name || "")}"
           data-brand="${escapeHtml(p.brand || "")}">
        <a href="product.html?id=${id}">
          <div class="img-wrap" style="position:relative">
            <img src="${img}" alt="${escapeHtml(p.name || "")}">
            ${out ? `<span class="soldout-tag">Out of Stock</span>` : ""}
          </div>
        </a>
        <h3><a href="product.html?id=${id}">${escapeHtml(p.name || "")}</a></h3>
        ${p.brand ? `<div class="muted">${escapeHtml(p.brand)}</div>` : ""}
        <p class="price">${from > 0 ? "From Rs" + from : ""}</p>
      </div>
    `;
  };

  // ---------- Empty Renderer ----------
  const renderEmpty = () => {
    wrap.innerHTML = `
      <div class="card" style="text-align:center">
        <p class="muted">No products found in this category yet.</p>
      </div>
    `;
  };

  // ---------- Grouped-by-brand Renderer ----------
  const renderGroups = (groups) => {
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

  // ---------- Flat grid Renderer (for pages that sort the .product-grid) ----------
  const renderFlatGrid = (items) => {
    wrap.innerHTML = `<div class="product-grid"></div>`;
    const grid = wrap.querySelector(".product-grid");
    items
      .sort((a, b) => a.data.name.localeCompare(b.data.name))
      .forEach(item => {
        grid.insertAdjacentHTML("beforeend", productCardHTML(item.id, item.data));
      });
  };

  // ---------- Loader ----------
  async function load() {
    try {
      wrap.innerHTML = `<div class="card"><p class="muted">Loading…</p></div>`;

      // pull all active products; we'll filter category locally (case-insensitive)
      const snap = await db.collection("products")
        .where("active", "==", true)
        .get();

      if (snap.empty) {
        renderEmpty();
        return;
      }

      const products = snap.docs
        .map(doc => ({ id: doc.id, data: doc.data() || {} }))
        .filter(item => String(item.data.category || "").toLowerCase() === cat);

      if (!products.length) {
        renderEmpty();
        return;
      }

      if (GROUP_BY_BRAND) {
        // group by brand (fallback "Other")
        const groups = {};
        products.forEach(item => {
          const brand = (item.data.brand && String(item.data.brand).trim()) || "Other";
          if (!groups[brand]) groups[brand] = [];
          groups[brand].push(item);
        });
        renderGroups(groups);
      } else {
        // render as one flat grid so your page-level sorter can reorder .product cards
        renderFlatGrid(products);
      }
    } catch (e) {
      console.error("Category load error:", e);
      wrap.innerHTML = `<div class="card"><p class="muted">Error loading products. Please try again.</p></div>`;
    }
  }

  load();
})();
