// products.js — clickable cards -> product.html?id=DOC_ID, safe prices
(function(){
  const grid = document.getElementById('product-grid');
  const search = document.getElementById('search-bar');
  if (!grid) return;

  const cat = (window.PRODUCT_CATEGORY||'').toLowerCase();
  let all = [];

  function render(list){
    grid.innerHTML = '';
    if (!list.length){
      grid.innerHTML = '<p>No products yet.</p>';
      return;
    }
    list.forEach(p => {
      const base = Number(p.basePrice || 0);
      const sizes = (p.sizes||[]);
      const sel = sizes.length
        ? sizes.map(s => {
            const sp = Number(s?.price || 0) || base; // fallback to base
            return `<option data-price="${sp}" value="${s.label}">${s.label} - Rs${sp}</option>`;
          }).join('')
        : `<option data-price="${base}" value="Default">Rs${base}</option>`;

      const card = document.createElement('div');
      card.className = 'product';
      const id = p.id || p.docId;
      card.innerHTML = `
        <a class="img-wrap" href="product.html?id=${id}">
          <img src="${p.imageURL||'https://via.placeholder.com/600x600?text=No+Image'}" alt="${p.name||''}">
        </a>
        <h3><a href="product.html?id=${id}">${p.name||''}</a></h3>
        <p class="price">${base>0?`From Rs${base}`:''}</p>
        <select class="size-select ml-select">${sel}</select>
        <div class="quantity-controls">
          <button class="minus btn muted" type="button">–</button>
          <span class="qty">1</span>
          <button class="plus btn muted" type="button">+</button>
        </div>
        <button
          class="add-btn"
          type="button"
          data-name="${(p.name||'').replace(/"/g, '&quot;')}"
          onclick="addToCart(this.dataset.name, this)"
        >
          Add to Cart
        </button>
      `;
      grid.appendChild(card);
    });
  }

  function attachSearch(){
    if (!search) return;
    search.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const list = all.filter(p =>
        (p.name||'').toLowerCase().includes(q) ||
        (p.brand||'').toLowerCase().includes(q)
      );
      render(list);
    });
  }

  function showError(msg){
    console.error(msg);
    grid.innerHTML = `<p style="color:#ff9c9c">${msg}</p>`;
  }

  function waitForDb(maxTries=50){
    return new Promise((resolve, reject)=>{
      let tries = 0;
      const t = setInterval(()=>{
        tries++;
        if (window.db && typeof window.db.collection === 'function'){
          clearInterval(t);
          resolve();
        } else if (tries >= maxTries){
          clearInterval(t);
          reject(new Error('firebase-config.js did not initialize window.db'));
        }
      }, 200);
    });
  }

  async function init(){
    try{
      await waitForDb();
      db.collection('products')
        .where('category','==', cat)
        .where('active','==', true)
        .onSnapshot((snap) => {
          all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          render(all);
        }, (err) => showError('Error loading products: ' + err.message));

      attachSearch();
    }catch(e){
      showError('Init error: ' + e.message);
    }
  }

  init();
})();
