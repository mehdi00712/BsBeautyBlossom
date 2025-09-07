// script.js — Navbar hamburger + cart badge (global)
// Safe-guard against double init
(function () {
  if (window.__NAV_INIT__) return;
  window.__NAV_INIT__ = true;

  function qs(s, r = document) { return r.querySelector(s); }
  function qsa(s, r = document) { return Array.from(r.querySelectorAll(s)); }

  // ----- NAVBAR / HAMBURGER -----
  function wireNavbar() {
    const navbar = qs('.navbar');
    const hamburger = qs('.hamburger');
    const navLinks = qs('.nav-links');

    if (!navbar || !hamburger || !navLinks) return;

    // Make sure ARIA is set
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'menu');

    // Open / close
    const openMenu = () => {
      if (!navLinks.classList.contains('show')) {
        navLinks.classList.add('show');
        hamburger.setAttribute('aria-expanded', 'true');
        document.body.classList.add('nav-open');
      }
    };
    const closeMenu = () => {
      if (navLinks.classList.contains('show')) {
        navLinks.classList.remove('show');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      }
    };
    const toggleMenu = () => {
      if (navLinks.classList.contains('show')) closeMenu(); else openMenu();
    };

    // Click hamburger
    if (!hamburger.__wired) {
      hamburger.__wired = true;
      hamburger.addEventListener('click', toggleMenu, { passive: true });
      // Touch support
      hamburger.addEventListener('touchstart', (e)=>{ e.preventDefault(); toggleMenu(); }, { passive: false });
    }

    // Close when clicking a link (mobile only)
    qsa('a', navLinks).forEach(a => {
      if (!a.__wiredClose) {
        a.__wiredClose = true;
        a.addEventListener('click', () => {
          if (window.innerWidth < 1024) closeMenu();
        });
      }
    });

    // Close when clicking outside (mobile)
    if (!document.__navOutside) {
      document.__navOutside = true;
      document.addEventListener('click', (e) => {
        if (window.innerWidth >= 1024) return;
        if (!navbar.contains(e.target)) closeMenu();
      });
    }

    // ESC closes menu
    if (!document.__navEsc) {
      document.__navEsc = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });
    }

    // On resize: reset if switching to desktop
    if (!window.__navResize) {
      window.__navResize = true;
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
          navLinks.classList.remove('show');
          document.body.classList.remove('nav-open');
          hamburger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // ----- CART BADGE -----
  function computeCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      return cart.reduce((sum, it) => sum + Number(it.qty ?? it.quantity ?? 0), 0);
    } catch { return 0; }
  }
  function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = computeCartCount();
  }
  window.updateCartCount = updateCartCount;

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      wireNavbar();
      updateCartCount();
    }, { once: true });
  } else {
    wireNavbar();
    updateCartCount();
  }

  // Also update on storage changes (if another tab updates cart)
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') updateCartCount();
  });
})();
