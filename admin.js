// admin.js (Cloudinary unsigned uploads, Firebase Auth + Firestore, live table)
(function(){
  const $ = (s)=>document.querySelector(s);

  // Allow only this UID to write (your UID)
  const ALLOWED_ADMIN_UIDS = new Set([
    "w5jtigflSVezQwUvnsgM7AY4ZK73"
  ]);

  // Cloudinary config (set in admin.html)
  const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET;

  // Elements
  const authStatus = $('#auth-status');
  const loginBtn = $('#loginBtn');
  const signupBtn = $('#signupBtn');
  const logoutBtn = $('#logoutBtn');
  const email = $('#email');
  const password = $('#password');

  const productSection = $('#product-section');
  const listSection = document.getElementById('list-section');
  const nameEl = $('#name');
  const brandEl = $('#brand');
  const priceEl = $('#price');
  const sizesEl = $('#sizes');
  const descEl = $('#description');
  const categoryEl = $('#category');
  const imgEl = $('#image'); // file input
  const activeEl = $('#active');
  const saveBtn = $('#saveBtn');
  const resetBtn = $('#resetBtn');
  const tableBody = $('#tableBody');
  const filterCategory = $('#filterCategory');
  const refreshBtn = $('#refreshBtn');
  const docIdEl = $('#docId');

  // Helpers
  const parseSizes = (text='') =>
    text.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
      const [label, priceStr] = l.split('|').map(x=>x.trim());
      const price = Number((priceStr||'').replace(/[^0-9.]/g,''));
      return { label, price: isNaN(price) ? null : price };
    }).filter(s=>s.label && s.price!=null);

  const renderSizes = (sizes=[]) => sizes.map(s=>`${s.label} (Rs${s.price})`).join(', ');

  const resetForm = ()=>{
    docIdEl.value=''; nameEl.value=''; brandEl.value='';
    priceEl.value=''; sizesEl.value=''; descEl.value='';
    categoryEl.value='perfume'; imgEl.value=''; activeEl.checked=true;
  };

  // Auth
  loginBtn.onclick = async ()=>{
    try{ await auth.signInWithEmailAndPassword(email.value, password.value); }
    catch(e){ alert(e.message); }
  };
  signupBtn.onclick = async ()=>{
    try{
      await auth.createUserWithEmailAndPassword(email.value, password.value);
      alert('Account created. Open DevTools console to copy your UID and add it to ALLOWED_ADMIN_UIDS + Firestore Rules.');
    }catch(e){ alert(e.message); }
  };
  logoutBtn.onclick = ()=>auth.signOut();

  auth.onAuthStateChanged((user)=>{
    console.log('Auth user UID:', user?.uid);
    const ok = !!user && (ALLOWED_ADMIN_UIDS.size===0 || ALLOWED_ADMIN_UIDS.has(user.uid));
    authStatus.textContent = user ? (ok ? `Signed in as ${user.email}` : 'Signed in but not authorized for admin.') : 'Not signed in';
    logoutBtn.style.display = user ? 'inline-block' : 'none';
    productSection.style.display = ok ? 'block' : 'none';
    listSection.style.display = ok ? 'block' : 'none';
    if (ok) loadTable();
  });

  // Cloudinary upload (unsigned)
  async function uploadToCloudinary(file){
    if (!file) return '';
    if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error('Missing Cloudinary config in admin.html');
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    // Optional: form.append('folder', 'products');
    const res = await fetch(url, { method:'POST', body:form });
    if (!res.ok){
      const txt = await res.text();
      throw new Error('Cloudinary upload failed: ' + txt);
    }
    const data = await res.json();
    return data.secure_url; // store in Firestore
  }

  // Save (create/update)
  saveBtn.onclick = async ()=>{
    const sizes = parseSizes(sizesEl.value);
    const data = {
      name: nameEl.value.trim(),
      brand: brandEl.value.trim(),
      basePrice: Number(priceEl.value || 0),
      sizes,
      description: descEl.value.trim(),
      category: categoryEl.value,
      imageURL: undefined, // set after upload
      active: !!activeEl.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (!data.name) return alert('Name required');

    try{
      const docId = docIdEl.value || db.collection('products').doc().id;

      if (imgEl.files && imgEl.files[0]){
        data.imageURL = await uploadToCloudinary(imgEl.files[0]);
      }

      if (docIdEl.value){
        const toUpdate = {...data}; delete toUpdate.createdAt;
        if (toUpdate.imageURL === undefined) delete toUpdate.imageURL; // keep old image if none selected
        await db.collection('products').doc(docId).set(toUpdate, { merge:true });
      } else {
        await db.collection('products').doc(docId).set(data, { merge:true });
        docIdEl.value = docId;
      }
      alert('Saved ✓');
      // no manual reload — live listener updates table
    }catch(e){ console.error(e); alert(e.message); }
  };

  resetBtn.onclick = resetForm;

  // List / Edit / Delete — live listener, no orderBy (avoids composite index)
  function loadTable(){
    const cat = filterCategory.value;
    tableBody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';

    try {
      db.collection('products')
        .where('category','==', cat)
        .onSnapshot((snap) => {
          tableBody.innerHTML = '';
          if (snap.empty){
            tableBody.innerHTML = '<tr><td colspan="6">No products yet</td></tr>';
            return;
          }
          snap.forEach(doc=>{
            const p = doc.data();
            const tr = document.createElement('tr');
            const sizesText = renderSizes(p.sizes||[]);
            tr.innerHTML = `
              <td>${p.imageURL ? `<img src="${p.imageURL}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid #23232a">` : ''}</td>
              <td>${p.name||''}${p.brand?`<div class="muted">${p.brand}</div>`:''}</td>
              <td>${sizesText}</td>
              <td>Rs${(p.basePrice||0).toFixed(2)}</td>
              <td>${p.active?'Yes':'No'}</td>
              <td>
                <button data-id="${doc.id}" class="btn muted edit">Edit</button>
                <button data-id="${doc.id}" class="btn danger delete">Delete</button>
              </td>`;
            tableBody.appendChild(tr);
          });

          // wire buttons after render
          tableBody.querySelectorAll('button.edit').forEach(btn=>btn.onclick=async (e)=>{
            const id = e.currentTarget.dataset.id;
            const d = await db.collection('products').doc(id).get();
            if (!d.exists) return;
            const p = d.data();
            docIdEl.value = id;
            nameEl.value = p.name || '';
            brandEl.value = p.brand || '';
            priceEl.value = p.basePrice || '';
            sizesEl.value = (p.sizes||[]).map(s=>`${s.label} | ${s.price}`).join('\n');
            descEl.value = p.description || '';
            categoryEl.value = p.category || 'perfume';
            activeEl.checked = !!p.active;
            window.scrollTo({top:0,behavior:'smooth'});
          });

          tableBody.querySelectorAll('button.delete').forEach(btn=>btn.onclick=async (e)=>{
            const id = e.currentTarget.dataset.id;
            if (!confirm('Delete this product?')) return;
            await db.collection('products').doc(id).delete();
          });
        }, (err)=>{
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
