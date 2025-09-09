// script.js — slide-in mobile nav (with ✖ close) + cart badge
(function () {
  const hamburger = document.querySelector(".hamburger");
  const navLinks  = document.querySelector(".nav-links");
  const navClose  = document.querySelector(".nav-close");

  function openMenu() {
    navLinks?.classList.add("show");
    hamburger?.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    navLinks?.classList.remove("show");
    hamburger?.setAttribute("aria-expanded", "false");
  }

  function toggleMenu() {
    if (!navLinks) return;
    navLinks.classList.contains("show") ? closeMenu() : openMenu();
  }

  hamburger?.addEventListener("click", toggleMenu);
  navClose?.addEventListener("click", closeMenu);

  // Close when tapping any link inside the panel
  navLinks?.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });

  // Close if resized back to desktop
  let lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    if (lastW <= 1023 && w > 1023) closeMenu();
    lastW = w;
  });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Cart badge
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      cartCountEl.textContent = cart.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    } catch {
      cartCountEl.textContent = 0;
    }
  }
})();
