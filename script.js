// script.js — Navbar hamburger + cart badge (mobile-safe height/scroll)
(function () {
  if (window.__NAV_INIT__) return;
  window.__NAV_INIT__ = true;

  function qs(s, r = document) { return r.querySelector(s); }
  function qsa(s, r = document) { return Array.from(r.querySelectorAll(s)); }

  function wireNavbar() {
    const navbar    = qs('.navbar');
    const hamburger = qs('.hamburger');
    const navLinks  = qs('.nav-links');

    if (!navbar || !hamburger || !navLinks) return;

    // ARIA
    hamburger.setAttribute('aria-label', 'menu');
    hamburger.setAttribute('aria-expanded', 'false');

    // Compute panel size to fit below current navbar height
    function applyMobilePanelSize() {
      const h = navbar.offsetHeight || 64;
      // Inline styles make it robust even if CSS var isn't used
      navLinks.style.top = h + 'px';
      navLinks.style.maxHeight = `calc(100vh - ${h}px)`;
    }

    function openMenu() {
      applyMobilePanelSize();
      navLinks.classList.add('show');
      document.body.classList.add('nav-open');
      hamburger.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      navLinks.classList.remove('show');
      document.body.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
    function toggleMenu() {
      navLinks.classList.contains('show') ? closeMenu() : openMenu();
    }

    if (!hamburger.__wired) {
      hamburger.__wired = true;
      hamburger.addEventListener('click', toggleMenu, { passive: true });
      // Touch support (prevents double-trigger on some mobiles)
      hamburger.addEventListener('touchstart', (e)=>{ e.preventDefault(); toggleMenu(); }, { passive: false });
    }

    // Auto-close after tapping a link (mobile)
    qsa('a', navLinks).forEach(a => {
      if (!a.__wiredClose) {
        a.__wiredClose = true;
        a.addEventListener('click', () => { if (window.innerWidth < 1024) closeMenu(); });
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
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    }

    // Resize: recalc panel size and reset on desktop
    if (!window.__navResize) {
      window.__navResize = true;
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
          closeMenu();
          navLinks.style.maxHeight = '';
          navLinks.style.top = '';
        } else if (navLinks.classList.contains('show')) {
          applyMobilePanelSize();
        }
      });
    }

    // Optional: close menu on scroll (prevents stuck-open feeling)
    if (!window.__navScrollClose) {
      window.__navScrollClose = true;
      window.addEventListener('scroll', () => {
        if (window.innerWidth < 1024 && navLinks.classList.contains('show')) {
          closeMenu();
        }
      }, { passive: true });
    }
  }

  // ----- CART BADGE -----
  function computeCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      // support both qty & quantity props
      return cart.reduce((sum, it) => sum + Number(it.qty ?? it.quantity ?? 0), 0);
    } catch { return 0; }
  }
  function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = computeCartCount();
  }
  window.updateCartCount = updateCartCount;

  // Init
  const init = () => { wireNavbar(); updateCartCount(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Update when cart changes in another tab
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') updateCartCount();
  });
})();
