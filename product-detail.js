// product-detail.js
(function(){
  // util
  const $ = (s)=>document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  const main = $('#pd-main');
  const thumbs = $('#pd-thumbs');
  const title = $('#pd-title');
  const brand = $('#pd-brand');
  const price = $('#pd-price');
  const desc = $('#pd-desc');
  const sizeSel = $('#pd-size');
  const qtyEl = $('#pd-qty');
  const minus = $('#pd-minus');
  const plus = $('#pd-plus');
  const addBtn = $('#pd-add');

  if (!id){
    title.textContent = 'Product not found';
    main.src = 'https://via.placeholder.com/800x800?text=Product+Not+Found';
    return;
  }

  function setPriceText(p){ price.textContent = p ? `From Rs${p}` : ''; }

  function renderImages(images=[], imageURL=''){
    const list = images && images.length ? images : (imageURL ? [imageURL] : []);
    if (list.length){
      main.src = list[0];
      thumbs.innerHTML = '';
      list.forEach((u,idx)=>{
        const img = document.createElement('img');
        img.className = 'pd-thumb';
        img.src = u;
        img.alt = `thumb ${idx+1}`;
        img.onclick = ()=>{ main.src = u; };
        thumbs.appendChild(img);
      });
    } else {
      main.src = 'https://via.placeholder.com/800x800?text=No+Image';
      thumbs.innerHTML = '';
    }
  }

  function renderSizes(sizes=[], basePrice=0){
    sizeSel.innerHTML = '';
    if (sizes && sizes.length){
      sizes.forEach(s=>{
        const opt = document.createElement('option');
        opt.value = s.label;
        opt.textContent = `${s.label} - Rs${s.price}`;
        opt.dataset.price = s.price;
        sizeSel.appendChild(opt);
      });
      setPriceText(sizes[0].price);
    } else {
      const opt = document.createElement('option');
      opt.value = 'Default';
      opt.textContent = `Rs${basePrice||0}`;
      opt.dataset.price = basePrice||0;
      sizeSel.appendChild(opt);
      setPriceText(basePrice||0);
    }
  }

  // qty controls
  minus.onclick = ()=>{ const n = Math.max(1, Number(qtyEl.textContent)-1); qtyEl.textContent = n; };
  plus.onclick  = ()=>{ qtyEl.textContent = Number(qtyEl.textContent)+1; };

  // load product
  db.collection('products').doc(id).get().then(doc=>{
    if (!doc.exists){
      title.textContent = 'Product not found';
      main.src = 'https://via.placeholder.com/800x800?text=Product+Not+Found';
      return;
    }
    const p = doc.data();
    title.textContent = p.name || 'Product';
    brand.textContent = p.brand ? `by ${p.brand}` : '';
    desc.textContent  = p.description || '';
    renderImages(p.images, p.imageURL);
    renderSizes(p.sizes||[], p.basePrice||0);

    addBtn.onclick = ()=>{
      const sel = sizeSel.options[sizeSel.selectedIndex];
      const unitPrice = Number(sel?.dataset?.price || p.basePrice || 0);
      const qty = Number(qtyEl.textContent || 1);
      const nameSafe = (p.name||'').trim();

      // Write to new cart format directly (robust even if addToCart isn't available here)
      const key = 'bbb_cart_v2';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const idKey = `${nameSafe}__${unitPrice}`;
      const found = existing.find(i=>i.id===idKey);
      if (found) { found.qty += qty; }
      else {
        existing.push({
          id: idKey,
          name: nameSafe,
          unitPrice,
          qty,
          imageURL: (p.images && p.images[0]) || p.imageURL || ''
        });
      }
      localStorage.setItem(key, JSON.stringify(existing));

      // update cart count in navbar
      const count = existing.reduce((n,i)=>n+(i.qty||0),0);
      const cc = document.getElementById('cart-count'); if (cc) cc.textContent = count;

      addBtn.textContent = 'Added ✓';
      setTimeout(()=>addBtn.textContent='Add to Cart',1200);
    };
  }).catch(err=>{
    console.error(err);
    title.textContent = 'Error loading product';
    main.src = 'https://via.placeholder.com/800x800?text=Error';
  });
})();
