// admin.js — robust login + Cloudinary + Firestore
(function(){
  const $ = (s)=>document.querySelector(s);

  // Guard: Firebase must be ready
  if (!window.firebase || !window.auth || !window.db) {
    alert("Firebase not initialized. Ensure firebase-auth-compat.js and firebase-config.js are loaded BEFORE admin.js.");
    throw new Error("Firebase not initialized");
  }

  // ---------- AUTH ----------
  const email=$('#email'), password=$('#password');
  const loginBtn=$('#loginBtn'), signupBtn=$('#signupBtn'), logoutBtn=$('#logoutBtn');
  const authStatus=$('#auth-status'), authHelp=$('#auth-help');

  // Allow ANY signed-in user by default. Flip to true + add UIDs to restrict.
  const requireWhitelist = false;
// admin.js
const ALLOWED_ADMIN_UIDS = new Set([
  "w5jtigflSVezQwUvnsgM7AY4ZK73",     // your current UID
  "nyQYzolZI2fLFqIkAPNHHbcSJ2p1"      // NEW admin UID
]);


  function showHelp(message, hint){
    authHelp.textContent = message + (hint? " — " + hint : "");
  }

  async function ensurePersistence(){
    try { await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL); }
    catch(e){ console.warn("Persistence warn:", e?.message||e); }
  }

  loginBtn?.addEventListener('click', async ()=>{
    try{
      await ensurePersistence();
      await auth.signInWithEmailAndPassword(String(email.value).trim(), String(password.value));
    }catch(e){
      const msg = e?.message || String(e);
      authStatus.textContent = "Login failed: " + msg;
      // common causes helper
      showHelp("Check: Auth Email/Password enabled & domain is authorized",
        "Firebase Console → Authentication → Sign-in method; and Authorized Domains");
    }
  });

  signupBtn?.addEventListener('click', async ()=>{
    try{
      await ensurePersistence();
      const cred = await auth.createUserWithEmailAndPassword(String(email.value).trim(), String(password.value));
      alert("Signed up! Your UID:\n" + cred.user.uid + "\nAdd it in admin.js if you enable whitelist.");
    }catch(e){
      authStatus.textContent = "Sign up failed: " + (e?.message||e);
    }
  });

  logoutBtn?.addEventListener('click', ()=> auth.signOut());

  auth.onAuthStateChanged((u)=>{
    const ok = !!u && (!requireWhitelist || ALLOWED_ADMIN_UIDS.has(u.uid));
    authStatus.textContent = u ? (ok ? `Signed in as ${u.email}` : "Unauthorized user") : "Not signed in";
    logoutBtn.style.display = u ? 'inline-block' : 'none';

    // Toggle admin sections
    const sectionsOK = ok ? 'block' : 'none';
    $('#site-section').style.display = sectionsOK;
    $('#product-section').style.display = sectionsOK;
    $('#list-section').style.display = sectionsOK;

    if (u && !ok) {
      showHelp("This account is not allowed to manage products",
        "Set requireWhitelist=true and add your UID to ALLOWED_ADMIN_UIDS, or keep requireWhitelist=false");
    } else if (!u) {
      showHelp("Enable Email/Password in Firebase & add your domain to Authorized domains");
    } else {
      showHelp(""); // clear help
      // After successful login, load data
      loadSite();
      loadList();
    }
  });

  // ---------- CLOUDINARY ----------
  async function uploadToCloudinary(file){
    const cloud = window.CLOUDINARY_CLOUD_NAME;
    const preset= window.CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) throw new Error("Cloudinary not configured");
    const url = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    const res = await fetch(url, {method:'POST', body:fd});
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'Cloudinary error');
    return json.secure_url;
  }

  // ---------- SITE SETTINGS ----------
  const siteHeroTitle=$('#site-heroTitle'), siteHeroSubtitle=$('#site-heroSubtitle');
  const siteFeatured=$('#site-featuredCategory'), siteShow=$('#site-showFeatured');
  const siteBanner=$('#site-banner'), siteBannerPrev=$('#site-banner-preview');
  const siteGallery=$('#site-gallery'), siteGalleryPrev=$('#site-gallery-preview');
  const siteSave=$('#site-save'), siteReload=$('#site-reload'), siteStatus=$('#site-status');

  async function loadSite(){
    try{
      const doc=await db.collection('site').doc('home').get();
      const s=doc.exists?doc.data():{};
      siteHeroTitle.value = s.heroTitle||'';
      siteHeroSubtitle.value = s.heroSubtitle||'';
      siteFeatured.value = s.featuredCategory||'perfume';
      siteShow.checked = !!s.showFeatured;
      siteBannerPrev.innerHTML = s.bannerImage?`<img src="${s.bannerImage}" style="width:120px;height:120px;object-fit:cover;border-radius:8px">`:'';
      siteGalleryPrev.innerHTML = Array.isArray(s.gallery)? s.gallery.map(u=>`<img src="${u}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`).join('') : '';
    }catch(e){
      console.error("Load site error:", e);
    }
  }
  siteReload?.addEventListener('click', loadSite);

  siteSave?.addEventListener('click', async ()=>{
    try{
      siteStatus.textContent='Uploading…';
      let bannerURL;
      if (siteBanner.files[0]) bannerURL = await uploadToCloudinary(siteBanner.files[0]);
      let gallery=[];
      if (siteGallery.files.length){
        for (const f of siteGallery.files){ gallery.push(await uploadToCloudinary(f)); }
      }
      const update = {
        heroTitle: siteHeroTitle.value.trim(),
        heroSubtitle: siteHeroSubtitle.value.trim(),
        featuredCategory: siteFeatured.value,
        showFeatured: siteShow.checked
      };
      if (bannerURL) update.bannerImage = bannerURL;
      if (gallery.length) update.gallery = gallery;

      await db.collection('site').doc('home').set(update, {merge:true});
      siteStatus.textContent='Saved!';
      await loadSite();
    }catch(e){
      console.error(e); siteStatus.textContent='Error saving site';
      alert(e.message||e);
    }
  });

  // ---------- PRODUCTS ----------
  const nameEl=$('#name'), priceEl=$('#price'), brandEl=$('#brand'), categoryEl=$('#category');
  const sizesEl=$('#sizes'), descEl=$('#description'), imagesEl=$('#images'), activeEl=$('#active');
  const saveBtn=$('#saveBtn'), resetBtn=$('#resetBtn'), docIdEl=$('#docId');

  const tableBody=$('#tableBody'), filterCategory=$('#filterCategory'), refreshBtn=$('#refreshBtn');

  function parseSizes(text){
    return text.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
      const [label,price]=l.split('|').map(x=>String(x||'').trim());
      return {label, price: Number(price||0)};
    });
  }

  function resetForm(){
    docIdEl.value='';
    nameEl.value=''; priceEl.value=''; brandEl.value='';
    sizesEl.value=''; descEl.value=''; imagesEl.value='';
    categoryEl.value='perfume'; activeEl.checked=true;
  }
  resetBtn?.addEventListener('click', resetForm);

  saveBtn?.addEventListener('click', async ()=>{
    try{
      const sizes = parseSizes(sizesEl.value);
      const data = {
        name: nameEl.value.trim(),
        basePrice: Number(priceEl.value||0),
        brand: brandEl.value.trim(),
        description: (descEl.value||'').trim(),
        category: categoryEl.value,
        sizes,
        active: !!activeEl.checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      let id = docIdEl.value || db.collection('products').doc().id;

      // Upload images
      let images=[];
      for (const f of imagesEl.files){ images.push(await uploadToCloudinary(f)); }
      if (images.length){
        data.images = (data.images||[]).concat(images);
        if (!data.imageURL) data.imageURL = images[0];
      }

      if (docIdEl.value){
        await db.collection('products').doc(id).set(data, {merge:true});
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('products').doc(id).set(data);
      }

      alert('Saved!');
      resetForm();
      loadList();
    }catch(e){
      console.error(e);
      alert(e?.message || e);
    }
  });

  async function loadList(){
    try{
      tableBody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
      const snap = await db.collection('products').where('category','==',filterCategory.value).get();
      if (snap.empty){ tableBody.innerHTML='<tr><td colspan="6">No products</td></tr>'; return; }
      tableBody.innerHTML='';
      snap.forEach(doc=>{
        const p=doc.data();
        const tr=document.createElement('tr');
        const sizeTxt = (p.sizes||[]).map(s=>`${s.label} (${s.price})`).join(', ');
        tr.innerHTML = `
          <td>${p.imageURL?`<img src="${p.imageURL}" width="56" height="56" style="object-fit:cover;border-radius:6px;border:1px solid #e5e5e5">`:''}</td>
          <td>${p.name||''}</td>
          <td>${sizeTxt||''}</td>
          <td>Rs${Number(p.basePrice||0).toFixed(0)}</td>
          <td>${p.active?'Yes':'No'}</td>
          <td>
            <button class="btn" data-edit="${doc.id}">Edit</button>
            <button class="btn danger" data-del="${doc.id}">Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

      // Bind actions
      tableBody.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click', async ()=>{
        const id=b.getAttribute('data-edit');
        const d=await db.collection('products').doc(id).get();
        if (!d.exists) return;
        const p=d.data();
        docIdEl.value=id;
        nameEl.value=p.name||''; priceEl.value=Number(p.basePrice||0)||0; brandEl.value=p.brand||'';
        sizesEl.value=Array.isArray(p.sizes)?p.sizes.map(s=>`${s.label} | ${s.price}`).join('\n'):'';
        descEl.value=p.description||''; categoryEl.value=p.category||'perfume'; activeEl.checked=!!p.active;
        window.scrollTo({top:0,behavior:'smooth'});
      }));
      tableBody.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', async ()=>{
        const id=b.getAttribute('data-del');
        if (!confirm('Delete this product?')) return;
        await db.collection('products').doc(id).delete();
        loadList();
      }));
    }catch(e){
      console.error(e);
      tableBody.innerHTML='<tr><td colspan="6">Error loading products</td></tr>';
    }
  }
  refreshBtn?.addEventListener('click', loadList);
  filterCategory?.addEventListener('change', loadList);
})();
