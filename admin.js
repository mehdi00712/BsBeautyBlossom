// admin.js — Cloudinary unsigned upload + Firestore CRUD
(function(){
  if (!window.auth || !window.db) throw new Error("❌ Firebase not initialized: ensure firebase-auth-compat.js + firebase-config.js loaded first.");

  const $ = (s)=>document.querySelector(s);

  // Auth elements
  const email=$('#email'), password=$('#password');
  const loginBtn=$('#loginBtn'), signupBtn=$('#signupBtn'), logoutBtn=$('#logoutBtn'), authStatus=$('#auth-status');

  // Site settings
  const siteSection=$('#site-section');
  const siteHeroTitle=$('#site-heroTitle'), siteHeroSubtitle=$('#site-heroSubtitle');
  const siteFeatured=$('#site-featuredCategory'), siteShow=$('#site-showFeatured');
  const siteBanner=$('#site-banner'), siteBannerPrev=$('#site-banner-preview');
  const siteGallery=$('#site-gallery'), siteGalleryPrev=$('#site-gallery-preview');
  const siteSave=$('#site-save'), siteReload=$('#site-reload'), siteStatus=$('#site-status');

  // Product form
  const productSection=$('#product-section'), listSection=$('#list-section');
  const nameEl=$('#name'), priceEl=$('#price'), brandEl=$('#brand'), categoryEl=$('#category');
  const sizesEl=$('#sizes'), descEl=$('#description'), imagesEl=$('#images'), activeEl=$('#active');
  const saveBtn=$('#saveBtn'), resetBtn=$('#resetBtn'), docIdEl=$('#docId');

  // Product list
  const tableBody=$('#tableBody'), filterCategory=$('#filterCategory'), refreshBtn=$('#refreshBtn');

  // Admin control (whitelist if needed)
  const ALLOWED_ADMIN_UIDS = new Set(["w5jtigflSVezQwUvnsgM7AY4ZK73"]); // your UID here
  const requireWhitelist = true; // set to false to allow any signed-in user

  function parseSizes(text){
    return text.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
      const [label,price]=l.split('|').map(x=>String(x||'').trim());
      return {label, price: Number(price||0)};
    });
  }
  function renderSizes(s){ return (s||[]).map(x=>`${x.label} (${x.price})`).join(', '); }

  // Auth handlers
  loginBtn.onclick = ()=> auth.signInWithEmailAndPassword(email.value, password.value).catch(e=>alert(e.message));
  signupBtn.onclick= ()=> auth.createUserWithEmailAndPassword(email.value, password.value).then((cred)=>alert('Signed up. Your UID: '+cred.user.uid)).catch(e=>alert(e.message));
  logoutBtn.onclick = ()=> auth.signOut();

  auth.onAuthStateChanged(async (u)=>{
    const ok = !!u && (!requireWhitelist || ALLOWED_ADMIN_UIDS.has(u.uid));
    authStatus.textContent = u ? (ok ? `Signed in as ${u.email}` : 'Unauthorized user') : 'Not signed in';
    logoutBtn.style.display = u ? 'inline-block' : 'none';
    siteSection.style.display = ok ? 'block' : 'none';
    productSection.style.display = ok ? 'block' : 'none';
    listSection.style.display = ok ? 'block' : 'none';
    if (ok){ loadSite(); loadList(); }
  });

  // -------- Cloudinary Upload (unsigned) --------
  async function uploadToCloudinary(file){
    const cloud = window.CLOUDINARY_CLOUD_NAME;
    const preset= window.CLOUDINARY_UPLOAD_PRESET;
    const url = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    const res = await fetch(url, {method:'POST', body:fd});
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'Cloudinary error');
    return json.secure_url;
  }

  // -------- Site Settings --------
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
    }catch(e){ console.error(e); }
  }
  siteReload.onclick = loadSite;

  siteSave.onclick = async ()=>{
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
  };

  // -------- Product Save --------
  saveBtn.onclick = async ()=>{
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

      // Upload images (multiple)
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
      console.error(e); alert(e.message||e);
    }
  };

  function resetForm(){
    docIdEl.value = '';
    nameEl.value = priceEl.value = brandEl.value = sizesEl.value = descEl.value = '';
    categoryEl.value='perfume'; imagesEl.value=''; activeEl.checked=true;
  }
  resetBtn.onclick = resetForm;

  // -------- Product List --------
  async function loadList(){
    try{
      tableBody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
      const snap = await db.collection('products').where('category','==',filterCategory.value).get();
      if (snap.empty){ tableBody.innerHTML='<tr><td colspan="6">No products</td></tr>'; return; }
      tableBody.innerHTML = '';
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

      // Edit/Delete bind
      tableBody.querySelectorAll('[data-edit]').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          const id = btn.getAttribute('data-edit');
          const d=await db.collection('products').doc(id).get();
          if (!d.exists) return;
          const p=d.data();
          docIdEl.value=id;
          nameEl.value=p.name||''; priceEl.value=Number(p.basePrice||0)||0; brandEl.value=p.brand||'';
          sizesEl.value=Array.isArray(p.sizes)?p.sizes.map(s=>`${s.label} | ${s.price}`).join('\n'):'';
          descEl.value=p.description||''; categoryEl.value=p.category||'perfume'; activeEl.checked=!!p.active;
          window.scrollTo({top:0,behavior:'smooth'});
        });
      });
      tableBody.querySelectorAll('[data-del]').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          const id = btn.getAttribute('data-del');
          if (!confirm('Delete this product?')) return;
          await db.collection('products').doc(id).delete();
          loadList();
        });
      });
    }catch(e){
      console.error(e); tableBody.innerHTML='<tr><td colspan="6">Error loading list</td></tr>';
    }
  }
  refreshBtn.onclick = loadList;
  filterCategory.onchange = loadList;
})();
