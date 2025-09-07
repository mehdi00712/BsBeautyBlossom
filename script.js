// script.js — Navbar hamburger + cart badge (mobile-safe height/scroll)
(function () {
  if (window.__NAV_INIT__) return;
  window.__NAV_INIT__ = true;

  function qs(s, r = document) { return r.querySelector(s); }
  function qsa(s, r = document) { return Array.from(r.querySelectorAll(s)); }

  function wireNavbar() {
    const navbar   = qs('.navbar');
    const hamburger= qs('.hamburger');
    const navLinks = qs('.nav-links');

    if (!navbar || !hamburger || !navLinks) return;

    // Ensure ARIA
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'menu');

    function applyMobilePanelSize() {
      // Measure current navbar height (can change between desktop/mobile)
      const h = navbar.offsetHeight || 64;
      // Position the dropdown immediately under the navbar
      navLinks.style.top = h + 'px';
      // Make the dropdown panel fill the rest of the viewport and be scrollable
      navLinks.style.maxHeight = `calc(100vh - ${h}px)`;
    }

    const openMenu = () => {
      if (!navLinks.classList.contains('show')) {
        applyMobilePanelSize();
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

    if (!hamburger.__wired) {
      hamburger.__wired = true;
      hamburger.addEventListener('click', toggleMenu, { passive: true });
      // Touch support (prevents ghost double-tap on some mobiles)
      hamburger.addEventListener('touchstart', (e)=>{ e.preventDefault(); toggleMenu(); }, { passive: false });
    }

    // Auto-close after tapping a link on mobile
    qsa('a', navLinks).forEach(a => {
      if (!a.__wiredClose) {
        a.__wiredClose = true;
        a.addEventListener('click', () => {
          if (window.innerWidth < 1024) closeMenu();
        });
      }
    });

    // Click outside to close (mobile)
    if (!document.__navOutside) {
      document.__navOutside = true;
      document.addEventListener('click', (e) => {
        if (window.innerWidth >= 1024) return;
        if (!qs('.navbar').contains(e.target)) closeMenu();
      });
    }

    // ESC to close
    if (!document.__navEsc) {
      document.__navEsc = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });
    }

    // Resize: recalc panel size and reset on desktop
    if (!window.__navResize) {
      window.__navResize = true;
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
          navLinks.classList.remove('show');
          document.body.classList.remove('nav-open');
          hamburger.setAttribute('aria-expanded', 'false');
          navLinks.style.maxHeight = '';
          navLinks.style.top = '';
        } else if (navLinks.classList.contains('show')) {
          applyMobilePanelSize();
        }
      });
    }
  }

  // ----- CART BADGE -----
  function computeCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      // Support both qty & quantity
      return cart.reduce((sum, it) => sum + Number(it.qty ?? it.quantity ?? 0), 0);
    } catch { return 0; }
  }
  function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = computeCartCount();
  }
  window.updateCartCount = updateCartCount;

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      wireNavbar();
      updateCartCount();
    }, { once: true });
  } else {
    wireNavbar();
    updateCartCount();
  }

  // Update when cart changes in another tab
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') updateCartCount();
  });
})();
