// products.js — normalize legacy sizes, show correct "From RsX", safe add-to-cart pricing
(function () {
  const grid = document.getElementById('product-grid');
  const search = document.getElementById('search-bar');
  if (!grid) return;

  const cat = (window.PRODUCT_CATEGORY || '').toLowerCase();
  let all = [];

  // --- normalize sizes coming from Firestore (objects or strings like "50ml | 1000") ---
  function normalizeSizes(raw, basePrice) {
    const base = Number(basePrice || 0) || 0;
    const out = [];
    if (!Array.isArray(raw)) {
      if (base > 0) out.push({ label: 'Default', price: base });
      return out;
    }
    for (const s of raw) {
      if (s && typeof s === 'object' && 'label' in s) {
        const price = Number(s.price || 0);
        if (s.label && price > 0) out.push({ label: String(s.label), price });
        continue;
      }
      if (typeof s === 'string') {
        // e.g. "50ml | 1000", "50ml 1,000", "50ml : Rs 950"
        const m = s.trim().match(/^(.*?)[\s|:\-–—]*\s*(?:Rs)?\s*([\d.,]+)\s*$/i);
        if (m) {
          const label = m[1].trim().replace(/[|:\-–—]$/, '').trim();
          const price = Number((m[2] || '0').replace(/[^\d.]/g, ''));
          if (label && price > 0) out.push({ label, price });
        }
      }
    }
    if (!out.length && base > 0) out.push({ label: 'Default', price: base });
    return out;
  }

  function minPrice(sizes, basePrice) {
    const base = Number(basePrice || 0) || 0;
    const arr = (sizes || []).map(x => Number(x.price || 0)).filter(n => n > 0);
    if (arr.length) return Math.min(...arr);
    return base;
  }

  function render(list) {
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p>No products yet.</p>';
      return;
    }
    list.forEach(p => {
      const normSizes = normalizeSizes(p.sizes, p.basePrice);
      const from = minPrice(normSizes, p.basePrice) || 0;

      const sel = normSizes.length
        ? normSizes.map(s => `<option data-price="${s.price}" value="${s.label}">${s.label} - Rs${s.price}</option>`).join('')
        : `<option data-price="${from}" value="Default">Rs${from}</option>`;

      const id = p.id || p.docId;
      const card = document.createElement('div');
      card.className = 'product';
      card.innerHTML = `
        <a class="img-wrap" href="product.html?id=${id}">
          <img src="${p.imageURL || 'https://via.placeholder.com/600x600?text=No+Image'}" alt="${p.name || ''}">
        </a>
        <h3><a href="product.html?id=${id}">${p.name || ''}</a></h3>
        <p class="price">${from > 0 ? `From Rs${from}` : ''}</p>
        <select class="size-select ml-select">${sel}</select>
        <div class="quantity-controls">
          <button class="minus btn muted" type="button">–</button>
          <span class="qty">1</span>
          <button class="plus btn muted" type="button">+</button>
        </div>
        <button
          class="add-btn"
          type="button"
          data-name="${(p.name || '').replace(/"/g, '&quot;')}"
          onclick="addToCart(this.dataset.name, this)"
        >
          Add to Cart
        </button>
      `;
      grid.appendChild(card);
    });
  }

  function attachSearch() {
    if (!search) return;
    search.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const list = all.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
      render(list);
    });
  }

  function showError(msg) {
    console.error(msg);
    grid.innerHTML = `<p style="color:#ff9c9c">${msg}</p>`;
  }

  function waitForDb(maxTries = 50) {
    return new Promise((resolve, reject) => {
      let tries = 0;
      const t = setInterval(() => {
        tries++;
        if (window.db && typeof window.db.collection === 'function') {
          clearInterval(t);
          resolve();
        } else if (tries >= maxTries) {
          clearInterval(t);
          reject(new Error('firebase-config.js did not initialize window.db'));
        }
      }, 200);
    });
  }

  async function init() {
    try {
      await waitForDb();
      db.collection('products')
        .where('category', '==', cat)
        .where('active', '==', true)
        .onSnapshot((snap) => {
          all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          render(all);
        }, (err) => showError('Error loading products: ' + err.message));

      attachSearch();
    } catch (e) {
      showError('Init error: ' + e.message);
    }
  }

  init();
})();
