// search.js — simple autocomplete across active products (client filter)
(function(){
  const input = document.getElementById('search-bar');
  const list  = document.getElementById('search-suggestions');
  if (!input || !list) return;

  let all = []; let loaded = false; let timer;

  async function loadOnce(){
    if (loaded) return;
    // fetch up to 200 active products (adjust as needed)
    const snap = await db.collection('products').where('active','==',true).limit(200).get();
    all = snap.docs.map(d=>({id:d.id, ...d.data()}));
    loaded = true;
  }
  function match(q, p){
    q = q.toLowerCase();
    return (p.name||'').toLowerCase().includes(q) || (p.brand||'').toLowerCase().includes(q);
  }
  function render(items){
    list.innerHTML = '';
    if (!items.length){ list.style.display='none'; return; }
    items.slice(0,10).forEach(p=>{
      const li=document.createElement('li');
      const img=p.imageURL||'https://via.placeholder.com/60x60?text=No+Image';
      li.innerHTML = `<img src="${img}" alt=""><div><div><strong>${p.name||''}</strong></div><div class="muted">${p.brand||''}</div></div>`;
      li.addEventListener('click', ()=>{ window.location.href = `product.html?id=${p.id}`; });
      list.appendChild(li);
    });
    list.style.display='block';
  }

  input.addEventListener('input', async ()=>{
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q){ list.style.display='none'; return; }
    timer = setTimeout(async ()=>{
      try{
        await loadOnce();
        const results = all.filter(p=>match(q,p));
        render(results);
      }catch(e){ console.error(e); }
    }, 120);
  });

  document.addEventListener('click', (e)=>{ if (!list.contains(e.target) && e.target!==input){ list.style.display='none'; }});
})();
