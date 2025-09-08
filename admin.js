// admin.js — Auth + Site Settings + Cloudinary + Product CRUD + Stock
(function () {
  if (!window.firebase || !window.db) {
    throw new Error("❌ Firebase not initialized: load compat SDKs BEFORE firebase-config.js.");
  }

  const $ = (s) => document.querySelector(s);
  const auth = firebase.auth();
  const dbRef = db;

  const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET;

  // ✅ Allowed admin UIDs
  const ALLOWED_ADMIN_UIDS = new Set([
    "w5jtigflSVezQwUvnsgM7AY4ZK73",
    "nyQYzolZI2fLFqIkAPNHHbcSJ2p1",
  ]);

  const money = (n) => 'Rs' + Number(n || 0).toFixed(0);

  // ---- Auth DOM
  const authStatus = $('#auth-status');
  const loginBtn   = $('#loginBtn');
  const signupBtn  = $('#signupBtn');
  const logoutBtn  = $('#logoutBtn');
  const email      = $('#email');
  const password   = $('#password');

  // ---- Sections DOM
  const siteSection    = $('#site-section');
  const productSection = $('#product-section');
  const listSection    = $('#list-section');

  // ---- Site Settings DOM
  const siteHeroTitle    = $('#site-heroTitle');
  const siteHeroSubtitle = $('#site-heroSubtitle');
  const siteFeatCat      = $('#site-featuredCategory');
  const siteShowFeat     = $('#site-showFeatured');
  const siteBannerInput  = $('#site-banner');
  const siteBannerPrev   = $('#site-banner-preview');
  const siteGalleryInput = $('#site-gallery');
  const siteGalleryPrev  = $('#site-gallery-preview');
  const siteSaveBtn      = $('#site-save');
  const siteReloadBtn    = $('#site-reload');
  const siteStatus       = $('#site-status');

  const HOME_DOC_REF = dbRef.collection('site').doc('home');

  // ---- Product form DOM
  const nameEl   = $('#name');
  const priceEl  = $('#price');
  const sizesEl  = $('#sizes'); // "Label | Price | Stock" (stock optional)
  const descEl   = $('#description');
  const brandEl  = $('#brand');
  const categoryEl = $('#category');
  const activeEl = $('#active');
  const imagesEl = $('#images');
  const docIdEl  = $('#docId');
  const globalStockEl = $('#stock'); // optional if no sizes

  // ---- Product list DOM
  const filterCategory = $('#filterCategory');
  const refreshBtn     = $('#refreshBtn');
  const tableBody      = $('#tableBody');

  // ===== Helpers =====
  function parseSizes(text) {
    return String(text || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const parts = l.split('|').map(x => x.trim());
        const label = parts[0] || '';
        const price = Number(parts[1] || 0);
        const stock = (parts[2] !== undefined && parts[2] !== '') ? Number(parts[2]) : null;
        const o = { label, price: isNaN(price) ? 0 : price };
        if (stock !== null && !Number.isNaN(stock)) o.stock = stock;
        return o;
      });
  }

  function renderSizesText(sizes) {
    if (!Array.isArray(sizes) || !sizes.length) return '—';
    return sizes.map(s => {
      const p = Number(s.price || 0);
      const stk = (typeof s.stock === 'number') ? ` (${s.stock} pcs)` : '';
      return `${s.label}${stk} – Rs${p}`;
    }).join(', ');
  }

  function sizesToTextarea(sizes) {
    if (!Array.isArray(sizes) || !sizes.length) return '';
    return sizes.map(s => `${s.label} | ${s.price}${typeof s.stock==='number' ? ` | ${s.stock}` : ''}`).join('\n');
  }

  function resetForm() {
    docIdEl.value = '';
    nameEl.value = '';
    priceEl.value = '';
    brandEl.value = '';
    sizesEl.value = '';
    if (globalStockEl) globalStockEl.value = '';
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
  loginBtn && (loginBtn.onclick = () =>
    auth.signInWithEmailAndPassword(email.value, password.value).catch(e => alert(e.message)));

  signupBtn && (signupBtn.onclick = () =>
    auth.createUserWithEmailAndPassword(email.value, password.value)
      .then(cred => alert(`Account created. UID:\n${cred.user.uid}`))
      .catch(e => alert(e.message)));

  logoutBtn && (logoutBtn.onclick = () => auth.signOut());

  auth.onAuthStateChanged(async (u) => {
    const ok = u && (ALLOWED_ADMIN_UIDS.size === 0 || ALLOWED_ADMIN_UIDS.has(u.uid));
    if (authStatus) authStatus.textContent = u ? (ok ? `Signed in as ${u.email}` : 'Unauthorized') : 'Not signed in';
    if (logoutBtn) logoutBtn.style.display = u ? 'inline-block' : 'none';

    const show = !!ok;
    if (siteSection)    siteSection.style.display    = show ? 'block' : 'none';
    if (productSection) productSection.style.display = show ? 'block' : 'none';
    if (listSection)    listSection.style.display    = show ? 'block' : 'none';

    if (show) {
      await loadSiteSettings();
      await loadList();
    }
  });

  // ===== Site Settings =====
  async function loadSiteSettings() {
    try {
      if (siteStatus) siteStatus.textContent = 'Loading…';
      const snap = await HOME_DOC_REF.get();
      const h = snap.exists ? snap.data() : {};
      siteHeroTitle.value    = h.heroTitle || '';
      siteHeroSubtitle.value = h.heroSubtitle || '';
      siteFeatCat.value      = (h.featuredCategory || 'perfume');
      siteShowFeat.checked   = !!h.showFeatured;

      siteBannerPrev.innerHTML = h.bannerImage
        ? `<img src="${h.bannerImage}" style="width:180px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`
        : '';

      siteGalleryPrev.innerHTML = Array.isArray(h.gallery) && h.gallery.length
        ? h.gallery.map(u => `<img src="${u}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`).join('')
        : '';

      if (siteStatus) siteStatus.textContent = 'Ready';
    } catch (e) {
      console.error(e);
      if (siteStatus) siteStatus.textContent = 'Error loading site settings';
    }
  }

  siteReloadBtn && siteReloadBtn.addEventListener('click', loadSiteSettings);

  siteSaveBtn && siteSaveBtn.addEventListener('click', async () => {
    try {
      if (siteStatus) siteStatus.textContent = 'Saving…';

      let bannerURL = null;
      if (siteBannerInput.files && siteBannerInput.files[0]) {
        const [url] = await uploadImages(siteBannerInput.files);
        bannerURL = url || null;
      }

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

      // ✅ ALWAYS MERGE
      await HOME_DOC_REF.set(payload, { merge: true });

      if (siteStatus) siteStatus.textContent = '✅ Saved';
      if (bannerURL) siteBannerPrev.innerHTML = `<img src="${bannerURL}" style="width:180px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`;
      if (galleryURLs) siteGalleryPrev.innerHTML = galleryURLs.map(u => `<img src="${u}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`).join('');
      siteBannerInput.value = '';
      siteGalleryInput.value = '';
    } catch (e) {
      console.error(e);
      if (siteStatus) siteStatus.textContent = '❌ Save error: ' + e.message;
    }
  });

  // ===== Product Save =====
  $('#saveBtn') && ($('#saveBtn').onclick = async () => {
    try {
      const sizes = parseSizes(sizesEl.value);
      const hasSizes = sizes.length > 0;

      const data = {
        name: (nameEl.value || '').trim(),
        basePrice: Number(priceEl.value || 0),
        brand: (brandEl.value || '').trim() || null,
        sizes,
        description: (descEl.value || '').trim(),
        category: String(categoryEl.value || '').toLowerCase(),
        active: !!activeEl.checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // global stock only if NO sizes
      const globalStockVal = (globalStockEl && globalStockEl.value !== '') ? Number(globalStockEl.value) : null;
      if (!hasSizes) {
        if (globalStockVal !== null && !Number.isNaN(globalStockVal)) {
          data.stock = globalStockVal;
        } else {
          data.stock = firebase.firestore.FieldValue.delete();
        }
      } else {
        data.stock = firebase.firestore.FieldValue.delete();
      }

      const id = docIdEl.value || dbRef.collection('products').doc().id;

      // images
      if (imagesEl.files && imagesEl.files.length) {
        const uploaded = await uploadImages(imagesEl.files);
        if (uploaded.length) {
          const snap = await dbRef.collection('products').doc(id).get();
          const old  = snap.exists ? snap.data() : {};
          const oldList = Array.isArray(old.images) ? old.images : [];
          if (!old.imageURL) data.imageURL = uploaded[0];
          data.images = [...oldList, ...uploaded];
        }
      }

      if (!docIdEl.value) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

      // ✅ ALWAYS MERGE so delete() is allowed
      await dbRef.collection('products').doc(id).set(data, { merge: true });

      alert('✅ Product saved');
      resetForm();
      await loadList();
    } catch (e) {
      console.error(e);
      alert('Save error: ' + e.message);
    }
  });

  $('#resetBtn') && ($('#resetBtn').onclick = resetForm);

  // ===== Product list (no composite index) =====
  async function loadList() {
    try {
      tableBody.innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;

      const snap = await dbRef.collection('products')
        .where('category', '==', filterCategory.value)
        .get();

      if (snap.empty) {
        tableBody.innerHTML = `<tr><td colspan="6">No products</td></tr>`;
        return;
      }

      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

      tableBody.innerHTML = '';
      docs.forEach(p => {
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
          <td>Rs${Number(p.basePrice||0).toFixed(0)}</td>
          <td>${p.active ? 'Yes' : 'No'}</td>
          <td>
            <button class="btn edit" data-id="${p.id}">Edit</button>
            <button class="btn danger delete" data-id="${p.id}">Delete</button>
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
          if (globalStockEl) globalStockEl.value = (typeof p.stock === 'number' ? String(p.stock) : '');
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
    } catch (err) {
      console.error('loadList error:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="color:#b00020">Error loading products. Check Console.</td></tr>`;
    }
  }

  refreshBtn && (refreshBtn.onclick = loadList);
  filterCategory && (filterCategory.onchange = loadList);
})();
