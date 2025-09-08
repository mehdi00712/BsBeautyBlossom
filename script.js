// script.js — handles mobile nav toggle and cart badge
(function () {
  const hamburger = document.querySelector(".hamburger");
  const navLinks  = document.querySelector(".nav-links");
  let overlay = document.getElementById("nav-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "nav-overlay";
    document.body.appendChild(overlay);
  }

  function openMenu() {
    navLinks?.classList.add("show");
    overlay?.classList.add("show");
    hamburger?.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    navLinks?.classList.remove("show");
    overlay?.classList.remove("show");
    hamburger?.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function toggleMenu() {
    if (navLinks?.classList.contains("show")) closeMenu();
    else openMenu();
  }

  hamburger?.addEventListener("click", toggleMenu);
  overlay?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  navLinks?.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });

  // keep desktop nav normal
  window.addEventListener("resize", () => {
    if (window.innerWidth > 920) closeMenu();
  });

  // cart badge
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      cartCountEl.textContent = cart.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    } catch { cartCountEl.textContent = 0; }
  }
})();
