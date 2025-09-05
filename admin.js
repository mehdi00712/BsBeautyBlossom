// admin.js — Firebase Auth + Firestore products + Cloudinary uploads (NO site settings)
(function () {
  if (!window.db) {
    throw new Error("❌ Firestore not initialized: ensure firebase-firestore-compat.js loads before firebase-config.js.");
  }
  if (!window.auth) {
    alert("Firebase Auth isn’t loaded. On admin.html, add:\n" +
          '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>\n' +
          "ABOVE firebase-config.js.");
    return;
  }

  const $ = (s) => document.querySelector(s);

  // Allow only your admin UID
  const ALLOWED_ADMIN_UIDS = new Set([
    "w5jtigflSVezQwUvnsgM7AY4ZK73"
  ]);

  // Cloudinary (set in admin.html)
  const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET;

  async function uploadToCloudinary(file) {
    if (!file) return '';
    if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error('Missing Cloudinary config');
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Cloudinary upload failed: ' + txt);
    }
    const data = await res.json();
    return data.secure_url;
  }

  // -------------------------
  // AUTH
  // -------------------------
  const authStatus = $('#auth-status');
  const loginBtn = $('#loginBtn');
  const signupBtn = $('#signupBtn');
  const logoutBtn = $('#logoutBtn');
  const email = $('#email');
  const password = $('#password');

  loginBtn.onclick = async () => {
    try { await auth.signInWithEmailAndPassword(email.value, password.value); }
    catch (e) { alert(e.message); }
  };
  signupBtn.onclick = async () => {
    try {
      const cred = await auth.createUserWithEmailAndPassword(email.value, password.value);
      console.log('New UID:', cred.user?.uid);
      alert('Account created. Check console for UID and add to Firestore rules + ALLOWED_ADMIN_UIDS.');
    } catch (e) { alert(e.message); }
  };
  logoutBtn.onclick = () => auth.signOut();

  const productSection = $('#product-section');
  const listSection = $('#list-section');

  auth.onAuthStateChanged((user) => {
    const ok = !!user && (ALLOWED_ADMIN_UIDS.size === 0 || ALLOWED_ADMIN_UIDS.has(user.uid));
    authStatus.textContent = user ? (ok ? `Signed in as ${user.email}` : 'Signed in but not authorized.') : 'Not signed in';
    logoutBtn.style.display = user ? 'inline-block' : 'none';
    productSection.style.display = ok ? 'block' : 'none';
    listSection.style.display = ok ? 'block' : 'none';
    if (ok) loadTable();
  });

  // -------------------------
  // PRODUCT CRUD
  // -------------------------
  const nameEl = $('#name');
  const brandEl = $('#brand');
  const priceEl = $('#price');
  const sizesEl = $('#sizes');
  const descEl = $('#description');
  const categoryEl = $('#category');
  const imgEl = $('#images'); // multiple
  const activeEl = $('#active');
  const saveBtn = $('#saveBtn');
  const resetBtn = $('#resetBtn');
  const tableBody = $('#tableBody');
  const filterCategory = $('#filterCategory');
  const refreshBtn = $('#refreshBtn');
  const docIdEl = $('#docId');

  const parseSizes = (text = '') =>
    text.split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => {
          const m = l.match(/^(.*?)[\s|:\-–—]*\s*(?:Rs)?\s*([\d.,]+)\s*$/i);
          if (!m) return null;
          const label = m[1].trim().replace(/[|:\-–—]$/, '').trim();
          const priceNum = Number((m[2] || '0').replace(/[^\d.]/g, ''));
          if (!label || !isFinite(priceNum) || priceNum <= 0) return null;
          return { label, price: priceNum };
        })
        .filter(Boolean);

  const renderSizes = (sizes = []) => sizes.map(s => `${s.label} (Rs${s.price})`).join(', ');

  const resetForm = () => {
    docIdEl.value = '';
    nameEl.value = '';
    brandEl.value = '';
    priceEl.value = '';
    sizesEl.value = '';
    descEl.value = '';
    categoryEl.value = 'perfume';
    if (imgEl) imgEl.value = '';
    activeEl.checked = true;
  };

  saveBtn.onclick = async () => {
    const sizes = parseSizes(sizesEl.value);
    let data = {
      name: nameEl.value.trim(),
      brand: brandEl.value.trim(),
      basePrice: Number(priceEl.value || 0),
      sizes,
      description: descEl.value.trim(),
      category: categoryEl.value,
      active: !!activeEl.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (!data.name) return alert('Name required');

    if (!(data.basePrice > 0) && Array.isArray(data.sizes) && data.sizes.length) {
      const first = data.sizes.find(s => Number(s.price) > 0);
      if (first) data.basePrice = Number(first.price);
    }

    const hasValidBase = Number(data.basePrice) > 0;
    const hasValidSize = Array.isArray(data.sizes) && data.sizes.some(s => Number(s.price) > 0);
    if (!hasValidBase && !hasValidSize) {
      return alert('Set a Base price OR at least one Size with a valid price.');
    }

    try {
      const docId = docIdEl.value || db.collection('products').doc().id;

      if (imgEl && imgEl.files && imgEl.files.length > 0) {
        const urls = [];
        for (const f of imgEl.files) {
          const u = await uploadToCloudinary(f);
          urls.push(u);
        }
        data.imageURL = urls[0];
        data.images = urls;
      }

      if (docIdEl.value) {
        const toUpdate = { ...data };
        delete toUpdate.createdAt;
        if (toUpdate.imageURL === undefined) delete toUpdate.imageURL;
        if (toUpdate.images === undefined) delete toUpdate.images;
        await db.collection('products').doc(docId).set(toUpdate, { merge: true });
      } else {
        await db.collection('products').doc(docId).set(data, { merge: true });
        docIdEl.value = docId;
      }
      alert('Saved ✓');
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  resetBtn.onclick = resetForm;

  function loadTable() {
    const cat = filterCategory.value;
    tableBody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';

    try {
      db.collection('products')
        .where('category', '==', cat)
        .onSnapshot((snap) => {
          tableBody.innerHTML = '';
          if (snap.empty) {
            tableBody.innerHTML = '<tr><td colspan="6">No products yet</td></tr>';
            return;
          }
          snap.forEach(doc => {
            const p = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${p.imageURL ? `<img src="${p.imageURL}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid #23232a">` : ''}</td>
              <td>${p.name || ''}${p.brand ? `<div class="muted">${p.brand}</div>` : ''}</td>
              <td>${renderSizes(p.sizes || [])}</td>
              <td>Rs${(Number(p.basePrice || 0)).toFixed(2)}</td>
              <td>${p.active ? 'Yes' : 'No'}</td>
              <td>
                <button data-id="${doc.id}" class="btn muted edit">Edit</button>
                <button data-id="${doc.id}" class="btn danger delete">Delete</button>
              </td>`;
            tableBody.appendChild(tr);
          });

          tableBody.querySelectorAll('button.edit').forEach(btn => btn.onclick = async (e) => {
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });

          tableBody.querySelectorAll('button.delete').forEach(btn => btn.onclick = async (e) => {
            const id = e.currentTarget.dataset.id;
            if (!confirm('Delete this product?')) return;
            await db.collection('products').doc(id).delete();
          });
        }, (err) => {
          console.error('Admin list error:', err);
          tableBody.innerHTML = `<tr><td colspan="6" style="color:#ff9c9c">Error: ${err.message}</td></tr>`;
        });
    } catch (e) {
      console.error('loadTable failed:', e);
      tableBody.innerHTML = `<tr><td colspan="6" style="color:#ff9c9c">Error: ${e.message}</td></tr>`;
    }
  }

  refreshBtn.onclick = loadTable;
  filterCategory.onchange = loadTable;
})();
