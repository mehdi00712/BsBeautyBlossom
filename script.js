// script.js — shared helpers + hardened addToCart (blocks Rs0)
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
    // clean legacy
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
    const img = productEl.querySelector("img");
    return img?.src || "";
  }
  function sanitizeName(name) {
    return (name || "").toString().trim();
  }

  // ---- Public: addToCart(name, buttonEl) ----
  window.addToCart = function (name, btn) {
    try {
      const safeName = sanitizeName(name);
      if (!safeName) {
        alert("Product name missing.");
        return;
      }
      const productEl = btn?.closest(".product") || document;

      let unitPrice = getSelectedOptionPrice(productEl);
      // parse fallback from "From RsX" text if needed
      if (!unitPrice || unitPrice <= 0) {
        const priceText = productEl.querySelector(".price")?.textContent || "";
        const m = priceText.match(/Rs\s*([\d.,]+)/i);
        if (m) unitPrice = Number((m[1] || "0").replace(/[^\d.]/g, ""));
      }
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

      if (existing) existing.qty += qty;
      else {
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

  // ---- Quantity +/- handlers (delegated) ----
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
