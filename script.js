// script.js — navbar mobile toggle + cart count
(function(){
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", ()=> navLinks.classList.toggle("show"));
  }
  function updateCartCount(){
    const cart = JSON.parse(localStorage.getItem('cart')||'[]');
    const c = cart.reduce((s,i)=> s + Number(i.qty||i.quantity||0), 0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = c;
  }
  updateCartCount();
  window.addEventListener('storage', updateCartCount);
})();
