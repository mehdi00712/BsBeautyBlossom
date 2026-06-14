// script.js — mobile nav + overlay + cart badge
// Works on all pages including admin

document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  const navClose = document.querySelector(".nav-close");

  let overlay = document.getElementById("navOverlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "navOverlay";
    overlay.className = "nav-overlay";
    document.body.appendChild(overlay);
  }

  function isMobile() {
    return window.innerWidth <= 1023;
  }

  function lockBody(lock) {
    document.body.style.overflow = lock ? "hidden" : "";
  }

  function openMenu() {
    if (!navLinks || !isMobile()) return;

    navLinks.classList.add("show");
    overlay.classList.add("show");
    hamburger?.setAttribute("aria-expanded", "true");
    lockBody(true);
  }

  function closeMenu() {
    if (!navLinks) return;

    navLinks.classList.remove("show");
    overlay.classList.remove("show");
    hamburger?.setAttribute("aria-expanded", "false");
    lockBody(false);
  }

  function toggleMenu() {
    if (!navLinks) return;

    if (navLinks.classList.contains("show")) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  closeMenu();

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

  if (navLinks && navLinks.dataset.navLinksBound !== "1") {
    navLinks.dataset.navLinksBound = "1";

    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        closeMenu();
      }
    });
  }

  if (window.datasetNavResizeBound !== "1") {
    window.datasetNavResizeBound = "1";

    window.addEventListener("resize", function () {
      if (!isMobile()) {
        closeMenu();
      } else if (navLinks?.classList.contains("show")) {
        overlay.classList.add("show");
      }
    });
  }

  if (document.documentElement.datasetNavEscBound !== "1") {
    document.documentElement.datasetNavEscBound = "1";

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeMenu();
      }
    });
  }

  updateCartCount();
  window.updateCartCount = updateCartCount;
});

function updateCartCount() {
  const cartCountEl = document.getElementById("cart-count");
  if (!cartCountEl) return;

  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    const total = Array.isArray(cart)
      ? cart.reduce((sum, item) => {
          return sum + Number(item.quantity || item.qty || 0);
        }, 0)
      : 0;

    cartCountEl.textContent = total;
  } catch {
    cartCountEl.textContent = "0";
  }
}
