// search.js — live autocomplete (with thumbnails) + grid filtering
// Requires: an <input id="search-bar"> on the page.
// Optional: Firestore (via firebase-config.js) to prefetch products for suggestions.

(function () {
  if (window.__SEARCH_INIT__) return;
  window.__SEARCH_INIT__ = true;

  // ---------- tiny helpers ----------
  const norm = (s) => (s || "").toString().toLowerCase().trim();
  const byScore = (a, b) => a._score - b._score;
  const debounce = (fn, ms=150) => { let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; };

  // ---------- style (lightweight) ----------
  (function injectStyle(){
    if (document.getElementById('search-style')) return;
    const css = `
      .sb-wrap{ position:relative; }
      .sb-input{ width:100%; }
      .sb-dd{
        position:absolute; left:0; right:0; top:calc(100% + 6px);
        background:#0d0d12; border:1px solid #23232a; border-radius:12px;
        box-shadow:0 10px 24px rgba(0,0,0,.35); z-index:9999; max-height:380px; overflow:auto;
      }
      .sb-item{
        display:flex; align-items:center; gap:10px; padding:8px 10px; cursor:pointer;
      }
      .sb-item:hover, .sb-item.active{ background:#14141c; }
      .sb-thumb{
        width:40px; height:40px; object-fit:cover; border-radius:8px; border:1px solid #23232a;
        flex:0 0 auto;
      }
      .sb-text{ display:flex; flex-direction:column; min-width:0; }
      .sb-name{ color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .sb-brand{ color:#9aa0aa; font-size:.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .no-results{ margin:8px 0; color:#9aa0aa; }
    `;
    const s = document.createElement('style');
    s.id = 'search-style';
    s.textContent = css;
    document.head.appendChild(s);
  })();

  // ---------- wire input + dropdown ----------
  const input = document.getElementById('search-bar');
  if (!input) return;

  // Wrap the input so we can absolutely-position the dropdown
  if (!input.parentElement.classList.contains('sb-wrap')) {
    const wrap = document.createElement('div');
    wrap.className = 'sb-wrap';
    input.classList.add('sb-input');
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
  }
  const wrap = input.parentElement;
  const dd = document.createElement('div');
  dd.className = 'sb-dd';
  dd.style.display = 'none';
  wrap.appendChild(dd);

  // ---------- product cache (from Firestore if available) ----------
  let PRODUCTS = []; // {id, name, brand, imageURL, category}
  let loaded = false;

  async function prefetch() {
    if (!window.db || loaded) return;
    try {
      // Pull a reasonable slice of active products
      const snap = await db.collection('products')
        .where('active', '==', true)
        .limit(500)
        .get();

      PRODUCTS = snap.docs.map(d => {
        const p = d.data() || {};
        return {
          id: d.id,
          name: p.name || '',
          brand: p.brand || '',
          imageURL: p.imageURL || (Array.isArray(p.images) && p.images[0]) || '',
          category: (p.category || '').toLowerCase()
        };
      });
      loaded = true;
    } catch (e) {
      console.warn('search.js: prefetch failed (suggestions disabled):', e.message);
    }
  }
  prefetch(); // no await; suggestions appear when ready

  // ---------- grid filtering (works even without Firestore) ----------
  function filterGrid(q) {
    const query = norm(q);
    const grids = [
      document.querySelector('#product-grid'),
      document.querySelector('#home-featured'),
      ...document.querySelectorAll('.product-grid')
    ].filter(Boolean);

    grids.forEach(grid => {
      const cards = grid.querySelectorAll('.product');
      let any = false;
      cards.forEach(card => {
        const name = norm(card.getAttribute('data-name')) || '';
        const brand = norm(card.getAttribute('data-brand')) || '';
        const hay = (name + ' ' + brand).trim() || norm(card.innerText);
        const show = !query || hay.includes(query);
        card.style.display = show ? '' : 'none';
        if (show) any = true;
      });
      let empty = grid.querySelector('.no-results');
      if (!any) {
        if (!empty) {
          empty = document.createElement('p');
          empty.className = 'no-results';
          empty.textContent = 'No products match your search.';
          grid.appendChild(empty);
        }
      } else if (empty) {
        empty.remove();
      }
    });
  }

  // ---------- suggestions ----------
  let activeIndex = -1;
  function scoreMatch(p, q) {
    const n = norm(p.name);
    const b = norm(p.brand);
    const idxN = n.indexOf(q);
    const idxB = b.indexOf(q);
    let best = Infinity;
    if (idxN >= 0) best = Math.min(best, idxN);
    if (idxB >= 0) best = Math.min(best, idxB + 0.25); // slight penalty vs name
    return best;
  }

  function buildSuggestions(q) {
    dd.innerHTML = '';
    if (!q) { dd.style.display = 'none'; activeIndex = -1; return; }

    const query = norm(q);
    // If we haven't loaded products yet or Firebase absent — no dropdown, but keep filtering
    if (!PRODUCTS.length) { dd.style.display = 'none'; activeIndex = -1; return; }

    const hits = PRODUCTS
      .map(p => ({...p, _score: scoreMatch(p, query)}))
      .filter(x => isFinite(x._score))
      .sort(byScore)
      .slice(0, 8);

    if (!hits.length) { dd.style.display = 'none'; activeIndex = -1; return; }

    hits.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'sb-item';
      item.dataset.id = p.id;
      item.dataset.idx = String(idx);
      item.innerHTML = `
        <img class="sb-thumb" src="${p.imageURL || 'https://via.placeholder.com/80'}" alt="">
        <div class="sb-text">
          <div class="sb-name">${p.name || ''}</div>
          <div class="sb-brand">${p.brand ? p.brand : (p.category || '')}</div>
        </div>
      `;
      item.addEventListener('mouseenter', () => setActive(idx));
      item.addEventListener('mouseleave', () => setActive(-1));
      item.addEventListener('click', () => goToProduct(p.id));
      dd.appendChild(item);
    });

    dd.style.display = 'block';
    activeIndex = -1;
  }

  function setActive(idx) {
    const items = dd.querySelectorAll('.sb-item');
    items.forEach(el => el.classList.remove('active'));
    activeIndex = idx;
    if (idx >= 0 && items[idx]) {
      items[idx].classList.add('active');
      // ensure visible
      const box = items[idx].getBoundingClientRect();
      const ddb = dd.getBoundingClientRect();
      if (box.bottom > ddb.bottom) dd.scrollTop += (box.bottom - ddb.bottom);
      if (box.top < ddb.top) dd.scrollTop -= (ddb.top - box.top);
    }
  }

  function goToProduct(id) {
    if (!id) return;
    dd.style.display = 'none';
    location.href = `product.html?id=${encodeURIComponent(id)}`;
  }

  // ---------- events ----------
  const handleInput = debounce(() => {
    const q = input.value;
    filterGrid(q);
    buildSuggestions(q);
  }, 120);

  input.addEventListener('input', handleInput);
  input.addEventListener('focus', () => { if (input.value) buildSuggestions(input.value); });
  input.addEventListener('blur', () => setTimeout(()=> dd.style.display = 'none', 150)); // allow click

  input.addEventListener('keydown', (e) => {
    const items = dd.querySelectorAll('.sb-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(items.length - 1, activeIndex + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(-1, activeIndex - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        goToProduct(items[activeIndex].dataset.id);
      }
    } else if (e.key === 'Escape') {
      dd.style.display = 'none';
      activeIndex = -1;
    }
  });

  // Apply once on load (in case cards are already present)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    filterGrid(input.value);
  } else {
    document.addEventListener('DOMContentLoaded', () => filterGrid(input.value), { once: true });
  }
  window.addEventListener('load', () => filterGrid(input.value), { once: true });

  // Expose so product/category loaders can re-apply after render
  window.applySearch = () => {
    filterGrid(input.value);
    if (input === document.activeElement) buildSuggestions(input.value);
  };
})();
