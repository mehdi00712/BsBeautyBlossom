// admin.js — Auth + CRUD + Cloudinary + per-size/global stock
(function () {
  'use strict';

  if (!window.firebase || !window.db) {
    throw new Error("❌ Firebase not initialized: ensure admin.html loads compat SDKs then firebase-config.js.");
  }

  // ====== Helpers ======
  const $ = (s) => document.querySelector(s);
  const auth = firebase.auth();
  const dbRef = db;

  const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET;

  // Optional restriction: add your UID(s) to restrict access
  const ALLOWED_ADMIN_UIDS = new Set([
    // "w5jtigflSVezQwUvnsgM7AY4ZK73",
  ]);

  // ====== DOM ======
  const authStatus = $('#auth-status'), loginBtn = $('#loginBtn'), signupBtn = $('#signupBtn'), logoutBtn = $('#logoutBtn');
  const email = $('#email'), password = $('#password');

  const productSection = $('#product-section');
  const listSection = $('#list-section');

  const nameEl = $('#name'), priceEl = $('#price'), sizesEl = $('#sizes'), descEl = $('#description');
  const brandEl = $('#brand'), categoryEl = $('#category'), activeEl = $('#active'), imagesEl = $('#images'), docIdEl = $('#docId');
  const globalStockEl = $('#stock');

  const filterCategory = $('#filterCategory'), refreshBtn = $('#refreshBtn'), tableBody = $('#tableBody');

  const money = (n) => 'Rs' + Number(n || 0).toFixed(0);

  // ====== Parse sizes (Label | Price | Stock)
  const parseSizes = (t) => {
    return t.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const parts = l.split('|').map(x => x.trim());
        const label = parts[0] || '';
        const price = Number(parts[1] || 0);
        const stock = parts[2] !== undefined && parts[2] !== '' ? Number(parts[2]) : null;
        return { label, price, ...(stock !== null ? { stock } : {}) };
      });
  };

  const renderSizesText = (sizes) => {
    if (!Array.isArray(sizes) || !sizes.length) return '';
    return sizes.map(s => {
      const price = Number(s.price || 0);
      const hasStock = typeof s.stock === 'number';
      return `${s.label} ${hasStock ? `(${s.stock} pcs)` : ''} – ${isNaN(price) ? 'Rs0' : money(price)}`;
    }).join(', ');
  };

  const sizesToTextarea = (sizes) => {
    if (!Array.isArray(sizes) || !sizes.length) return '';
    return sizes.map(s => {
      const hasStock = typeof s.stock === 'number';
      return `${s.label} | ${s.price}${hasStock ? ` | ${s.stock}` : ''}`;
    }).join('\n');
  };

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

  // ====== Auth ======
  loginBtn && (loginBtn.onclick = () => auth.signInWithEmailAndPassword(email.value, password.value).catch(e => alert(e.message)));
  signupBtn && (signupBtn.onclick = () => auth.createUserWithEmailAndPassword(email.value, password.value).then(cred => {
    alert(`Account created. Your UID is:\n${cred.user.uid}\n(Add it to ALLOWED_ADMIN_UIDS in admin.js if you want to restrict access.)`);
  }).catch(e => alert(e.message)));
  logoutBtn && (logoutBtn.onclick = () => auth.signOut());

  auth.onAuthStateChanged((u) => {
    const allowed = u && (ALLOWED_ADMIN_UIDS.size === 0 || ALLOWED_ADMIN_UIDS.has(u.uid));
    authStatus.textContent = u ? (allowed ? `Signed in as ${u.email}` : 'Unauthorized') : 'Not signed in';
    logoutBtn.style.display = u ? 'inline-block' : 'none';

    const show = !!allowed;
    productSection.style.display = show ? 'block' : 'none';
    listSection.style.display = show ? 'block' : 'none';

    if (show) loadList();
  });

  // ====== Cloudinary upload (returns array of URLs) ======
  async function uploadImages(files) {
    if (!files || !files.length) return [];
    const out = [];
    for (const f of files) {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) out.push(data.secure_url);
    }
    return out;
  }

  // ====== Save product (Create/Update) ======
  $('#saveBtn').onclick = async () => {
    try {
      const sizes = parseSizes(sizesEl.value);
      const data = {
        name: nameEl.value.trim(),
        basePrice: Number(priceEl.value || 0),
        brand: brandEl.value.trim() || null,
        sizes, // per-size stock lives here
        description: descEl.value.trim() || '',
        category: String(categoryEl.value || '').toLowerCase(),
        active: !!activeEl.checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // global stock applies only when NO sizes provided
      const globalStockVal = globalStockEl.value !== '' ? Number(globalStockEl.value) : null;
      if (!sizes.length && globalStockVal !== null && !Number.isNaN(globalStockVal)) {
        data.stock = globalStockVal;
      } else {
        // if sizes are provided, remove single stock to avoid confusion
        data.stock = firebase.firestore.FieldValue.delete();
      }

      const id = docIdEl.value || dbRef.collection('products').doc().id;

      // Upload new images if chosen
      if (imagesEl.files && imagesEl.files.length) {
        const newImgs = await uploadImages(imagesEl.files);
        if (newImgs.length) {
          if (!docIdEl.value) {
            data.imageURL = newImgs[0];
            data.images = newImgs.slice(1);
          } else {
            const snap = await dbRef.collection('products').doc(id).get();
            const old = snap.exists ? snap.data() : {};
            const oldList = Array.isArray(old.images) ? old.images : [];
            data.images = [...oldList, ...newImgs];
            if (!old.imageURL) data.imageURL = newImgs[0];
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

  // ====== List / Edit / Delete ======
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
        <td>${sizesTxt || '—'}</td>
        <td>${money(p.basePrice)}</td>
        <td>${p.active ? 'Yes' : 'No'}</td>
        <td>
          <button class="btn edit" data-id="${doc.id}">Edit</button>
          <button class="btn danger delete" data-id="${doc.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // bind actions
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
