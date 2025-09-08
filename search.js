// search.js — global search + autocomplete list, navigates to product.html
(function(){
  if (!window.db) return;

  const input = document.getElementById('search-bar');
  const list  = document.getElementById('search-suggestions');
  if (!input || !list) return;

  let cache = [];
  let loaded = false;
  const LIMIT = 8;

  async function ensureData(){
    if (loaded) return;
    const snap = await db.collection('products').where('active','==',true).get();
    cache = snap.docs.map(d=>{
      const p = d.data();
      return {
        id: d.id,
        name: p.name || '',
        brand: p.brand || '',
        image: (Array.isArray(p.images) && p.images[0]) || p.imageURL || ''
      };
    });
    loaded = true;
  }

  function render(items){
    list.innerHTML = '';
    items.slice(0,LIMIT).forEach(it=>{
      const li = document.createElement('li');
      li.innerHTML = `
        ${it.image ? `<img src="${it.image}" alt="">` : `<div style="width:34px;height:34px;border:1px solid #e5e5e5;border-radius:6px"></div>`}
        <div>
          <div style="font-weight:600">${it.name}</div>
          <div class="muted" style="font-size:.85rem">${it.brand||''}</div>
        </div>
      `;
      li.addEventListener('click', ()=>{
        location.href = `product.html?id=${it.id}`;
      });
      list.appendChild(li);
    });
    list.style.display = items.length ? 'block' : 'none';
  }

  input.addEventListener('input', async ()=>{
    const q = input.value.trim().toLowerCase();
    if (!q){ list.style.display='none'; list.innerHTML=''; return; }
    await ensureData();
    const results = cache.filter(p =>
      p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
    render(results);
  });

  document.addEventListener('click', (e)=>{
    if (!list.contains(e.target) && e.target!==input){
      list.style.display='none';
    }
  });
})();
