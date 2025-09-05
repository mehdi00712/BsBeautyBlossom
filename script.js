// script.js — hardened Add to Cart with price/qty/image guards

(function () {
  // Navbar hamburger
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => navLinks.classList.toggle("show"));
  }

  // ---- Cart helpers (single canonical key) ----
  const CART_KEY = "bbb_cart_v2";

  function readCart() {
    try {
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    // clean any legacy key to avoid conflicts
    localStorage.removeItem("cart");
  }

  function cartCount(items) {
    return items.reduce((n, i) => n + (Number(i.qty) || 0), 0);
  }

  function updateCartCountBadge() {
    const count = cartCount(readCart());
    const cc = document.getElementById("cart-count");
    if (cc) cc.textContent = count;
  }

  // Call this once on every page load that has the badge
  updateCartCountBadge();

  // ---- DOM utils for product cards ----
  function getSelectedOptionPrice(productEl) {
    const sel = productEl.querySelector("select");
    if (!sel) return 0;
    const opt = sel.options[sel.selectedIndex];
    const p = Number(opt?.dataset?.price || 0);
    return isFinite(p) ? p : 0;
  }

  function getSelectedLabel(productEl) {
    const sel = productEl.querySelector("select");
    return sel ? sel.value : "Default";
  }

  function getQty(productEl) {
    const qEl = productEl.querySelector(".qty");
    const q = Number((qEl?.textContent || "1").trim());
    return Math.max(1, isFinite(q) ? q : 1);
  }

  function getImageURL(productEl) {
    // try cover image first
    const img = productEl.querySelector("img");
    return img?.src || "";
  }

  function sanitizeName(name) {
    return (name || "").toString().trim();
  }

  // ---- Public: addToCart(name, buttonEl) ----
  // It is called from products.js via onclick="addToCart(this.dataset.name, this)"
  window.addToCart = function (name, btn) {
    try {
      const safeName = sanitizeName(name);
      if (!safeName) {
        alert("Product name missing.");
        return;
      }

      // Find the product card container
      const productEl = btn?.closest(".product") || document;
      // Price from selected option (with fallback logic)
      let unitPrice = getSelectedOptionPrice(productEl);

      // EXTRA fallback if option was missing data-price
      // Try to read any displayed "From RsX" on card OR data attribute set by products.js
      if (!unitPrice || unitPrice <= 0) {
        const priceText = productEl.querySelector(".price")?.textContent || "";
        const m = priceText.match(/Rs\s*([\d.,]+)/i);
        if (m) {
          unitPrice = Number((m[1] || "0").replace(/[^\d.]/g, ""));
        }
      }

      // FINAL safety: block adding if still zero or invalid
      if (!unitPrice || unitPrice <= 0) {
        alert("This item has no valid price. Please choose a size or contact admin.");
        return;
      }

      const qty = getQty(productEl);
      const imageURL = getImageURL(productEl);
      const sizeLabel = getSelectedLabel(productEl);

      const cart = readCart();
      const idKey = `${safeName}__${unitPrice}__${sizeLabel}`;
      const existing = cart.find((i) => i.id === idKey);

      if (existing) {
        existing.qty += qty;
      } else {
        cart.push({
          id: idKey,
          name: `${safeName} (${sizeLabel})`,
          unitPrice,
          qty,
          imageURL,
        });
      }
      writeCart(cart);
      updateCartCountBadge();

      // Nice feedback
      if (btn) {
        const old = btn.textContent;
        btn.textContent = "Added ✓";
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = old;
          btn.disabled = false;
        }, 1000);
      }
    } catch (e) {
      console.error("addToCart error:", e);
      alert("Could not add to cart. Please try again.");
    }
  };

  // ---- Quantity +/- handlers for cards (delegation) ----
  document.addEventListener("click", (e) => {
    if (e.target.matches(".quantity-controls .plus")) {
      const wrap = e.target.closest(".quantity-controls");
      const qtyEl = wrap?.querySelector(".qty");
      if (qtyEl) qtyEl.textContent = String(Math.max(1, Number(qtyEl.textContent || "1") + 1));
    }
    if (e.target.matches(".quantity-controls .minus")) {
      const wrap = e.target.closest(".quantity-controls");
      const qtyEl = wrap?.querySelector(".qty");
      if (qtyEl) qtyEl.textContent = String(Math.max(1, Number(qtyEl.textContent || "1") - 1));
    }
  });
})();
