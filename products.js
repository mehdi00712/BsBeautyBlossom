// products.js — Optimized category product renderer
// Supports: category filtering, brand grouping, discounts, stock status, sorting-ready data

(function () {
  console.log("✅ products.js loaded");

  if (!window.db) {
    console.error("Firestore not ready. Check firebase-config.js");
    const wrap = document.getElementById("product-grid") || document.getElementById("brand-container");
    if (wrap) {
      wrap.innerHTML = `<div class="card"><p class="muted">⚠️ Database not initialized.</p></div>`;
    }
    return;
  }

  const cat = String(window.PRODUCT_CATEGORY || "").toLowerCase().trim();
  const wrap = document.getElementById("brand-container") || document.getElementById("product-grid");
  const GROUP_BY_BRAND = !!window.GROUP_BY_BRAND;

  if (!wrap) {
    console.error("products.js: missing #brand-container or #product-grid");
    return;
  }

  if (!cat) {
    wrap.innerHTML = `<div class="card"><p class="muted">⚠️ Product category missing.</p></div>`;
    return;
  }

  let currentProducts = [];

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[m];
    });
  }

  function getOriginalFromPrice(p) {
    const base = Number(p.basePrice || 0);
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes
      .map(s => Number(s?.price || 0))
      .filter(n => Number.isFinite(n) && n > 0);

    return prices.length ? Math.min(...prices) : base;
  }

  function getFinalFromPrice(p) {
    const original = getOriginalFromPrice(p);
    const discount = Number(p.discountPrice || 0);

    if (discount > 0 && discount < original) {
      return discount;
    }

    return original;
  }

  function isOutOfStock(p) {
    if (String(p.stockStatus || "").toLowerCase() === "out") return true;

    const stock = Number(p.stock);
    if (Number.isFinite(stock)) return stock <= 0;

    return false;
  }

  function getProductImage(p) {
    return (
      p.imageURL ||
      (Array.isArray(p.images) && p.images.length ? p.images[0] : "") ||
      "https://via.placeholder.com/600x600?text=No+Image"
    );
  }

  function productCardHTML(id, p) {
    const originalPrice = getOriginalFromPrice(p);
    const finalPrice = getFinalFromPrice(p);
    const discount = Number(p.discountPrice || 0);
    const hasDiscount = discount > 0 && discount < originalPrice;
    const out = isOutOfStock(p);
    const img = getProductImage(p);

    const priceHTML = hasDiscount
      ? `
        <p class="price">
          <span class="disc-price">Rs${finalPrice}</span>
          <span class="old-price">Rs${originalPrice}</span>
        </p>
      `
      : `<p class="price">${finalPrice > 0 ? `From Rs${finalPrice}` : ""}</p>`;

    return `
      <div class="product ${out ? "out-of-stock" : ""}"
           data-id="${escapeHtml(id)}"
           data-name="${escapeHtml(p.name || "")}"
           data-brand="${escapeHtml(p.brand || "")}"
           data-price="${finalPrice}">
        
        <a href="product.html?id=${encodeURIComponent(id)}">
          <div class="img-wrap" style="position:relative">
            <img src="${escapeHtml(img)}" alt="${escapeHtml(p.name || "Product image")}" loading="lazy">
            ${hasDiscount ? `<span class="sale-tag">Sale</span>` : ""}
            ${out ? `<span class="soldout-tag">Out of Stock</span>` : ""}
          </div>
        </a>

        <h3>
          <a href="product.html?id=${encodeURIComponent(id)}">${escapeHtml(p.name || "Unnamed Product")}</a>
        </h3>

        ${p.brand ? `<div class="muted">${escapeHtml(p.brand)}</div>` : ""}

        ${priceHTML}
      </div>
    `;
  }

  function renderEmpty() {
    wrap.innerHTML = `
      <div class="card" style="text-align:center">
        <p class="muted">No products found in this category yet.</p>
      </div>
    `;
  }

  function sortProducts(items, mode) {
    const sorted = [...items];

    if (mode === "name-asc") {
      sorted.sort((a, b) =>
        String(a.data.name || "").localeCompare(String(b.data.name || ""))
      );
    }

    if (mode === "price-asc") {
      sorted.sort((a, b) => getFinalFromPrice(a.data) - getFinalFromPrice(b.data));
    }

    if (mode === "price-desc") {
      sorted.sort((a, b) => getFinalFromPrice(b.data) - getFinalFromPrice(a.data));
    }

    return sorted;
  }

  function renderGroups(items) {
    wrap.innerHTML = "";

    const groups = {};

    items.forEach(item => {
      const brand = String(item.data.brand || "").trim() || "Other";
      if (!groups[brand]) groups[brand] = [];
      groups[brand].push(item);
    });

    const brandNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    brandNames.forEach(brand => {
      const section = document.createElement("section");
      section.className = "brand-section";

      section.innerHTML = `
        <h2 class="brand-title">${escapeHtml(brand)}</h2>
        <div class="brand-grid"></div>
      `;

      const grid = section.querySelector(".brand-grid");

      groups[brand].forEach(item => {
        grid.insertAdjacentHTML("beforeend", productCardHTML(item.id, item.data));
      });

      wrap.appendChild(section);
    });
  }

  function renderFlatGrid(items) {
    wrap.innerHTML = `<div class="product-grid"></div>`;
    const grid = wrap.querySelector(".product-grid");

    items.forEach(item => {
      grid.insertAdjacentHTML("beforeend", productCardHTML(item.id, item.data));
    });
  }

  function render(items) {
    if (!items.length) {
      renderEmpty();
      return;
    }

    if (GROUP_BY_BRAND) {
      renderGroups(items);
    } else {
      renderFlatGrid(items);
    }
  }

  async function loadProducts() {
    try {
      wrap.innerHTML = `<div class="card"><p class="muted">Loading products…</p></div>`;

      const snap = await db.collection("products")
        .where("active", "==", true)
        .where("category", "==", cat)
        .get();

      currentProducts = snap.docs.map(doc => ({
        id: doc.id,
        data: doc.data() || {}
      }));

      currentProducts = sortProducts(currentProducts, "name-asc");

      render(currentProducts);

    } catch (error) {
      console.error("Category load error:", error);
      wrap.innerHTML = `
        <div class="card">
          <p class="muted">Error loading products. Please try again.</p>
        </div>
      `;
    }
  }

  window.sortCategoryProducts = function (mode) {
    if (!currentProducts.length) return;

    if (mode === "default") {
      render(currentProducts);
      return;
    }

    const sorted = sortProducts(currentProducts, mode);
    render(sorted);
  };

  loadProducts();
})();
