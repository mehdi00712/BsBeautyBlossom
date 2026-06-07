// product-detail.js — product page interactions + clean cart saving
(function () {
  const main = document.getElementById("product-main");
  if (!main) return;

  const bigImg = document.getElementById("product-image");
  const thumbWrap = document.getElementById("product-thumbs");
  const thumbPrev = document.getElementById("thumbPrev");
  const thumbNext = document.getElementById("thumbNext");

  const qtyMinus = document.getElementById("qty-minus");
  const qtyPlus = document.getElementById("qty-plus");
  const qtyInput = document.getElementById("qty");

  const sizeSelect = document.getElementById("size");
  const priceLabel = document.getElementById("price");
  const oldPriceEl = document.getElementById("old-price");
  const addBtn = document.getElementById("add-to-cart");

  const nameEl = document.getElementById("product-name");
  const brandEl = document.getElementById("product-brand");
  const descEl = document.getElementById("product-desc");

  const data = window.__productData || {};

  function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || data.id || "";
  }

  function money(n) {
    return "Rs" + Number(n || 0).toFixed(0);
  }

  function getSelectedOption() {
    return sizeSelect?.selectedOptions?.[0] || null;
  }

  function getBasePrice() {
    const opt = getSelectedOption();
    const optionPrice = Number(opt?.dataset?.price || 0);

    if (optionPrice > 0) return optionPrice;

    const basePrice = Number(data.basePrice || 0);
    return basePrice > 0 ? basePrice : 0;
  }

  function getDiscountPrice() {
    const discount = Number(data.discountPrice || 0);
    return discount > 0 ? discount : 0;
  }

  function getFinalPrice() {
    const base = getBasePrice();
    const discount = getDiscountPrice();

    if (discount > 0 && discount < base) {
      return discount;
    }

    return base;
  }

  function hasValidDiscount() {
    const base = getBasePrice();
    const discount = getDiscountPrice();
    return discount > 0 && discount < base;
  }

  function updatePrice() {
    const base = getBasePrice();
    const finalPrice = getFinalPrice();

    if (priceLabel) {
      priceLabel.textContent = money(finalPrice);
    }

    if (oldPriceEl) {
      if (hasValidDiscount()) {
        oldPriceEl.style.display = "inline-block";
        oldPriceEl.textContent = money(base);
      } else {
        oldPriceEl.style.display = "none";
        oldPriceEl.textContent = "";
      }
    }

    return finalPrice;
  }

  function updateCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const total = cart.reduce((sum, item) => {
        return sum + Number(item.quantity || item.qty || 0);
      }, 0);

      const badge = document.getElementById("cart-count");
      if (badge) badge.textContent = total;
    } catch {
      const badge = document.getElementById("cart-count");
      if (badge) badge.textContent = "0";
    }
  }

  window.updateCartCount = updateCartCount;

  function bindThumbnails() {
    if (!thumbWrap || thumbWrap.dataset.bound === "1") return;
    thumbWrap.dataset.bound = "1";

    thumbWrap.addEventListener("click", function (e) {
      const img = e.target.closest("img[data-src]");
      if (!img) return;

      const src = img.getAttribute("data-src");
      if (bigImg && src) bigImg.src = src;

      thumbWrap.querySelectorAll("img.active").forEach(x => {
        x.classList.remove("active");
      });

      img.classList.add("active");
    });
  }

  function bindThumbArrows() {
    if (!thumbWrap || !thumbPrev || !thumbNext) return;
    if (thumbWrap.dataset.arrowBound === "1") return;

    thumbWrap.dataset.arrowBound = "1";

    thumbWrap.style.overflowX = "auto";
    thumbWrap.style.overflowY = "hidden";
    thumbWrap.style.scrollBehavior = "smooth";

    function step() {
      return Math.max(220, Math.floor(thumbWrap.clientWidth * 0.8));
    }

    function update() {
      const max = Math.max(0, thumbWrap.scrollWidth - thumbWrap.clientWidth - 2);
      const needsScroll = thumbWrap.scrollWidth > thumbWrap.clientWidth + 2;

      thumbPrev.disabled = !needsScroll || thumbWrap.scrollLeft <= 2;
      thumbNext.disabled = !needsScroll || thumbWrap.scrollLeft >= max;
    }

    function safeScrollBy(dx) {
      try {
        thumbWrap.scrollBy({ left: dx, behavior: "smooth" });
      } catch {
        thumbWrap.scrollLeft += dx;
      }

      setTimeout(update, 250);
    }

    thumbPrev.addEventListener("click", function (e) {
      e.preventDefault();
      safeScrollBy(-step());
    });

    thumbNext.addEventListener("click", function (e) {
      e.preventDefault();
      safeScrollBy(step());
    });

    thumbWrap.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    requestAnimationFrame(update);
    setTimeout(update, 300);
    setTimeout(update, 800);
  }

  function bindQtyControls() {
    if (qtyMinus && qtyInput && qtyMinus.dataset.bound !== "1") {
      qtyMinus.dataset.bound = "1";
      qtyMinus.addEventListener("click", function () {
        const value = Number(qtyInput.value || 1);
        qtyInput.value = Math.max(1, value - 1);
      });
    }

    if (qtyPlus && qtyInput && qtyPlus.dataset.bound !== "1") {
      qtyPlus.dataset.bound = "1";
      qtyPlus.addEventListener("click", function () {
        const value = Number(qtyInput.value || 1);
        qtyInput.value = value + 1;
      });
    }

    if (qtyInput && qtyInput.dataset.sanitize !== "1") {
      qtyInput.dataset.sanitize = "1";

      qtyInput.addEventListener("input", function () {
        const value = Number(qtyInput.value);
        if (!Number.isFinite(value) || value < 1) qtyInput.value = 1;
      });

      qtyInput.addEventListener("blur", function () {
        const value = Number(qtyInput.value);
        if (!Number.isFinite(value) || value < 1) qtyInput.value = 1;
      });
    }
  }

  function bindSizeChange() {
    if (!sizeSelect || sizeSelect.dataset.bound === "1") return;

    sizeSelect.dataset.bound = "1";
    sizeSelect.addEventListener("change", updatePrice);
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
  }

  function buildCartItem() {
    const opt = getSelectedOption();

    const productId = getProductId();
    const productName = nameEl?.textContent?.trim() || data.name || "Product";
    const brand = brandEl?.textContent?.trim() || data.brand || "";
    const selectedSize = opt?.value || opt?.textContent?.trim() || "";

    const quantity = Math.max(1, Number(qtyInput?.value || 1));

    const basePrice = getBasePrice();
    const finalPrice = getFinalPrice();
    const discountPrice = hasValidDiscount() ? getDiscountPrice() : null;
    const oldPrice = hasValidDiscount() ? basePrice : null;

    const imageURL =
      bigImg?.src ||
      data.imageURL ||
      (Array.isArray(data.images) && data.images[0]) ||
      "";

    return {
      productId,
      name: productName,
      brand,
      size: selectedSize,
      displayName: selectedSize ? `${productName} (${selectedSize})` : productName,

      price: finalPrice,
      basePrice,
      oldPrice,
      discountPrice,

      quantity,
      imageURL,

      category: data.category || "",
      addedAt: new Date().toISOString()
    };
  }

  function addToCart() {
    const item = buildCartItem();

    if (!item.price || item.price <= 0) {
      alert("This product has no valid price.");
      return;
    }

    const cart = getCart();

    const existingIndex = cart.findIndex(existing => {
      return (
        String(existing.productId || "") === String(item.productId || "") &&
        String(existing.size || "") === String(item.size || "") &&
        Number(existing.price || 0) === Number(item.price || 0)
      );
    });

    if (existingIndex >= 0) {
      cart[existingIndex].quantity =
        Number(cart[existingIndex].quantity || cart[existingIndex].qty || 0) + item.quantity;

      cart[existingIndex].addedAt = new Date().toISOString();
    } else {
      cart.push(item);
    }

    saveCart(cart);
    alert("Added to cart!");
  }

  function bindAddToCart() {
    if (!addBtn || addBtn.dataset.bound === "1") return;

    addBtn.dataset.bound = "1";
    addBtn.addEventListener("click", addToCart);
  }

  bindThumbnails();
  bindThumbArrows();
  setTimeout(bindThumbArrows, 400);

  bindQtyControls();
  bindSizeChange();
  bindAddToCart();

  updatePrice();
  updateCartCount();
})();
