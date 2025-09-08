// products.js — groups products by brand; requires window.db
(async function () {
  const gridHost = document.getElementById('product-grid');
  if (!gridHost) return;

  const category = String(window.PRODUCT_CATEGORY || '').toLowerCase();
  const groupByBrand = !!window.GROUP_BY_BRAND;
  const money = (n)=>'Rs'+Number(n||0).toFixed(0);

  const minPrice = (p) => {
    const base = Number(p.basePrice || 0) || 0;
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const prices = sizes.map(s=>Number((s&&s.price)||0)).filter(x=>x>0);
    return prices.length ? Math.min(...prices) : base;
  };
  const safeBrand = (b)=> (b && String(b).trim()) || 'Other';

  function productCard(id, p){
    const from = minPrice(p);
    const img = p.imageURL || 'https://via.placeholder.com/600x750?text=No+Image';
    const brand = p.brand ? `<div class="muted">${p.brand}</div>` : '';
    return `
      <a class="product" href="product.html?id=${id}" data-name="${p.name||''}" data-brand="${p.brand||''}">
        <img src="${img}" alt="${p.name||''}">
        <div class="pad">
          <h3>${p.name||''}</h3>
          ${brand}
          <div class="price">${from>0 ? 'From '+money(from) : ''}</div>
        </div>
      </a>
    `;
  }

  async function load(){
    try{
      gridHost.innerHTML = `<p class="muted">Loading products…</p>`;
      const snap = await db.collection('products').where('category','==',category).where('active','==',true).get();
      if (snap.empty){ gridHost.innerHTML = `<p class="muted">No products in this category yet.</p>`; return; }

      const items = []; snap.forEach(d=>items.push({id:d.id, ...d.data()}));

      if (!groupByBrand){
        gridHost.innerHTML = `<div class="product-grid"></div>`;
        const grid = gridHost.querySelector('.product-grid');
        items.forEach(p=>grid.insertAdjacentHTML('beforeend', productCard(p.id,p)));
        return;
      }

      const buckets = new Map();
      for (const p of items){
        const key = safeBrand(p.brand);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(p);
      }
      const brands = Array.from(buckets.keys()).sort((a,b)=>a.localeCompare(b));
      gridHost.innerHTML = '';
      brands.forEach(name=>{
        const list = buckets.get(name).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
        const section = document.createElement('section');
        section.className = 'brand-section';
        section.innerHTML = `<h2 class="brand-title">${name}</h2><div class="brand-grid"></div>`;
        const grid = section.querySelector('.brand-grid');
        list.forEach(p=>grid.insertAdjacentHTML('beforeend', productCard(p.id,p)));
        gridHost.appendChild(section);
      });
    }catch(e){
      console.error('Category load error:', e);
      gridHost.innerHTML = `<p class="muted">Couldn’t load products.</p>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, {once:true});
  else load();
})();
