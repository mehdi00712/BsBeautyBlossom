// script.js
(function(){
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-links');
  const overlay = document.getElementById('nav-overlay');

  function closeMenu(){
    nav?.classList.remove('show');
    overlay?.classList.remove('show');
    if (hamburger) hamburger.setAttribute('aria-expanded','false');
  }
  function toggleMenu(){
    if (!nav) return;
    const open = nav.classList.toggle('show');
    if (open) {
      overlay?.classList.add('show');
      hamburger?.setAttribute('aria-expanded','true');
    } else {
      closeMenu();
    }
  }
  hamburger?.addEventListener('click', toggleMenu);
  overlay?.addEventListener('click', closeMenu);

  // Cart badge
  function updateCartCount(){
    const cart = JSON.parse(localStorage.getItem('cart')||'[]');
    const count = cart.reduce((s,i)=>s+(Number(i.qty||i.quantity||1)||1),0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
  }
  updateCartCount();
  window.updateCartCount = updateCartCount;
})();
