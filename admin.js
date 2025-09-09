// admin.js — locked admin (no signup). Only allow-listed UIDs can manage.
(function(){
  if (!window.firebase || !window.db || !firebase.auth) {
    console.error("❌ Firebase not initialized. Check firebase-config.js order.");
    return;
  }

  // ✅ ONLY these UIDs can access admin features
  const ALLOWED_ADMIN_UIDS = new Set([
    "w5jtigflSVezQwUvnsgM7AY4ZK73",  // existing admin
    "nyQYzolZI2fLFqIkAPNHHbcSJ2p1"   // newly added admin
  ]);

  // Shortcuts
  const $ = (s) => document.querySelector(s);

  // Auth UI
  const email = $('#email'), password = $('#password');
  const loginBtn = $('#loginBtn'), logoutBtn = $('#logoutBtn');
  const authStatus = $('#auth-status'), authHelp = $('#auth-help');

  // Sections
  const siteSection = $('#site-section');
  const productSection = $('#product-section');
  const listSection = $('#list-section');

  // Product form
  const nameEl = $('#name'), priceEl = $('#price'), brandEl = $('#brand');
  const sizesEl = $('#sizes'), descEl = $('#description');
  const categoryEl = $('#category'), activeEl = $('#active'), imgsEl = $('#images');
  const saveBtn = $('#saveBtn'), resetBtn = $('#resetBtn'), docIdEl = $('#docId');

  // Products list
  const filterCategory = $('#filterCategory'), refreshBtn = $('#refreshBtn'), tableBody = $('#tableBody');

  // Helpers
  const parseSizes = (t) => (t||"").split('\n')
    .map(l=>l.trim()).filter(Boolean)
    .map(l=>{
      const [label, p] = l.split('|').map(x=>String(x||'').trim());
      return {label, price: Number(p||0)};
    });

  const renderSizes = (sizes=[]) =>
    sizes.map(s => `${s.label} (Rs${Number(s.price||0)})`).join(', ');

  const resetForm = () => {
    docIdEl.value = '';
    nameEl.value = '';
    priceEl.value = '';
    brandEl.value = '';
    sizesEl.value = '';
    descEl.value = '';
    categoryEl.value = 'perfume';
    activeEl.checked = true;
    imgsEl.value = '';
  };

  // 🔐 Auth controls (NO SIGNUP)
  loginBtn.onclick = () => {
    const em = email.value.trim(), pw = password.value;
    if(!em || !pw) return alert("Enter email & password");
    firebase.auth().signInWithEmailAndPassword(em, pw)
      .catch(e => alert(e.message));
  };
  logoutBtn.onclick = () => firebase.auth().signOut();

  firebase.auth().onAuthStateChanged(async (u) => {
    if (!u) {
      authStatus.textContent = "Not signed in";
      authHelp.textContent = "Only pre-approved admins can log in.";
      logoutBtn.style.display = "none";
      hideAdmin();
      return;
    }
    const allowed = ALLOWED_ADMIN_UIDS.has(u.uid);
    authStatus.textContent = allowed ? `Signed in as ${u.email}` : "Unauthorized";
    authHelp.innerHTML = allowed ? "" : "You are not allowed to access admin controls.";
    logoutBtn.style.display = "inline-block";
    if (allowed) showAdmin(); else hideAdmin();
  });

  function showAdmin(){
    siteSection.style.display = 'block';
    productSection.style.display = 'block';
    listSection.style.display = 'block';
    loadProducts();
  }
  function hideAdmin(){
    siteSection.style.display = 'none';
    productSection.style.display = 'none';
    listSection.style.display = 'none';
  }

  // Cloudinary upload (unsigned)
  async function uploadToCloudinary(file){
    const cloud = window.CLOUDINARY_CLOUD_NAME;
    const preset = window.CLOUDINARY_UPLOAD_PRESET;
    const url = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    const res = await fetch(url, { method: 'POST', body: fd });
    if(!res.ok) throw new Error('Cloudinary upload failed');
    const data = await res.json();
    return data.secure_url;
  }

  // Save product
  saveBtn.onclick = async () => {
    const user = firebase.auth().currentUser;
    if (!user || !ALLOWED_ADMIN_UIDS.has(user.uid)) return alert("Unauthorized.");

    const sizes = parseSizes(sizesEl.value);
    const base = Number(priceEl.value||0);
    const docId = docIdEl.value || db.collection('products').doc().id;

    const data = {
      name: nameEl.value.trim(),
      basePrice: base,
      brand: brandEl.value.trim(),
      sizes,
      description: descEl.value.trim(),
      category: categoryEl.value,
      active: !!activeEl.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      // upload images if any (append to images array)
      let images = [];
      if (imgsEl.files && imgsEl.files.length) {
        for (const f of imgsEl.files) {
          const url = await uploadToCloudinary(f);
          images.push(url);
        }
        data.images = images;
        // keep legacy imageURL as cover
        data.imageURL = images[0];
      }

      if (docIdEl.value) {
        delete data.createdAt;
        await db.collection('products').doc(docId).set(data, { merge: true });
      } else {
        await db.collection('products').doc(docId).set(data);
      }

      alert("Saved");
      resetForm();
      await loadProducts();
    } catch (e) {
      console.error(e);
      alert("Save failed: " + e.message);
    }
  };

  resetBtn.onclick = resetForm;

  // List products
  async function loadProducts(){
    tableBody.innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;
    try {
      const snap = await db.collection('products')
        .where('category','==', filterCategory.value)
        .orderBy('name')
        .get();

      if (snap.empty) {
        tableBody.innerHTML = `<tr><td colspan="6">No products</td></tr>`;
        return;
      }

      const rows = [];
      snap.forEach(doc=>{
        const p = doc.data();
        rows.push(`
          <tr>
            <td>${(p.imageURL|| (p.images && p.images[0])) ? `<img src="${p.imageURL || p.images[0]}" width="60">` : ''}</td>
            <td>${p.name||''}${p.brand?`<div class="muted">${p.brand}</div>`:''}</td>
            <td>${renderSizes(p.sizes||[])}</td>
            <td>Rs${Number(p.basePrice||0).toFixed(2)}</td>
            <td>${p.active?'Yes':'No'}</td>
            <td>
              <button class="btn" data-edit="${doc.id}">Edit</button>
              <button class="btn danger" data-del="${doc.id}">Delete</button>
            </td>
          </tr>
        `);
      });
      tableBody.innerHTML = rows.join('');

      tableBody.querySelectorAll('[data-edit]').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          const id = btn.getAttribute('data-edit');
          const d = await db.collection('products').doc(id).get();
          if (!d.exists) return;
          const p = d.data();
          docIdEl.value = d.id;
          nameEl.value = p.name||'';
          priceEl.value = Number(p.basePrice||0);
          brandEl.value = p.brand||'';
          sizesEl.value = (p.sizes||[]).map(s=>`${s.label} | ${s.price}`).join('\n');
          descEl.value = p.description||'';
          categoryEl.value = p.category||'perfume';
          activeEl.checked = !!p.active;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });

      tableBody.querySelectorAll('[data-del]').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          if (!confirm('Delete this product?')) return;
          const id = btn.getAttribute('data-del');
          await db.collection('products').doc(id).delete();
          loadProducts();
        });
      });
    } catch (e) {
      console.error(e);
      tableBody.innerHTML = `<tr><td colspan="6">Load failed</td></tr>`;
    }
  }

  refreshBtn.onclick = loadProducts;
  filterCategory.onchange = loadProducts;

})();
