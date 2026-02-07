// script.js — slide-in mobile nav (with ✖ close) + cart badge
(function () {
  const hamburger = document.querySelector(".hamburger");
  const navLinks  = document.querySelector(".nav-links");
  const navClose  = document.querySelector(".nav-close");

  // ✅ Overlay (created once, reused on all pages incl. admin)
  let overlay = document.getElementById("navOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "navOverlay";
    overlay.className = "nav-overlay";
    document.body.appendChild(overlay);
  }

  function openMenu() {
    navLinks?.classList.add("show");
    overlay?.classList.add("show");
    hamburger?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    navLinks?.classList.remove("show");
    overlay?.classList.remove("show");
    hamburger?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  function toggleMenu() {
    if (!navLinks) return;
    navLinks.classList.contains("show") ? closeMenu() : openMenu();
  }

  // ✅ Avoid double-binding (prevents weird multi toggle bugs)
  if (hamburger && hamburger.dataset.navBound !== "1") {
    hamburger.dataset.navBound = "1";
    hamburger.addEventListener("click", toggleMenu);
  }

  if (navClose && navClose.dataset.navBound !== "1") {
    navClose.dataset.navBound = "1";
    navClose.addEventListener("click", closeMenu);
  }

  // ✅ Close when tapping overlay (outside)
  if (overlay && overlay.dataset.navBound !== "1") {
    overlay.dataset.navBound = "1";
    overlay.addEventListener("click", closeMenu);
  }

  // Close when tapping any link inside the panel
  if (navLinks && navLinks.dataset.navBound !== "1") {
    navLinks.dataset.navBound = "1";
    navLinks.addEventListener("click", (e) => {
      if (e.target.closest("a")) closeMenu();
    });
  }

  // Close if resized back to desktop
  let lastW = window.innerWidth;
  if (window.datasetNavResizeBound !== "1") {
    window.datasetNavResizeBound = "1";
    window.addEventListener("resize", () => {
      const w = window.innerWidth;
      if (lastW <= 1023 && w > 1023) closeMenu();
      lastW = w;
    });
  }

  // ESC to close
  if (!document.documentElement.datasetNavEscBound) {
    document.documentElement.datasetNavEscBound = "1";
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

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
