// script.js — navbar + hardened Add to Cart using unitPrice
(function () {
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => navLinks.classList.toggle("show"));
  }

  const CART_KEY = "bbb_cart_v2";

  function readCart() {
    try {
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    localStorage.removeItem("cart");
  }
  const cartCount = (items) => items.reduce((n, i) => n + (Number(i.qty) || 0), 0);
  const updateCartCountBadge = () => {
    const cc = document.getElementById("cart-count");
    if (cc) cc.textContent = cartCount(readCart());
  };
  updateCartCountBadge();

  function getSelectedOptionPrice(productEl) {
    const sel = productEl.querySelector("select");
    if (!sel) return 0;
    const opt = sel.options[sel.selectedIndex];
    const p = Number(opt?.dataset?.price || 0);
    return isFinite(p) ? p : 0;
  }
  const getSelectedLabel = (el) => (el.querySelector("select")?.value || "Default");
  function getQty(el) {
    const n = Number(el.querySelector(".qty")?.textContent || "1");
    return Math.max(1, isFinite(n) ? n : 1);
  }
  const getImageURL = (el) => el.querySelector("img")?.src || "";
  const cleanName = (s) => (s || "").toString().trim();

  window.addToCart = function (name, btn) {
    try {
      const safe = cleanName(name);
      if (!safe) return alert("Product name missing.");
      const card = btn?.closest(".product") || document;

      let unitPrice = getSelectedOptionPrice(card);
      if (!unitPrice || unitPrice <= 0) {
        const priceText = card.querySelector(".price")?.textContent || "";
        const m = priceText.match(/Rs\s*([\d.,]+)/i);
        if (m) unitPrice = Number((m[1] || "0").replace(/[^\d.]/g, ""));
      }
      if (!unitPrice || unitPrice <= 0) {
        alert("This item has no valid price. Please choose a size or contact admin.");
        return;
      }

      const qty = getQty(card);
      const imageURL = getImageURL(card);
      const sizeLabel = getSelectedLabel(card);

      const cart = readCart();
      const idKey = `${safe}__${unitPrice}__${sizeLabel}`;
      const found = cart.find(i => i.id === idKey);
      if (found) found.qty += qty;
      else cart.push({ id: idKey, name: `${safe} (${sizeLabel})`, unitPrice, qty, imageURL });

      writeCart(cart);
      updateCartCountBadge();

      if (btn) {
        const old = btn.textContent;
        btn.textContent = "Added ✓"; btn.disabled = true;
        setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 900);
      }
    } catch (e) {
      console.error("addToCart error:", e);
      alert("Could not add to cart. Please try again.");
    }
  };

  document.addEventListener("click", (e) => {
    if (e.target.matches(".quantity-controls .plus")) {
      const q = e.target.closest(".quantity-controls")?.querySelector(".qty");
      if (q) q.textContent = String(Math.max(1, Number(q.textContent || "1") + 1));
    }
    if (e.target.matches(".quantity-controls .minus")) {
      const q = e.target.closest(".quantity-controls")?.querySelector(".qty");
      if (q) q.textContent = String(Math.max(1, Number(q.textContent || "1") - 1));
    }
  });
})();
