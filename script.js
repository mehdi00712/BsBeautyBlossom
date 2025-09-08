// script.js — mobile navbar + cart badge + robust close logic
(function(){
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-links');
  const overlay = document.getElementById('nav-overlay');

  function openMenu(){
    nav?.classList.add('show');
    overlay?.classList.add('show');
    hamburger?.setAttribute('aria-expanded','true');
    // prevent scroll behind the panel
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  function closeMenu(){
    nav?.classList.remove('show');
    overlay?.classList.remove('show');
    hamburger?.setAttribute('aria-expanded','false');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }
  function toggleMenu(){
    if (!nav) return;
    nav.classList.contains('show') ? closeMenu() : openMenu();
  }

  // Controls
  hamburger?.addEventListener('click', toggleMenu);
  overlay?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeMenu(); });

  // Close when clicking any nav link (mobile)
  nav?.addEventListener('click', (e)=>{
    const a = e.target.closest('a');
    if (a) closeMenu();
  });

  // Close if resized back to desktop
  let lastW = window.innerWidth;
  window.addEventListener('resize', ()=>{
    const w = window.innerWidth;
    if (lastW <= 920 && w > 920) closeMenu();
    lastW = w;
  });

  // Cart badge
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      cartCountEl.textContent = cart.reduce((s,i)=> s + Number(i.quantity||0), 0);
    } catch {
      cartCountEl.textContent = 0;
    }
  }
})();
