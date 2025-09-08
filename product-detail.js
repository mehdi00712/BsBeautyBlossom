// product-detail.js – flexible variants + gallery + robust loading + cart
(function(){
  // ---- Guards --------------------------------------------------------------
  if (!window.firebase) { console.error("Firebase SDK not loaded"); return; }
  if (!window.db)       { console.error("firebase-config.js did not set window.db"); return; }

  const $ = (s, r=document) => r.querySelector(s);
  const qs = (key) => new URLSearchParams(location.search).get(key);

  // ---- Cart helpers --------------------------------------------------------
  function getCart(){ try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; } }
  function setCart(c){ localStorage.setItem('cart', JSON.stringify(c)); }
  function cartCount(c){ return c.reduce((s,i)=> s + Number(i.quantity||0), 0); }
  function updateBadge(){
    const c = getCart();
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = String(cartCount(c));
  }
  function money(n){ return 'Rs' + Number(n||0).toFixed(0); }

  // Cloudinary optimization (safe if not a Cloudinary URL)
  function clUrl(url, w){
    try {
      if (!url || !/res\.cloudinary\.com/.test(url)) return url;
      return url.replace(/\/upload\/(?!.*\/)/, /upload/f_auto,q_auto,w_${w}/);
    } catch { return url; }
  }

  // ---- Main loader ---------------------------------------------------------
  async function loadProduct(){
    const root = document.getElementById('product-root');
    const id = qs('id');

    if (!id){
      root.innerHTML = <div class="prod-info"><h1>Product not found</h1><p class="muted">Missing ?id= in the URL.</p></div>;
      return;
    }

    let snap;
    try {
      snap = await db.collection('products').doc(id).get();
    } catch (e) {
      console.error('Firestore read failed:', e);
      root.innerHTML = <div class="prod-info"><h1>Product not found</h1><p class="muted">Error loading product.</p></div>;
      return;
    }

    if (!snap.exists){
      root.innerHTML = <div class="prod-info"><h1>Product not found</h1></div>;
      return;
    }

    const p = snap.data();
    console.log('Loaded product', id, p);

    const images = Array.isArray(p.images) && p.images.length ? p.images
                   : (p.imageURL ? [p.imageURL] : []);
    const mainSrc = clUrl(images[0] || 'https://via.placeholder.com/900x900?text=No+Image', Math.min(900, window.innerWidth));

    const variants = Array.isArray(p.sizes) ? p.sizes : []; // [{label, price}]
    const base     = Number(p.basePrice || 0) || 0;
    const varPrices = variants.map(v => Number(v.price||0)).filter(n => n>0);
    const fromPrice = varPrices.length ? Math.min(...varPrices) : base;

    // ---- Render ------------------------------------------------------------
    const wrap = document.createElement('div');
    wrap.className = 'prod-layout';
    wrap.innerHTML = `
      <div class="prod-gallery">
        <img id="main-img" class="prod-main" src="${mainSrc}" alt="${p.name || ''}">
        <div class="thumbs" id="thumbs"></div>
      </div>

      <div class="prod-info">
        <h1>${p.name || ''}</h1>
        ${p.brand ? <div class="prod-brand">${p.brand}</div> : ''}
        <div class="price-line" id="price-line">${fromPrice ? money(fromPrice) : ''}</div>

        ${variants.length ? `
          <div class="variant-wrap">
            <label for="variant"><b>Choose an option</b></label>
            <select id="variant"></select>
          </div>
        ` : ''}

        <div class="qty-row">
          <label for="qty" class="muted">Quantity</label>
          <input id="qty" type="number" min="1" step="1" value="1"/>
        </div>

        <div class="actions">
          <button id="add" class="btn-primary">Add to Cart</button>
          <a href="cart.html" class="btn">Go to Cart</a>
        </div>

        ${p.description ? <div class="desc"><h3>Description</h3><p>${p.description}</p></div> : ''}
      </div>
    `;
    root.innerHTML = '';
    root.appendChild(wrap);

    // Thumbnails
    const thumbs = $('#thumbs', wrap);
    if (images.length){
      images.forEach((src, i) => {
        const im = document.createElement('img');
        im.src = clUrl(src, 260);
        im.alt = "Product image " + (i+1);
        im.addEventListener('click', () => {
          $('#main-img', wrap).src = clUrl(src, Math.min(900, window.innerWidth));
        });
        thumbs.appendChild(im);
      });
    }

    // Variants dropdown (free-form label: ml/shade/flavor/etc.)
    const sel = $('#variant', wrap);
    if (sel && variants.length){
      variants.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.label;
        opt.dataset.price = Number(v.price||0);
        opt.textContent = ${v.label} — ${money(v.price||0)};
        sel.appendChild(opt);
      });
      const setPrice = () => {
        const price = Number(sel.selectedOptions[0].dataset.price || 0);
        $('#price-line', wrap).textContent = money(price || base);
      };
      sel.addEventListener('change', setPrice);
      setPrice(); // init price line
    }

    // Add to cart
    $('#add', wrap).addEventListener('click', () => {
      const qty = Math.max(1, Number($('#qty', wrap).value || 1));

      // selected variant (or none)
      let title = p.name || 'Product';
      let price = base;

      if (sel && variants.length){
        const o = sel.selectedOptions[0];
        const label = o.value;
        price = Number(o.dataset.price || 0) || base;
        title = ${title} (${label});
      }

      const item = {
        id: id,
        name: title,
        price: price,
        quantity: qty,
        imageURL: images[0] || null
      };

      const cart = getCart();
      const idx = cart.findIndex(x => x.name === item.name);
      if (idx >= 0){
        cart[idx].quantity = Number(cart[idx].quantity || 1) + qty;
      } else {
        cart.push(item);
      }
      setCart(cart);
      updateBadge();
      alert('Added to cart!');
    });

    // init badge
    updateBadge();
  }

  document.addEventListener('DOMContentLoaded', loadProduct);
})();
