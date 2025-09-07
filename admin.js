// admin.js — Auth + Firestore + Cloudinary + Site settings
(function () {
  if (window.__ADMIN_INIT__) return;
  window.__ADMIN_INIT__ = true;

  if (!window.db) throw new Error("❌ Firestore not initialized (firebase-config.js must run after compat SDKs).");
  if (!window.auth) { alert("Firebase Auth isn’t loaded. Ensure firebase-auth-compat.js is before firebase-config.js on admin.html."); return; }

  const $ = (s) => document.querySelector(s);

  // ✅ Allow only your admin UID(s)
  const ALLOWED_ADMIN_UIDS = new Set([
    "w5jtigflSVezQwUvnsgM7AY4ZK73"
  ]);

  // ===== Cloudinary upload =====
  const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET;

  async function uploadToCloudinary(file) {
    if (!file) return '';
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Cloudinary upload failed: ' + await res.text());
    const data = await res.json();
    return data.secure_url;
  }

  // ===== AUTH =====
  const authStatus = $('#auth-status');
  const loginBtn = $('#loginBtn'); const signupBtn = $('#signupBtn'); const logoutBtn = $('#logoutBtn');
  const email = $('#email'); const password = $('#password');

  loginBtn.onclick = async () => { try { await auth.signInWithEmailAndPassword(email.value, password.value); } catch(e){ alert(e.message); } };
  signupBtn.onclick = async () => {
    try {
      const cred = await auth.createUserWithEmailAndPassword(email.value, password.value);
      console.log('New UID:', cred.user?.uid);
      alert('Account created. Add UID to Firestore rules + ALLOWED_ADMIN_UIDS in admin.js');
    } catch(e){ alert(e.message); }
  };
  logoutBtn.onclick = () => auth.signOut();

  const siteSection = $('#site-section'); const productSection = $('#product-section'); const listSection = $('#list-section');

  auth.onAuthStateChanged((u) => {
    const ok = !!u && (ALLOWED_ADMIN_UIDS.size === 0 || ALLOWED_ADMIN_UIDS.has(u.uid));
    authStatus.textContent = u ? (ok ? `Signed in as ${u.email}` : 'Signed in but not authorized') : 'Not signed in';
    logoutBtn.style.display = u ? 'inline-block' : 'none';

    siteSection.style.display = ok ? 'block' : 'none';
    productSection.style.display = ok ? 'block' : 'none';
    listSection.style.display = ok ? 'block' : 'none';

    if (ok) { loadSite(); loadTable(); }
  });

  // ===== SITE SETTINGS =====
  const siteDocRef = db.collection('site').doc('home');
  const siteHeroTitle = $('#site-heroTitle');
  const siteHeroSubtitle = $('#site-heroSubtitle');
  const siteFeaturedCategory = $('#site-featuredCategory');
  const siteShowFeatured = $('#site-showFeatured');
  const siteBannerInput = $('#site-banner');
  const siteBannerPreview = $('#site-banner-preview');
  const siteGalleryInput = $('#site-gallery');
  const siteGalleryPreview = $('#site-gallery-preview');
  const siteSaveBtn = $('#site-save'); const siteReloadBtn = $('#site-reload'); const siteStatus = $('#site-status');

  function previewImages(container, urls) {
    container.innerHTML = '';
    urls.forEach(u => {
      const img = document.createElement('img');
      img.src = u; img.alt = 'preview';
      img.style.width='120px'; img.style.height='120px'; img.style.objectFit='cover';
      img.style.borderRadius='10px'; img.style.border='1px solid #23232a';
      container.appendChild(img);
    });
  }

  async function loadSite() {
    siteStatus.textContent = 'Loading site settings…';
    try {
      const snap = await siteDocRef.get();
      const d = snap.exists ? snap.data() : {};
      siteHeroTitle.value = d.heroTitle || '';
      siteHeroSubtitle.value = d.heroSubtitle || '';
      siteFeaturedCategory.value = d.featuredCategory || 'perfume';
      siteShowFeatured.checked = !!d.showFeatured;
      previewImages(siteBannerPreview, d.bannerImage ? [d.bannerImage] : []);
      previewImages(siteGalleryPreview, Array.isArray(d.gallery) ? d.gallery : []);
      siteStatus.textContent = 'Loaded ✓';
    } catch (e) { console.error(e); siteStatus.textContent = 'Error: ' + e.message; }
  }
  siteReloadBtn.onclick = loadSite;

  siteSaveBtn.onclick = async () => {
    siteStatus.textContent = 'Saving…';
    try {
      const payload = {
        heroTitle: siteHeroTitle.value.trim(),
        heroSubtitle: siteHeroSubtitle.value.trim(),
        featuredCategory: siteFeaturedCategory.value,
        showFeatured: !!siteShowFeatured.checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (siteBannerInput.files && siteBannerInput.files[0]) payload.bannerImage = await uploadToCloudinary(siteBannerInput.files[0]);
      if (siteGalleryInput.files && siteGalleryInput.files.length > 0) {
        const urls = [];
        for (const f of siteGalleryInput.files) urls.push(await uploadToCloudinary(f));
        payload.gallery = urls;
      }
      await siteDocRef.set(payload, { merge: true });
      siteStatus.textContent = 'Saved ✓';
      if (payload.bannerImage) previewImages(siteBannerPreview, [payload.bannerImage]);
      if (payload.gallery) previewImages(siteGalleryPreview, payload.gallery);
    } catch (e) { console.error(e); siteStatus.textContent = 'Save failed: ' + e.message; alert('Save failed: ' + e.message); }
  };

  // ===== PRODUCTS =====
  const nameEl = $('#name'); const brandEl = $('#brand'); const priceEl = $('#price'); const sizesEl = $('#sizes');
  const descEl = $('#description'); const categoryEl = $('#category'); const imgEl = $('#images'); const activeEl = $('#active');
  const saveBtn = $('#saveBtn'); const resetBtn = $('#resetBtn'); const docIdEl = $('#docId');

  const tableBody = $('#tableBody'); const filterCategory = $('#filterCategory'); const refreshBtn = $('#refreshBtn');

  const parseSizes = (text='') =>
    text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const m = l.match(/^(.*?)[\s|:\-–—]*\s*(?:Rs)?\s*([\d.,]+)\s*$/i);
      if (!m) return null;
      const label = m[1].trim().replace(/[|:\-–—]$/, '').trim();
      const priceNum = Number((m[2] || '0').replace(/[^\d.]/g, ''));
      if (!label || !isFinite(priceNum) || priceNum <= 0) return null;
      return { label, price: priceNum };
    }).filter(Boolean);

  const renderSizes = (sizes=[]) => sizes.map(s => `${s.label} (Rs${s.price})`).join(', ');

  const resetForm = () => {
    docIdEl.value=''; nameEl.value=''; brandEl.value=''; priceEl.value='';
    sizesEl.value=''; descEl.value=''; categoryEl.value='perfume';
    if(imgEl) imgEl.value=''; activeEl.checked=true;
  };

  saveBtn.onclick = async () => {
    const sizes = parseSizes(sizesEl.value);
    const data = {
      name: nameEl.value.trim(),
      brand: brandEl.value.trim(),
      basePrice: Number(priceEl.value || 0),
      sizes,
      description: descEl.value.trim(),
      category: categoryEl.value,
      active: !!activeEl.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!data.name) return alert('Name required');
    if (!(data.basePrice > 0) && sizes.length) {
      const first = sizes.find(s => Number(s.price) > 0);
      if (first) data.basePrice = Number(first.price);
    }
    if (!(data.basePrice > 0) && !sizes.length) return alert('Set a Base price or at least one Size with price');

    try {
      const id = docIdEl.value || db.collection('products').doc().id;

      if (imgEl && imgEl.files && imgEl.files.length) {
        const urls = [];
        for (const f of imgEl.files) urls.push(await uploadToCloudinary(f));
        data.imageURL = urls[0];
        data.images = urls;
      }

      if (docIdEl.value) {
        const upd = {...data}; delete upd.createdAt;
        await db.collection('products').doc(id).set(upd, {merge:true});
      } else {
        await db.collection('products').doc(id).set(data, {merge:true});
        docIdEl.value = id;
      }

      alert('Saved ✓');
    } catch (e) { console.error(e); alert(e.message); }
  };
  resetBtn.onclick = resetForm;

  function loadTable() {
    const cat = filterCategory.value;
    tableBody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
    db.collection('products').where('category','==',cat).onSnapshot((snap)=>{
      tableBody.innerHTML = '';
      if (snap.empty) { tableBody.innerHTML = '<tr><td colspan="6">No products yet</td></tr>'; return; }
      snap.forEach(doc => {
        const p = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.imageURL ? `<img src="${p.imageURL}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid #23232a">` : ''}</td>
          <td>${p.name || ''}${p.brand ? `<div class="muted">${p.brand}</div>` : ''}</td>
          <td>${renderSizes(p.sizes || [])}</td>
          <td>Rs${(Number(p.basePrice||0)).toFixed(2)}</td>
          <td>${p.active ? 'Yes' : 'No'}</td>
          <td>
            <button class="btn muted edit" data-id="${doc.id}">Edit</button>
            <button class="btn danger delete" data-id="${doc.id}">Delete</button>
          </td>`;
        tableBody.appendChild(tr);
      });

      tableBody.querySelectorAll('button.edit').forEach(btn => btn.onclick = async e => {
        const id = e.currentTarget.dataset.id;
        const d = await db.collection('products').doc(id).get();
        if (!d.exists) return;
        const p = d.data();
        docIdEl.value = id;
        nameEl.value = p.name || '';
        brandEl.value = p.brand || '';
        priceEl.value = p.basePrice || '';
        sizesEl.value = (p.sizes || []).map(s => typeof s === 'string' ? s : `${s.label} | ${s.price}`).join('\n');
        descEl.value = p.description || '';
        categoryEl.value = p.category || 'perfume';
        activeEl.checked = !!p.active;
        window.scrollTo({top:0, behavior:'smooth'});
      });

      tableBody.querySelectorAll('button.delete').forEach(btn => btn.onclick = async e => {
        const id = e.currentTarget.dataset.id;
        if (!confirm('Delete this product?')) return;
        await db.collection('products').doc(id).delete();
      });
    }, (err)=>{
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="6" style="color:#ff9c9c">Error: ${err.message}</td></tr>`;
    });
  }

  refreshBtn.onclick = loadTable;
  filterCategory.onchange = loadTable;

  // ===== ensure hamburger works even if script.js failed to load =====
  (function ensureHamburger(){
    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");
    if (hamburger && navLinks && !hamburger.__wired) {
      hamburger.__wired = true;
      const toggle = () => {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', String(!expanded));
        navLinks.classList.toggle("show");
        document.body.classList.toggle('nav-open', !expanded);
      };
      hamburger.addEventListener("click", toggle);
      navLinks.querySelectorAll('a').forEach(a=>{
        a.addEventListener('click', ()=>{ if (window.innerWidth < 1024) toggle(); });
      });
      document.addEventListener('keydown', e=>{ if (e.key==='Escape') { navLinks.classList.remove('show'); hamburger.setAttribute('aria-expanded','false'); document.body.classList.remove('nav-open'); }});
      document.addEventListener('click', e=>{ if (window.innerWidth<1024 && !document.querySelector('.navbar').contains(e.target)) { navLinks.classList.remove('show'); hamburger.setAttribute('aria-expanded','false'); document.body.classList.remove('nav-open'); }});
    }
  })();
})();
