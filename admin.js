// admin.js — robust version (DOM-ready + null guards + clear error messages)
(function () {
  // ---- DOM READY ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function $(sel) { return document.querySelector(sel); }
  function byId(id) { return document.getElementById(id); }

  function assertFirebase() {
    if (!window.firebase) throw new Error('Firebase SDK not loaded.');
    if (!window.db || !firebase.apps?.length) throw new Error('firebase-config.js did not initialize Firestore.');
    if (!firebase.auth) throw new Error('firebase-auth-compat.js not loaded.');
  }

  function nullSafeBind(el, event, fn) {
    if (!el) return; el.addEventListener(event, fn);
  }

  function init() {
    try {
      assertFirebase();
    } catch (e) {
      console.error('❌ Firebase not initialized. Check script order in admin.html.', e);
      // Don’t crash: still attach navbar fallback if present
      setupNavbarFallback();
      return;
    }

    // ---- ELEMENTS (all optional: code no-ops if not present) ----
    const loginBtn       = byId('loginBtn');
    const signupBtn      = byId('signupBtn');
    const logoutBtn      = byId('logoutBtn');
    const emailEl        = byId('email');
    const passEl         = byId('password');
    const authStatus     = byId('auth-status');

    const productSection = byId('product-section');
    const nameEl         = byId('name');
    const priceEl        = byId('price');
    const brandEl        = byId('brand');
    const sizesEl        = byId('sizes');
    const descEl         = byId('description');
    const categoryEl     = byId('category');
    const imgEl          = byId('image');
    const activeEl       = byId('active');
    const saveBtn        = byId('saveBtn');
    const resetBtn       = byId('resetBtn');
    const docIdEl        = byId('docId');

    const filterCategory = byId('filterCategory');
    const refreshBtn     = byId('refreshBtn');
    const tableBody      = byId('tableBody');

    // ---- HELPERS ----
    const parseSizes = (t) =>
      (t || '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => {
          const [label, p] = l.split('|').map(x => (x || '').trim());
          return { label, price: Number(p) || 0 };
        });

    const renderSizes = (s) =>
      (Array.isArray(s) ? s : []).map(x => `${x.label} (Rs${Number(x.price||0)})`).join(', ');

    const resetForm = () => {
      if (docIdEl) docIdEl.value = '';
      if (nameEl) nameEl.value = '';
      if (priceEl) priceEl.value = '';
      if (brandEl) brandEl.value = '';
      if (sizesEl) sizesEl.value = '';
      if (descEl) descEl.value = '';
      if (categoryEl) categoryEl.value = 'perfume';
      if (imgEl) imgEl.value = '';
      if (activeEl) activeEl.checked = true;
    };

    const updateAuthUI = (text, ok) => {
      if (authStatus) authStatus.textContent = text || '';
      if (logoutBtn) logoutBtn.style.display = ok ? 'inline-block' : 'none';
      if (productSection) productSection.style.display = ok ? 'block' : 'none';
    };

    // ---- AUTH HANDLERS ----
    nullSafeBind(loginBtn, 'click', async () => {
      try {
        await auth.signInWithEmailAndPassword(emailEl?.value || '', passEl?.value || '');
      } catch (e) {
        alert(e.message);
      }
    });

    nullSafeBind(signupBtn, 'click', async () => {
      try {
        const cred = await auth.createUserWithEmailAndPassword(emailEl?.value || '', passEl?.value || '');
        alert('Signup OK. Your UID: ' + cred.user?.uid + '\n\nAdd this UID to Firestore/Storage rules.');
        console.log('UID:', cred.user?.uid);
      } catch (e) {
        alert(e.message);
      }
    });

    nullSafeBind(logoutBtn, 'click', async () => {
      try { await auth.signOut(); } catch (e) { console.warn(e); }
    });

    // ---- AUTH STATE ----
    auth.onAuthStateChanged(async (u) => {
      try {
        // If any UI blocks are missing, skip UI changes safely
        const ok = !!u;
        updateAuthUI(u ? `Signed in as ${u.email || u.uid}` : 'Not signed in', ok);
        if (ok) loadProducts(); // auto-refresh table
      } catch (e) {
        console.warn('Auth UI update failed:', e);
      }
    });

    // ---- PRODUCT TABLE LOAD ----
    async function loadProducts() {
      if (!tableBody || !filterCategory) return;

      tableBody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;
      try {
        const snap = await db.collection('products')
          .where('category', '==', (filterCategory.value || '').toLowerCase())
          .get();

        if (snap.empty) {
          tableBody.innerHTML = `<tr><td colspan="7">No products</td></tr>`;
          return;
        }

        const rows = [];
        snap.forEach(doc => {
          const p = doc.data() || {};
          rows.push(`
            <tr>
              <td>${p.imageURL ? `<img src="${p.imageURL}" width="60" height="60" style="object-fit:cover;border-radius:6px">` : ''}</td>
              <td>${p.name || ''}</td>
              <td>${p.brand || ''}</td>
              <td>${renderSizes(p.sizes)}</td>
              <td>Rs${Number(p.basePrice||0).toFixed(2)}</td>
              <td>${p.active ? 'Yes' : 'No'}</td>
              <td>
                <button class="edit" data-id="${doc.id}">Edit</button>
                <button class="delete" data-id="${doc.id}">Delete</button>
              </td>
            </tr>
          `);
        });
        tableBody.innerHTML = rows.join('');

        // bind actions
        tableBody.querySelectorAll('.edit').forEach(btn => {
          btn.addEventListener('click', async () => {
            try {
              const id = btn.getAttribute('data-id');
              const d = await db.collection('products').doc(id).get();
              if (!d.exists) return;
              const p = d.data() || {};
              if (docIdEl) docIdEl.value = d.id;
              if (nameEl) nameEl.value = p.name || '';
              if (priceEl) priceEl.value = Number(p.basePrice || 0);
              if (brandEl) brandEl.value = p.brand || '';
              if (sizesEl) sizesEl.value = (Array.isArray(p.sizes) ? p.sizes : []).map(s => `${s.label} | ${s.price}`).join('\n');
              if (descEl) descEl.value = p.description || '';
              if (categoryEl) categoryEl.value = p.category || 'perfume';
              if (activeEl) activeEl.checked = !!p.active;
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (e) {
              alert('Edit failed: ' + e.message);
            }
          });
        });

        tableBody.querySelectorAll('.delete').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (!confirm('Delete this product?')) return;
            try {
              await db.collection('products').doc(id).delete();
              loadProducts();
            } catch (e) {
              alert('Delete failed: ' + e.message);
            }
          });
        });

      } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="7" style="color:#ff9c9c">Error: ${e.message}</td></tr>`;
      }
    }

    // ---- SAVE / RESET ----
    nullSafeBind(saveBtn, 'click', async () => {
      try {
        const sizes = parseSizes(sizesEl?.value || '');
        const data = {
          name: nameEl?.value || '',
          basePrice: Number(priceEl?.value || 0),
          brand: brandEl?.value || '',
          sizes,
          description: descEl?.value || '',
          category: (categoryEl?.value || 'perfume').toLowerCase(),
          active: !!(activeEl?.checked),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        let id = docIdEl?.value || '';
        if (!id) {
          id = db.collection('products').doc().id;
          data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        // Image upload (Cloudinary unsigned preset — optional)
        if (imgEl && imgEl.files && imgEl.files[0]) {
          const url = await uploadToCloudinary(imgEl.files[0]);
          if (url) data.imageURL = url;
        }

        await db.collection('products').doc(id).set(data, { merge: true });
        alert('Saved');
        resetForm();
        loadProducts();
      } catch (e) {
        alert('Save failed: ' + e.message);
      }
    });

    nullSafeBind(resetBtn, 'click', resetForm);

    // ---- FILTER / REFRESH ----
    nullSafeBind(filterCategory, 'change', loadProducts);
    nullSafeBind(refreshBtn, 'click', loadProducts);

    // Initial load (if already logged in)
    // auth state listener will call loadProducts; no need to call here.

    // ---- NAVBAR FALLBACK ----
    setupNavbarFallback();
  }

  // ---- CLOUDINARY UPLOAD (optional) ----
  async function uploadToCloudinary(file) {
    try {
      const cloud = window.CLOUDINARY_CLOUD_NAME;
      const preset = window.CLOUDINARY_UPLOAD_PRESET;
      if (!cloud || !preset) return null;

      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', preset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
      const json = await res.json();
      if (json?.secure_url) return json.secure_url;
      throw new Error(json?.error?.message || 'Cloudinary upload failed');
    } catch (e) {
      alert('Image upload error: ' + e.message);
      return null;
    }
  }

  // ---- NAVBAR FALLBACK ----
  function setupNavbarFallback() {
    const burger = $('.hamburger');
    const links  = $('.nav-links');
    if (burger && links && !burger.__bound) {
      burger.__bound = true;
      burger.addEventListener('click', () => links.classList.toggle('show'));
    }
  }
})();
