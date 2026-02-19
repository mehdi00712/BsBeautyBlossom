// script.js — slide-in mobile nav (with ✖ close) + overlay + cart badge
// ✅ FIXED to work on ALL pages including admin

document.addEventListener("DOMContentLoaded", function () {

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

  function lockBody(lock) {
    document.body.style.overflow = lock ? "hidden" : "";
  }

  function openMenu() {
    if (!navLinks) return;

    navLinks.classList.add("show");
    hamburger?.setAttribute("aria-expanded", "true");

    // show overlay only on mobile
    if (window.innerWidth <= 1023) overlay.classList.add("show");
    lockBody(true);
  }

  function closeMenu() {
    if (!navLinks) return;

    navLinks.classList.remove("show");
    hamburger?.setAttribute("aria-expanded", "false");

    overlay.classList.remove("show");
    lockBody(false);
  }

  function toggleMenu() {
    if (!navLinks) return;
    navLinks.classList.contains("show") ? closeMenu() : openMenu();
  }

  // ✅ HARD RESET ON LOAD
  overlay.classList.remove("show");
  if (!navLinks?.classList.contains("show")) lockBody(false);

  // ✅ Avoid double-binding
  if (hamburger && hamburger.dataset.navBound !== "1") {
    hamburger.dataset.navBound = "1";
    hamburger.addEventListener("click", toggleMenu);
  }

  if (navClose && navClose.dataset.navBound !== "1") {
    navClose.dataset.navBound = "1";
    navClose.addEventListener("click", closeMenu);
  }

  if (overlay && overlay.dataset.navBound !== "1") {
    overlay.dataset.navBound = "1";
    overlay.addEventListener("click", closeMenu);
  }

  // Close when clicking link inside panel
  if (navLinks && navLinks.dataset.navLinksBound !== "1") {
    navLinks.dataset.navLinksBound = "1";
    navLinks.addEventListener("click", (e) => {
      if (e.target.closest("a")) closeMenu();
    });
  }

  // Close if resized to desktop
  if (!window.datasetNavResizeBound) {
    window.datasetNavResizeBound = "1";

    window.addEventListener("resize", () => {
      const w = window.innerWidth;

      if (w > 1023) {
        closeMenu();
        overlay.classList.remove("show");
        lockBody(false);
      } else {
        if (navLinks?.classList.contains("show")) overlay.classList.add("show");
      }
    });
  }

  // ESC to close
  if (!document.documentElement.datasetNavEscBound) {
    document.documentElement.datasetNavEscBound = "1";
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  // ===============================
  // 🛒 Cart badge
  // ===============================

  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      cartCountEl.textContent = cart.reduce(
        (sum, i) => sum + Number(i.quantity || 0),
        0
      );
    } catch {
      cartCountEl.textContent = 0;
    }
  }

});
