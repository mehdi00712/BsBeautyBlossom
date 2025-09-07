// admin.js — Admin dashboard with Site Settings + Products (Cloudinary + Firestore)
(function(){
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else { init(); }

  function $(id){ return document.getElementById(id); }

  async function uploadToCloudinary(file){
    const cloud = window.CLOUDINARY_CLOUD_NAME;
    const preset = window.CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) throw new Error('Cloudinary config missing');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {method:'POST', body:fd});
    const json = await res.json();
    if (!json.secure_url) throw new Error(json?.error?.message || 'Upload failed');
    return json.secure_url;
  }

  function parseSizes(t){
    return (t||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
      const [label,p]=l.split('|').map(x=>(x||'').trim());
      return {label, price: Number(p)||0};
    });
  }
  function renderSizes(s){
    return (Array.isArray(s)?s:[]).map(x=>`${x.label} (Rs${Number(x.price||0)})`).join(', ');
  }

  function init(){
    if (!window.firebase || !window.db || !firebase.apps?.length){
      console.error('❌ Firebase not initialized: check that admin.html loads firebase-*-compat and firebase-config.js in the right order.');
      return;
    }

    // ====== AUTH ELEMENTS ======
    const emailEl=$('email'), passEl=$('password');
    const loginBtn=$('loginBtn'), signupBtn=$('signupBtn'), logoutBtn=$('logoutBtn');
    const authStatus=$('auth-status');

    // ====== SITE ELEMENTS ======
    const siteSection = $('site-section');
    const siteHeroTitle = $('site-heroTitle');
    const siteHeroSubtitle = $('site-heroSubtitle');
    const siteBannerFile = $('site-bannerFile');
    const siteBannerUploadBtn = $('site-bannerUploadBtn');
    const siteBannerPreview = $('site-bannerPreview');
    const siteShowFeatured = $('site-showFeatured');
    const siteFeaturedCategory = $('site-featuredCategory');
    const siteGalleryFiles = $('site-galleryFiles');
    const siteGalleryUploadBtn = $('site-galleryUploadBtn');
    const siteGallery = $('site-gallery');
    const siteSaveBtn = $('site-saveBtn');
    const siteResetBtn = $('site-resetBtn');
    const siteMsg = $('site-msg');

    // ====== PRODUCT ELEMENTS ======
    const productSection=$('product-section');
    const nameEl=$('name'), priceEl=$('price'), brandEl=$('brand');
    const sizesEl=$('sizes'), descEl=$('description'), categoryEl=$('category');
    const imgEl=$('image'), activeEl=$('active'), saveBtn=$('saveBtn'), resetBtn=$('resetBtn'), docIdEl=$('docId');
    const filterCategory=$('filterCategory'), refreshBtn=$('refreshBtn'), tableBody=$('tableBody');

    // ================= AUTH =================
    loginBtn?.addEventListener('click', async ()=>{
      try{ await auth.signInWithEmailAndPassword(emailEl?.value||'', passEl?.value||''); }
      catch(e){ alert(e.message); }
    });
    signupBtn?.addEventListener('click', async ()=>{
      try{
        const cred=await auth.createUserWithEmailAndPassword(emailEl?.value||'', passEl?.value||'');
        alert('Signup OK. Your UID: '+cred.user?.uid+'\nAdd this UID to security rules.');
        console.log('UID:', cred.user?.uid);
      }catch(e){ alert(e.message); }
    });
    logoutBtn?.addEventListener('click', async ()=>{ try{ await auth.signOut(); }catch(e){ console.warn(e); } });

    auth.onAuthStateChanged(async (u)=>{
      const ok=!!u;
      if(authStatus) authStatus.textContent = ok ? `Signed in as ${u.email||u.uid}` : 'Not signed in';
      if(logoutBtn) logoutBtn.style.display = ok ? 'inline-block' : 'none';
      if(productSection) productSection.style.display = ok ? 'block' : 'none';
      if(siteSection) siteSection.style.display = ok ? 'block' : 'none';
      if (ok){ loadProducts(); loadSite(); }
    });

    // ================= SITE SETTINGS =================
    let siteState = {
      heroTitle: '',
      heroSubtitle: '',
      bannerImage: '',
      showFeatured: true,
      featuredCategory: 'perfume',
      gallery: []
    };

    async function loadSite(){
      try{
        const snap = await db.collection('site').doc('home').get();
        if (snap.exists){
          siteState = Object.assign(siteState, snap.data());
        }
        applySiteToForm();
      }catch(e){
        console.warn('Site load failed:', e.message);
      }
    }

    function applySiteToForm(){
      if (siteHeroTitle) siteHeroTitle.value = siteState.heroTitle || '';
      if (siteHeroSubtitle) siteHeroSubtitle.value = siteState.heroSubtitle || '';
      if (siteBannerPreview) siteBannerPreview.src = siteState.bannerImage || 'https://via.placeholder.com/800x400?text=Banner';
      if (siteShowFeatured) siteShowFeatured.checked = !!siteState.showFeatured;
      if (siteFeaturedCategory) siteFeaturedCategory.value = siteState.featuredCategory || 'perfume';

      if (siteGallery){
        siteGallery.innerHTML = '';
        (siteState.gallery||[]).forEach((url, idx)=>{
          const wrap = document.createElement('div');
          wrap.className = 'gallery-item';
          wrap.style.position='relative';
          const img = document.createElement('img');
          img.src = url; img.alt='gallery'; img.style.width='100%'; img.style.borderRadius='8px';
          const del = document.createElement('button');
          del.textContent='✕';
          del.title='Remove';
          del.style.position='absolute'; del.style.top='6px'; del.style.right='6px';
          del.style.border='none'; del.style.borderRadius='50%'; del.style.width='28px'; del.style.height='28px';
          del.style.background='#23232a'; del.style.color='#fff'; del.style.cursor='pointer';
          del.onclick = ()=>{ siteState.gallery.splice(idx,1); applySiteToForm(); };
          wrap.appendChild(img); wrap.appendChild(del);
          siteGallery.appendChild(wrap);
        });
      }
    }

    siteBannerUploadBtn?.addEventListener('click', async ()=>{
      try{
        if (!siteBannerFile?.files?.[0]) return alert('Choose a banner image first.');
        siteMsg && (siteMsg.textContent='Uploading banner…');
        const url = await uploadToCloudinary(siteBannerFile.files[0]);
        siteState.bannerImage = url;
        applySiteToForm();
        siteMsg && (siteMsg.textContent='Banner uploaded. Click "Save Site" to publish.');
      }catch(e){
        alert('Banner upload failed: '+e.message);
      }
    });

    siteGalleryUploadBtn?.addEventListener('click', async ()=>{
      try{
        const files = Array.from(siteGalleryFiles?.files||[]);
        if (!files.length) return alert('Select one or more images first.');
        siteMsg && (siteMsg.textContent='Uploading gallery images…');
        for (const f of files){
          const url = await uploadToCloudinary(f);
          siteState.gallery.push(url);
        }
        applySiteToForm();
        siteMsg && (siteMsg.textContent='Gallery updated. Click "Save Site" to publish.');
      }catch(e){
        alert('Gallery upload failed: '+e.message);
      }
    });

    siteSaveBtn?.addEventListener('click', async ()=>{
      try{
        siteState.heroTitle = siteHeroTitle?.value || '';
        siteState.heroSubtitle = siteHeroSubtitle?.value || '';
        siteState.showFeatured = !!siteShowFeatured?.checked;
        siteState.featuredCategory = (siteFeaturedCategory?.value||'perfume').toLowerCase();

        await db.collection('site').doc('home').set(siteState, {merge:true});
        siteMsg && (siteMsg.textContent='Saved! Visit the homepage and hard-refresh to see changes.');
        alert('Site saved.');
      }catch(e){
        alert('Save failed: '+e.message);
      }
    });

    siteResetBtn?.addEventListener('click', ()=>{
      loadSite();
      siteMsg && (siteMsg.textContent='Reset to last saved.');
    });

    // ================= PRODUCTS =================
    function resetForm(){
      if (docIdEl) docIdEl.value='';
      if (nameEl) nameEl.value='';
      if (priceEl) priceEl.value='';
      if (brandEl) brandEl.value='';
      if (sizesEl) sizesEl.value='';
      if (descEl) descEl.value='';
      if (categoryEl) categoryEl.value='perfume';
      if (imgEl) imgEl.value='';
      if (activeEl) activeEl.checked=true;
    }

    async function loadProducts(){
      if (!tableBody || !filterCategory) return;
      tableBody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;
      try{
        const snap = await db.collection('products')
          .where('category','==',(filterCategory.value||'').toLowerCase())
          .get();
        if (snap.empty){ tableBody.innerHTML = `<tr><td colspan="7">No products</td></tr>`; return; }

        const rows=[];
        snap.forEach(doc=>{
          const p=doc.data()||{};
          rows.push(`
            <tr>
              <td>${p.imageURL?`<img src="${p.imageURL}" width="60" height="60" style="object-fit:cover;border-radius:6px">`:''}</td>
              <td>${p.name||''}</td>
              <td>${p.brand||''}</td>
              <td>${renderSizes(p.sizes)}</td>
              <td>Rs${Number(p.basePrice||0).toFixed(2)}</td>
              <td>${p.active?'Yes':'No'}</td>
              <td>
                <button class="edit" data-id="${doc.id}">Edit</button>
                <button class="delete" data-id="${doc.id}">Delete</button>
              </td>
            </tr>
          `);
        });
        tableBody.innerHTML = rows.join('');

        tableBody.querySelectorAll('.edit').forEach(btn=>{
          btn.addEventListener('click', async ()=>{
            try{
              const id=btn.getAttribute('data-id');
              const d=await db.collection('products').doc(id).get();
              if (!d.exists) return;
              const p=d.data()||{};
              if (docIdEl) docIdEl.value=d.id;
              if (nameEl) nameEl.value=p.name||'';
              if (priceEl) priceEl.value=Number(p.basePrice||0);
              if (brandEl) brandEl.value=p.brand||'';
              if (sizesEl) sizesEl.value=(Array.isArray(p.sizes)?p.sizes:[]).map(s=>`${s.label} | ${s.price}`).join('\n');
              if (descEl) descEl.value=p.description||'';
              if (categoryEl) categoryEl.value=p.category||'perfume';
              if (activeEl) activeEl.checked=!!p.active;
              window.scrollTo({top:0,behavior:'smooth'});
            }catch(e){ alert('Edit failed: '+e.message); }
          });
        });

        tableBody.querySelectorAll('.delete').forEach(btn=>{
          btn.addEventListener('click', async ()=>{
            const id=btn.getAttribute('data-id');
            if (!confirm('Delete this product?')) return;
            try{ await db.collection('products').doc(id).delete(); loadProducts(); }
            catch(e){ alert('Delete failed: '+e.message); }
          });
        });
      }catch(e){
        tableBody.innerHTML = `<tr><td colspan="7" style="color:#ff9c9c">Error: ${e.message}</td></tr>`;
      }
    }

    saveBtn?.addEventListener('click', async ()=>{
      try{
        const sizes = parseSizes(sizesEl?.value||'');
        const data = {
          name: nameEl?.value||'',
          basePrice: Number(priceEl?.value||0),
          brand: brandEl?.value||'',
          sizes,
          description: descEl?.value||'',
          category: (categoryEl?.value||'perfume').toLowerCase(),
          active: !!(activeEl?.checked),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        let id = docIdEl?.value||'';
        if (!id){
          id = db.collection('products').doc().id;
          data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        if (imgEl?.files?.[0]){
          const url = await uploadToCloudinary(imgEl.files[0]);
          data.imageURL = url;
        }
        await db.collection('products').doc(id).set(data, {merge:true});
        alert('Saved');
        resetForm();
        loadProducts();
      }catch(e){ alert('Save failed: '+e.message); }
    });
    resetBtn?.addEventListener('click', resetForm);
    filterCategory?.addEventListener('change', loadProducts);
    refreshBtn?.addEventListener('click', loadProducts);
  }
})();
