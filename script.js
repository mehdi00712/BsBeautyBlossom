// script.js — Navbar toggle (open/close) + cart badge + safe behaviors
(function () {
  if (window.__NAV_READY__) return; window.__NAV_READY__ = true;

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function ensureOverlay(){
    let ov = qs('#nav-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'nav-overlay';
      document.body.appendChild(ov);
    }
    return ov;
  }

  function wireNavbar(){
    const navbar    = qs('.navbar');
    const hamburger = qs('.hamburger');
    const navLinks  = qs('.nav-links');
    const overlay   = ensureOverlay();

    if (!navbar || !hamburger || !navLinks) return;

    hamburger.setAttribute('aria-label','menu');
    hamburger.setAttribute('aria-expanded','false');

    const openMenu = ()=>{
      // size panel to sit under current navbar height
      const h = navbar.offsetHeight || 64;
      navLinks.style.top = h + 'px';
      navLinks.style.maxHeight = `calc(100vh - ${h}px)`;

      navLinks.classList.add('show');
      overlay.classList.add('show');
      document.body.classList.add('nav-open');
      hamburger.setAttribute('aria-expanded','true');
      // Optional: change icon from ☰ to ✕
      hamburger.dataset.icon = hamburger.innerHTML;
      hamburger.innerHTML = '&#10005;'; // ×
    };

    const closeMenu = ()=>{
      navLinks.classList.remove('show');
      overlay.classList.remove('show');
      document.body.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded','false');
      if (hamburger.dataset.icon) hamburger.innerHTML = hamburger.dataset.icon;
    };

    const toggleMenu = ()=>{
      navLinks.classList.contains('show') ? closeMenu() : openMenu();
    };

    // Main toggle (tap again closes)
    if (!hamburger.__wired) {
      hamburger.__wired = true;
      hamburger.addEventListener('click', toggleMenu);
      hamburger.addEventListener('touchstart', e => { e.preventDefault(); toggleMenu(); }, { passive:false });
    }

    // Click outside (overlay) closes
    if (!overlay.__wired) {
      overlay.__wired = true;
      overlay.addEventListener('click', closeMenu);
      overlay.addEventListener('touchstart', closeMenu, { passive:true });
    }

    // Link click closes (on mobile) and navigates
    qsa('a', navLinks).forEach(a=>{
      if (a.__wiredClose) return;
      a.__wiredClose = true;
      a.addEventListener('click', ()=>{
        if (window.innerWidth < 1024) closeMenu();
      });
    });

    // ESC closes
    if (!document.__navEsc) {
      document.__navEsc = true;
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMenu(); });
    }

    // Resize: reset on desktop, keep sizing on mobile
    if (!window.__navResize) {
      window.__navResize = true;
      window.addEventListener('resize', ()=>{
        if (window.innerWidth >= 1024) {
          closeMenu();
          navLinks.style.maxHeight = '';
          navLinks.style.top = '';
        } else if (navLinks.classList.contains('show')) {
          const h = navbar.offsetHeight || 64;
          navLinks.style.top = h + 'px';
          navLinks.style.maxHeight = `calc(100vh - ${h}px)`;
        }
      });
    }

    // Scroll closes (prevents stuck-open feel)
    if (!window.__navScrollClose) {
      window.__navScrollClose = true;
      window.addEventListener('scroll', ()=>{
        if (window.innerWidth < 1024 && navLinks.classList.contains('show')) closeMenu();
      }, { passive:true });
    }
  }

  // ----- Cart badge -----
  function cartCount(){
    try{
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      return cart.reduce((s,i)=> s + Number(i.qty ?? i.quantity ?? 0), 0);
    }catch{ return 0; }
  }
  function updateCartCount(){
    const el = document.getElementById('cart-count');
    if (el) el.textContent = cartCount();
  }
  window.updateCartCount = updateCartCount;

  function init(){
    wireNavbar();
    updateCartCount();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

  // Sync badge if cart changes in other tabs
  window.addEventListener('storage', (e)=>{ if (e.key==='cart') updateCartCount(); });
})();
