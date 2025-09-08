// script.js — navbar hamburger + cart badge
(function(){
  const $ = s => document.querySelector(s);
  const nav = $('.nav-links');
  const burger = $('.hamburger');
  const overlay = document.getElementById('nav-overlay') || (()=>{
    const o = document.createElement('div'); o.id='nav-overlay'; document.body.appendChild(o); return o;
  })();

  function closeMenu(){
    nav?.classList.remove('show');
    overlay?.classList.remove('show');
    burger?.setAttribute('aria-expanded','false');
  }
  function toggleMenu(){
    const open = !nav.classList.contains('show');
    if (open){
      nav.classList.add('show');
      overlay.classList.add('show');
      burger.setAttribute('aria-expanded','true');
    } else {
      closeMenu();
    }
  }
  burger?.addEventListener('click', toggleMenu);
  overlay?.addEventListener('click', closeMenu);
  window.addEventListener('resize', ()=>{ if (window.innerWidth>1023) closeMenu(); });

  // Cart badge
  function refreshCartBadge(){
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const cart = JSON.parse(localStorage.getItem('cart')||'[]');
    const count = cart.reduce((s,i)=>s+(Number(i.qty||i.quantity||1)||1),0);
    badge.textContent = count;
  }
  refreshCartBadge();
  window.refreshCartBadge = refreshCartBadge;
})();
