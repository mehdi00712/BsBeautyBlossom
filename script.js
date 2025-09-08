// script.js — navbar hamburger + cart badge
(function(){
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-links');
  const overlay = document.getElementById('nav-overlay');

  function closeMenu(){
    nav?.classList.remove('show');
    hamburger?.setAttribute('aria-expanded','false');
    overlay?.classList.remove('show');
  }
  function toggleMenu(){
    if (!nav) return;
    const willShow = !nav.classList.contains('show');
    nav.classList.toggle('show', willShow);
    hamburger?.setAttribute('aria-expanded', willShow ? 'true' : 'false');
    overlay?.classList.toggle('show', willShow);
  }

  hamburger?.addEventListener('click', toggleMenu);
  overlay?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMenu(); });

  // Cart badge
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      cartCountEl.textContent = cart.reduce((s,i)=> s + Number(i.quantity||0), 0);
    } catch { cartCountEl.textContent = 0; }
  }
})();
