// admin.js — Auth + Site Settings + Cloudinary + Product CRUD + Stock
(function () {
  if (!window.firebase || !window.db) {
    throw new Error("❌ Firebase not initialized: ensure admin.html loads compat SDKs then firebase-config.js.");
  }

  // ===== Basic shorthands =====
  const $ = (s) => document.querySelector(s);
  const auth = firebase.auth();
  const dbRef = db;

  const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET;

  // Restrict access (add your UID here to lock down the admin; empty = allow any signed-in user)
  const ALLOWED_ADMIN_UIDS = new Set([
    "w5jtigflSVezQwUvnsgM7AY4ZK73", // your UID (from earlier)
  ]);

  // ===== Auth elements =====
  const authStatus = $('#auth-status'), loginBtn = $('#loginBtn'), signupBtn = $('#signupBtn'), logoutBtn = $('#logoutBtn');
  const email = $('#email'), password = $('#password');

  // Sections
  const siteSection    = $('#site-section');
  const productSection = $('#product-section');
  const listSection    = $('#list-section');

  // ===== Site Settings elements =====
  const siteHeroTitle   = $('#site-heroTitle');
  const siteHeroSubtitle= $('#site-heroSubtitle');
  const siteFeatCat     = $('#site-featuredCategory');
  const siteShowFeat    = $('#site-showFeatured');
  const siteBannerInput = $('#site-banner');
  const siteBannerPrev  = $('#site-banner-preview');
  const siteGalleryInput= $('#site-gallery');
  const siteGalleryPrev = $('#site-gallery-preview');
  const siteSaveBtn     = $('#site-save');
  const siteReloadBtn   = $('#site-reload');
  const siteStatus      = $('#site-status');

  const HOME_DOC_REF = dbRef.collection('site').doc('home');

  // ===== Product elements =====
  const nameEl = $('#name'), priceEl = $('#price'), sizesEl = $('#sizes'), descEl = $('#description');
  const brandEl = $('#brand'), categoryEl = $('#category'), activeEl = $('#active'), imagesEl = $('#images'), docIdEl = $('#docId');
  const globalStockEl = $('#stock');
  const filterCategory = $('#filterCategory'), refreshBtn = $('#refreshBtn'), tableBody = $('#tableBody');

  const money = (n) => 'Rs' + Number(n || 0).toFixed(0);

  // ===== Helpers =====
  function parseSizes(text) {
    return text.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const parts = l.split('|').map(x => x.trim());
        const label = parts[0] || '';
        const price = Number(parts[1] || 0);
        const stock = parts[2] !== undefined && parts[2] !== '' ? Number(parts[2]) : null;
        return { label, price, ...(stock !== null ? { stock } : {}) };
      });
  }
  function renderSizesText(sizes) {
    if (!Array.isArray(sizes) || !sizes.length) return '—';
    return sizes.map(s => {
      const price = Number(s.price || 0);
      const hasStock = typeof s.stock === 'number';
      return `${s.label} ${hasStock ? `(${s.stock} pcs)` : ''} – ${isNaN(price) ? 'Rs0' : money(price)}`;
    }).join(', ');
  }
  function sizesToTextarea(sizes){
    if (!Array.isArray(sizes) || !sizes.length) return '';
    return sizes.map(s => `${s.label} | ${s.price}${typeof s.stock==='number' ? ` | ${s.stock}`:''}`).join('\n');
  }
  function resetForm() {
    docIdEl.value = '';
    nameEl.value = '';
    priceEl.value = '';
    brandEl.value = '';
    sizesEl.value = '';
    globalStockEl.value = '';
    descEl.value = '';
    categoryEl.value = 'perfume';
    imagesEl.value = '';
    activeEl.checked = true;
  }

  async function uploadImages(files) {
    if (!files || !files.length) return [];
    const urls = [];
    for (const f of files) {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) urls.push(data.secure_url);
    }
    return urls;
  }

  // ===== Auth =====
  loginBtn && (loginBtn.onclick = () => auth.signInWithEmailAndPassword(email.value, password.value).catch(e => alert(e.message)));
  signupBtn && (signupBtn.onclick = () => auth.createUserWithEmailAndPassword(email.value, password.value)
    .then(cred => alert(`Account created. UID:\n${cred.user.uid}`))
    .catch(e => alert(e.message)));
  logoutBtn && (logoutBtn.onclick = () => auth.signOut());

  auth.onAuthStateChanged(async (u) => {
    const ok = u && (ALLOWED_ADMIN_UIDS.size === 0 || ALLOWED_ADMIN_UIDS.has(u.uid));
    authStatus.textContent = u ? (ok ? `Signed in as ${u.email}` : 'Unauthorized') : 'Not signed in';
    logoutBtn.style.display = u ? 'inline-block' : 'none';

    const show = !!ok;
    siteSection.style.display    = show ? 'block' : 'none';
    productSection.style.display = show ? 'block' : 'none';
    listSection.style.display    = show ? 'block' : 'none';

    if (show) {
      await loadSiteSettings();
      await loadList();
    }
  });

  // ===== Site Settings logic =====
  async function loadSiteSettings() {
    try {
      siteStatus.textContent = 'Loading…';
      const snap = await HOME_DOC_REF.get();
      const h = snap.exists ? snap.data() : {};
      siteHeroTitle.value    = h.heroTitle || '';
      siteHeroSubtitle.value = h.heroSubtitle || '';
      siteFeatCat.value      = (h.featuredCategory || 'perfume');
      siteShowFeat.checked   = !!h.showFeatured;

      // previews
      siteBannerPrev.innerHTML  = h.bannerImage ? `<img src="${h.bannerImage}" style="width:180px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">` : '';
      siteGalleryPrev.innerHTML = Array.isArray(h.gallery) && h.gallery.length
        ? h.gallery.map(u => `<img src="${u}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`).join('')
        : '';

      siteStatus.textContent = 'Ready';
    } catch (e) {
      console.error(e);
      siteStatus.textContent = 'Error loading site settings';
    }
  }

  siteReloadBtn.addEventListener('click', loadSiteSettings);

  siteSaveBtn.addEventListener('click', async () => {
    try {
      siteStatus.textContent = 'Saving…';

      // Upload banner (replace)
      let bannerURL = null;
      if (siteBannerInput.files && siteBannerInput.files[0]) {
        const [url] = await uploadImages(siteBannerInput.files);
        bannerURL = url || null;
      }

      // Upload gallery (overwrite with chosen)
      let galleryURLs = null;
      if (siteGalleryInput.files && siteGalleryInput.files.length) {
        galleryURLs = await uploadImages(siteGalleryInput.files);
      }

      const payload = {
        heroTitle: siteHeroTitle.value.trim(),
        heroSubtitle: siteHeroSubtitle.value.trim(),
        featuredCategory: siteFeatCat.value,
        showFeatured: !!siteShowFeat.checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (bannerURL !== null) payload.bannerImage = bannerURL;
      if (galleryURLs !== null) payload.gallery = galleryURLs;

      await HOME_DOC_REF.set(payload, { merge: true });

      siteStatus.textContent = '✅ Saved';
      // refresh previews
      if (bannerURL) siteBannerPrev.innerHTML = `<img src="${bannerURL}" style="width:180px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`;
      if (galleryURLs) siteGalleryPrev.innerHTML = galleryURLs.map(u => `<img src="${u}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`).join('');
      siteBannerInput.value = '';
      siteGalleryInput.value = '';
    } catch (e) {
      console.error(e);
      siteStatus.textContent = '❌ Save error: ' + e.message;
    }
  });

  // ===== Product CRUD =====
  $('#saveBtn').onclick = async () => {
    try {
      const sizes = parseSizes(sizesEl.value);
      const data = {
        name: nameEl.value.trim(),
        basePrice: Number(priceEl.value || 0),
        brand: brandEl.value.trim() || null,
        sizes,
        description: descEl.value.trim() || '',
        category: String(categoryEl.value || '').toLowerCase(),
        active: !!activeEl.checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // global stock if no sizes
      const globalStockVal = globalStockEl.value !== '' ? Number(globalStockEl.value) : null;
      if (!sizes.length && globalStockVal !== null && !Number.isNaN(globalStockVal)) {
        data.stock = globalStockVal;
      } else {
        data.stock = firebase.firestore.FieldValue.delete();
      }

      const id = docIdEl.value || dbRef.collection('products').doc().id;

      // Upload images
      if (imagesEl.files && imagesEl.files.length) {
        const uploaded = await uploadImages(imagesEl.files);
        if (uploaded.length) {
          if (!docIdEl.value) {
            data.imageURL = uploaded[0];
            data.images = uploaded.slice(1);
          } else {
            const snap = await dbRef.collection('products').doc(id).get();
            const old = snap.exists ? snap.data() : {};
            const oldList = Array.isArray(old.images) ? old.images : [];
            data.images = [...oldList, ...uploaded];
            if (!old.imageURL) data.imageURL = uploaded[0];
          }
        }
      }

      if (docIdEl.value) {
        delete data.createdAt;
        await dbRef.collection('products').doc(id).set(data, { merge: true });
      } else {
        await dbRef.collection('products').doc(id).set(data);
      }

      alert('✅ Product saved');
      resetForm();
      loadList();
    } catch (e) {
      console.error(e);
      alert('Save error: ' + e.message);
    }
  };

  $('#resetBtn').onclick = resetForm;

  async function loadList() {
    tableBody.innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;
    const snap = await dbRef.collection('products').where('category', '==', filterCategory.value).orderBy('name').get();

    if (snap.empty) {
      tableBody.innerHTML = `<tr><td colspan="6">No products</td></tr>`;
      return;
    }

    tableBody.innerHTML = '';
    snap.forEach((doc) => {
      const p = doc.data();
      const sizesTxt = renderSizesText(p.sizes);
      const totalStock = Array.isArray(p.sizes) && p.sizes.length
        ? p.sizes.reduce((sum, s) => sum + (typeof s.stock === 'number' ? s.stock : 0), 0)
        : (typeof p.stock === 'number' ? p.stock : null);

      const stockTxt = Array.isArray(p.sizes) && p.sizes.length
        ? (totalStock !== null ? `${totalStock} pcs total` : '(sizes; stock unspecified)')
        : (typeof p.stock === 'number' ? `${p.stock} pcs` : '—');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.imageURL ? `<img src="${p.imageURL}" width="60" height="60" style="object-fit:cover;border-radius:6px;border:1px solid #e5e5e5">` : ''}</td>
        <td>
          <div style="font-weight:600">${p.name || ''}</div>
          ${p.brand ? `<div class="muted">${p.brand}</div>` : ''}
          <div class="muted">Stock: ${stockTxt}</div>
        </td>
        <td>${sizesTxt}</td>
        <td>${money(p.basePrice)}</td>
        <td>${p.active ? 'Yes' : 'No'}</td>
        <td>
          <button class="btn edit" data-id="${doc.id}">Edit</button>
          <button class="btn danger delete" data-id="${doc.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll('.edit').forEach(btn => {
      btn.onclick = async () => {
        const d = await dbRef.collection('products').doc(btn.dataset.id).get();
        if (!d.exists) return;
        const p = d.data();

        docIdEl.value = d.id;
        nameEl.value = p.name || '';
        priceEl.value = Number(p.basePrice || 0);
        brandEl.value = p.brand || '';
        sizesEl.value = sizesToTextarea(p.sizes || []);
        globalStockEl.value = typeof p.stock === 'number' ? String(p.stock) : '';
        descEl.value = p.description || '';
        categoryEl.value = p.category || 'perfume';
        activeEl.checked = !!p.active;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    });

    tableBody.querySelectorAll('.delete').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Delete this product?')) return;
        await dbRef.collection('products').doc(btn.dataset.id).delete();
        loadList();
      };
    });
  }

  refreshBtn.onclick = loadList;
  filterCategory.onchange = loadList;
})();
