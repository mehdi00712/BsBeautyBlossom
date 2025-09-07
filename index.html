// search.js — global autocomplete with mini-cart fallback

(function () {
  if (window.__SEARCH_READY__) return; window.__SEARCH_READY__ = true;

  const input = document.getElementById('search-bar');
  const list  = document.getElementById('search-suggestions');
  if (!input || !list) return;

  let ALL = []; // cached products [{id, name, brand, category, imageURL, fromPrice}]

  // Helpers
  const qs  = (s, r=document) => r.querySelector(s);
  const esc = (s='') => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function computeFromPrice(p){
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes.map(s => Number((s && s.price) || 0)).filter(n => n > 0);
    return prices.length ? Math.min(...prices) : base;
  }

  function cartData(){
    try{
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      // Normalize fields (support qty/quantity)
      return cart.map(it => ({
        name: it.name || '',
        imageURL: it.imageURL || it.img || '',
        price: Number(it.price || it.unitPrice || 0) || 0,
        qty: Number(it.qty ?? it.quantity ?? 1) || 1
      }));
    }catch{ return []; }
  }

  function money(n){ return 'Rs' + Number(n||0).toFixed(0); }

  function closeList(){
    list.classList.remove('show');
    list.innerHTML = '';
  }

  function openList(){
    list.classList.add('show');
  }

  function renderResults(rows){
    if (!rows.length){
      return renderMiniCart();
    }
    list.innerHTML = rows.map(r => `
      <li class="sg-item" data-id="${esc(r.id)}">
        <img src="${esc(r.imageURL || 'https://via.placeholder.com/80x80?text=No+Img')}" alt="">
        <div>
          <div class="sg-name">${esc(r.name)}</div>
          <div class="meta">${esc(r.brand || r.category || '')}</div>
        </div>
        <div class="sg-price">${r.fromPrice ? money(r.fromPrice) : ''}</div>
      </li>
    `).join('');
    // Click → go to product page
    list.querySelectorAll('.sg-item').forEach(li=>{
      li.addEventListener('click', ()=>{
        const id = li.getAttribute('data-id');
        if (id) window.location.href = `product.html?id=${encodeURIComponent(id)}`;
      });
    });
  }

  function renderMiniCart(){
    const cart = cartData();
    if (!cart.length){
      list.innerHTML = `
        <li class="mini-empty">
          <div class="mini-title">Your bag is empty</div>
          <div class="mini-sub">Try searching another product or browse categories.</div>
          <div class="mini-cta">
            <a class="btn btn-primary" href="perfume.html">Shop Perfume</a>
            <a class="btn" href="skincare.html">Shop Skincare</a>
          </div>
        </li>
      `;
      return;
    }

    let subtotal = 0;
    const itemsHTML = cart.slice(0, 6).map(it=>{
      const line = it.price * it.qty;
      subtotal += line;
      return `
        <div class="mini-row">
          <img class="mini-thumb" src="${esc(it.imageURL || 'https://via.placeholder.com/80x80?text=Img')}" alt="">
          <div class="mini-info">
            <div class="mini-name">${esc(it.name)}</div>
            <div class="mini-meta">Qty ${it.qty} • ${money(it.price)}</div>
          </div>
          <div class="mini-line">${money(line)}</div>
        </div>
      `;
    }).join('');

    list.innerHTML = `
      <li class="mini-cart">
        <div class="mini-title">In your bag</div>
        <div class="mini-items">${itemsHTML}</div>
        <div class="mini-subtotal">
          <span>Subtotal</span>
          <strong>${money(subtotal)}</strong>
        </div>
        <div class="mini-cta">
          <a class="btn" href="cart.html">View Cart</a>
          <a class="btn btn-primary" href="cart.html">Checkout</a>
        </div>
        <div class="mini-note muted">Tip: keep typing to search the catalog.</div>
      </li>
    `;
  }

  function filter(query){
    const q = query.trim().toLowerCase();
    if (!q){
      // Don’t show anything automatically; close dropdown
      closeList();
      return;
    }
    const rows = ALL.filter(p=>{
      const n = (p.name||'').toLowerCase();
      const b = (p.brand||'').toLowerCase();
      return n.includes(q) || b.includes(q);
    }).slice(0, 12);
    renderResults(rows);
    openList();
  }

  // Load products once
  async function loadProducts(){
    try{
      const snap = await db.collection('products').where('active','==',true).limit(400).get();
      ALL = snap.docs.map(d=>{
        const p = d.data();
        return {
          id: d.id,
          name: p.name || '',
          brand: p.brand || '',
          category: p.category || '',
          imageURL: p.imageURL || '',
          fromPrice: computeFromPrice(p)
        };
      });
    }catch(e){
      console.error('Search load error:', e);
      ALL = [];
    }
  }

  // Wire events
  input.addEventListener('input', (e)=> filter(e.target.value));
  input.addEventListener('focus', ()=>{
    // If there’s text, filter; if not but user focuses, don’t auto-open.
    if (input.value.trim()){
      filter(input.value);
    }
  });

  // Close on outside click / ESC / route change
  document.addEventListener('click', (e)=>{
    if (!list.contains(e.target) && e.target !== input) closeList();
  });
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeList(); });

  // Re-open with updated cart if currently showing mini-cart
  window.addEventListener('storage', (e)=>{
    if (e.key === 'cart' && list.classList.contains('show') && !input.value.trim()){
      renderMiniCart();
    }
  });

  // Init
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadProducts, { once:true });
  } else {
    loadProducts();
  }
})();
