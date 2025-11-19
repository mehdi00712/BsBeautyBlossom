// products.js — Category page renderer (grouped by Brand when requested)
// Added: Black Friday discount support (discountPrice)

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

  const GROUP_BY_BRAND = !!window.GROUP_BY_BRAND;

  // ---------- Helpers ----------
  const getFromPrice = (p) => {
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes.map(s => Number(s?.price || 0)).filter(n => n > 0);
    const normalFrom = prices.length ? Math.min(...prices) : base;

    // ⭐ DISCOUNT LOGIC
    if (p.discountPrice && Number(p.discountPrice) > 0) {
      return Math.min(Number(p.discountPrice), normalFrom);
    }

    return normalFrom;
  };

  const escapeHtml = (s = "") =>
    String(s).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));

  const isOutOfStock = (p) => {
    if (String(p.stockStatus || "").toLowerCase() === "out") return true;
    const n = Number(p.stock);
    if (!isNaN(n)) return n <= 0;
    return false;
  };

  // ---------- Product Card with DISCOUNT ----------
  const productCardHTML = (id, p) => {
    const baseFrom = getFromPrice(p);
    const originalBase = (() => {
      const base = Number(p.basePrice || 0);
      const sizes = Array.isArray(p.sizes) ? p.sizes : [];
      const prices = sizes.map(s => Number(s?.price || 0)).filter(n => n > 0);
      return prices.length ? Math.min(...prices) : base;
    })();

    const hasDiscount = p.discountPrice && Number(p.discountPrice) > 0;
    const discountPrice = hasDiscount ? Number(p.discountPrice) : null;

    const img =
      p.imageURL ||
      (Array.isArray(p.images) && p.images[0]) ||
      "https://via.placeholder.com/600x600?text=No+Image";

    const out = isOutOfStock(p);

    // text price
    let priceHTML = "";
    if (hasDiscount) {
      priceHTML = `
        <p class="price">
          <span class="disc-price">Rs${discountPrice}</span>
          <span class="old-price" style="text-decoration:line-through; color:#999; margin-left:6px">Rs${originalBase}</span>
        </p>
      `;
    } else {
      priceHTML = `<p class="price">From Rs${baseFrom}</p>`;
    }

    return `
      <div class="product ${out ? "out-of-stock" : ""}"
           data-name="${escapeHtml(p.name || "")}"
           data-brand="${escapeHtml(p.brand || "")}">
        <a href="product.html?id=${id}">
          <div class="img-wrap" style="position:relative">
            <img src="${img}" alt="${escapeHtml(p.name || "")}">
            ${hasDiscount ? `<span class="sale-tag">Sale</span>` : ""}
            ${out ? `<span class="soldout-tag">Out of Stock</span>` : ""}
          </div>
        </a>

        <h3><a href="product.html?id=${id}">${escapeHtml(p.name || "")}</a></h3>
        ${p.brand ? `<div class="muted">${escapeHtml(p.brand)}</div>` : ""}

        ${priceHTML}
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

  // ---------- Flat grid Renderer ----------
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
        const groups = {};
        products.forEach(item => {
          const brand = (item.data.brand && String(item.data.brand).trim()) || "Other";
          if (!groups[brand]) groups[brand] = [];
          groups[brand].push(item);
        });
        renderGroups(groups);
      } else {
        renderFlatGrid(products);
      }

    } catch (e) {
      console.error("Category load error:", e);
      wrap.innerHTML = `<div class="card"><p class="muted">Error loading products. Please try again.</p></div>`;
    }
  }

  load();
})();
