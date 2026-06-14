// products.js — Real e-commerce category product renderer
// Supports: category filtering, brand grouping, discounts, stock status, sorting, search, perfume fields

(function () {
  console.log("✅ products.js loaded");

  const db =
    window.db ||
    (window.firebase && firebase.firestore ? firebase.firestore() : null);

  const cat = String(window.PRODUCT_CATEGORY || "").toLowerCase().trim();
  const wrap =
    document.getElementById("brand-container") ||
    document.getElementById("product-grid");

  const GROUP_BY_BRAND = !!window.GROUP_BY_BRAND;

  const sortEl =
    document.getElementById("sortProducts") ||
    document.getElementById("productSort") ||
    document.getElementById("sort-products");

  const searchEl =
    document.getElementById("productSearch") ||
    document.getElementById("categorySearch");

  let currentProducts = [];

  if (!wrap) {
    console.error("products.js: missing #brand-container or #product-grid");
    return;
  }

  if (!db) {
    wrap.innerHTML = `
      <div class="card">
        <p class="muted">⚠️ Database not initialized. Check firebase-config.js</p>
      </div>
    `;
    return;
  }

  if (!cat) {
    wrap.innerHTML = `
      <div class="card">
        <p class="muted">⚠️ Product category missing.</p>
      </div>
    `;
    return;
  }

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

  function normalizeCategory(value) {
    const v = String(value || "").toLowerCase().trim();
    return v === "jewelry" ? "jewellery" : v;
  }

  function money(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) && n > 0 ? `Rs${n.toFixed(0)}` : "";
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

    if (discount > 0 && discount < original) return discount;
    return original;
  }

  function hasDiscount(p) {
    const original = getOriginalFromPrice(p);
    const discount = Number(p.discountPrice || 0);
    return discount > 0 && discount < original;
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
      "https://placehold.co/600x600?text=No+Image"
    );
  }

  function getPerfumeMeta(p) {
    const parts = [];

    if (p.gender) parts.push(p.gender);
    if (p.concentration) parts.push(p.concentration);
    if (p.subcategory) parts.push(p.subcategory);

    return parts.filter(Boolean).join(" • ");
  }

  function productCardHTML(id, p) {
    const originalPrice = getOriginalFromPrice(p);
    const finalPrice = getFinalFromPrice(p);
    const discount = hasDiscount(p);
    const out = isOutOfStock(p);
    const img = getProductImage(p);
    const meta = getPerfumeMeta(p);

    const priceHTML = discount
      ? `
        <p class="price">
          <span class="disc-price">${money(finalPrice)}</span>
          <span class="old-price">${money(originalPrice)}</span>
        </p>
      `
      : `
        <p class="price">
          ${finalPrice > 0 ? `From ${money(finalPrice)}` : ""}
        </p>
      `;

    return `
      <article class="product ${out ? "out-of-stock" : ""}"
        data-id="${escapeHtml(id)}"
        data-name="${escapeHtml(p.name || "")}"
        data-brand="${escapeHtml(p.brand || "")}"
        data-price="${finalPrice}"
      >
        <a href="product.html?id=${encodeURIComponent(id)}" aria-label="View ${escapeHtml(p.name || "product")}">
          <div class="img-wrap" style="position:relative">
            <img
              src="${escapeHtml(img)}"
              alt="${escapeHtml(p.name || "Product image")}"
              loading="lazy"
              onerror="this.src='https://placehold.co/600x600?text=No+Image'"
            >
            ${discount ? `<span class="sale-tag">Sale</span>` : ""}
            ${out ? `<span class="soldout-tag">Out of Stock</span>` : ""}
          </div>
        </a>

        ${p.brand ? `<div class="muted">${escapeHtml(p.brand)}</div>` : ""}

        <h3>
          <a href="product.html?id=${encodeURIComponent(id)}">
            ${escapeHtml(p.name || "Unnamed Product")}
          </a>
        </h3>

        ${meta ? `<div class="muted">${escapeHtml(meta)}</div>` : ""}

        ${priceHTML}

        <a class="btn btn-primary" href="product.html?id=${encodeURIComponent(id)}">
          View Details
        </a>
      </article>
    `;
  }

  function renderEmpty() {
    wrap.innerHTML = `
      <div class="card" style="text-align:center">
        <p class="muted">No products found in this category yet.</p>
      </div>
    `;
  }

  function filterProducts(items) {
    const q = String(searchEl?.value || "").toLowerCase().trim();

    if (!q) return items;

    return items.filter(item => {
      const p = item.data || {};

      const text = [
        p.name,
        p.brand,
        p.category,
        p.subcategory,
        p.gender,
        p.concentration,
        p.description
      ].join(" ").toLowerCase();

      return text.includes(q);
    });
  }

  function sortProducts(items, mode) {
    const sorted = [...items];

    if (mode === "name-asc") {
      sorted.sort((a, b) =>
        String(a.data.name || "").localeCompare(String(b.data.name || ""))
      );
    }

    if (mode === "name-desc") {
      sorted.sort((a, b) =>
        String(b.data.name || "").localeCompare(String(a.data.name || ""))
      );
    }

    if (mode === "price-asc") {
      sorted.sort((a, b) => getFinalFromPrice(a.data) - getFinalFromPrice(b.data));
    }

    if (mode === "price-desc") {
      sorted.sort((a, b) => getFinalFromPrice(b.data) - getFinalFromPrice(a.data));
    }

    if (mode === "discount") {
      sorted.sort((a, b) => {
        const ad = hasDiscount(a.data) ? 1 : 0;
        const bd = hasDiscount(b.data) ? 1 : 0;
        return bd - ad;
      });
    }

    if (mode === "newest") {
      sorted.sort((a, b) => {
        const at = a.data.createdAt?.seconds || 0;
        const bt = b.data.createdAt?.seconds || 0;
        return bt - at;
      });
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
    const filtered = filterProducts(items);
    const sorted = sortProducts(filtered, sortEl?.value || "name-asc");

    if (!sorted.length) {
      renderEmpty();
      return;
    }

    if (GROUP_BY_BRAND) {
      renderGroups(sorted);
    } else {
      renderFlatGrid(sorted);
    }
  }

  async function loadProducts() {
    try {
      wrap.innerHTML = `
        <div class="card">
          <p class="muted">Loading products…</p>
        </div>
      `;

      let docs = [];

      try {
        const snap = await db.collection("products")
          .where("active", "==", true)
          .where("category", "==", cat)
          .get();

        docs = snap.docs;
      } catch (queryError) {
        console.warn("Exact category query failed. Falling back to safe load.", queryError);

        const snap = await db.collection("products")
          .where("active", "==", true)
          .get();

        docs = snap.docs.filter(doc => {
          const p = doc.data() || {};
          return normalizeCategory(p.category) === normalizeCategory(cat);
        });
      }

      currentProducts = docs
        .map(doc => ({
          id: doc.id,
          data: doc.data() || {}
        }))
        .filter(item => normalizeCategory(item.data.category) === normalizeCategory(cat));

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

    if (sortEl) sortEl.value = mode;

    if (mode === "default") {
      render(sortProducts(currentProducts, "name-asc"));
      return;
    }

    render(sortProducts(currentProducts, mode));
  };

  sortEl?.addEventListener("change", () => render(currentProducts));
  searchEl?.addEventListener("input", () => render(currentProducts));

  loadProducts();
})();
