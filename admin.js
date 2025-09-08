// admin.js — robust auth wiring + clear errors
(function(){
  function $(s){ return document.querySelector(s); }
  function setStatus(msg, isError=false){
    const el = $('#auth-status');
    if (!el) return;
    el.textContent = msg || '';
    el.style.color = isError ? '#b91c1c' : '#6b7280';
  }
  function disable(el, on){ if (el) el.disabled = !!on; }

  function guardFirebase(){
    if (!window.firebase) { console.error('Firebase SDK not loaded'); setStatus('Firebase not loaded', true); return false; }
    if (!window.auth || !window.db){
      console.error('firebase-config.js did not set window.auth/window.db');
      setStatus('Config error: auth/db not initialized', true);
      return false;
    }
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!guardFirebase()) return;

    const email = $('#email');
    const password = $('#password');
    const loginBtn = $('#loginBtn');
    const signupBtn = $('#signupBtn');
    const logoutBtn = $('#logoutBtn');

    const productSection = $('#product-section');
    const listSection    = $('#list-section');

    // ----- BUTTON HANDLERS -----
    async function doLogin(){
      if (!email.value.trim() || !password.value.trim()){
        setStatus('Please enter email and password.', true);
        return;
      }
      try{
        disable(loginBtn, true); setStatus('Signing in…');
        await auth.signInWithEmailAndPassword(email.value.trim(), password.value.trim());
        setStatus('Signed in.');
      }catch(err){
        console.error('Login failed:', err);
        setStatus(err?.message || 'Login failed', true);
        alert(err?.message || 'Login failed');
      }finally{
        disable(loginBtn, false);
      }
    }

    async function doSignup(){
      if (!email.value.trim() || !password.value.trim()){
        setStatus('Please enter email and password.', true);
        return;
      }
      try{
        disable(signupBtn, true); setStatus('Creating account…');
        await auth.createUserWithEmailAndPassword(email.value.trim(), password.value.trim());
        setStatus('Account created. You are now signed in.');
        alert('Account created. If you restrict writes by UID, add this new UID in Firestore Rules.');
      }catch(err){
        console.error('Signup failed:', err);
        setStatus(err?.message || 'Signup failed', true);
        alert(err?.message || 'Signup failed');
      }finally{
        disable(signupBtn, false);
      }
    }

    async function doLogout(){
      try{
        disable(logoutBtn, true); setStatus('Signing out…');
        await auth.signOut();
        setStatus('Signed out.');
      }catch(err){
        console.error('Logout failed:', err);
        setStatus(err?.message || 'Logout failed', true);
      }finally{
        disable(logoutBtn, false);
      }
    }

    // Clicks
    if (loginBtn)  loginBtn.addEventListener('click', doLogin);
    if (signupBtn) signupBtn.addEventListener('click', doSignup);
    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);

    // ENTER to submit
    [email, password].forEach(inp=>{
      if (!inp) return;
      inp.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter') doLogin();
      });
    });

    // ----- AUTH STATE -----
    auth.onAuthStateChanged(user=>{
      if (user){
        setStatus(Signed in as ${user.email});
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (productSection) productSection.style.display = 'block';
        if (listSection)    listSection.style.display    = 'block';
      }else{
        setStatus('Not signed in');
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (productSection) productSection.style.display = 'none';
        if (listSection)    listSection.style.display    = 'none';
      }
    });

    // ----- PRODUCTS LIST (kept minimal so we can focus on login) -----
    const filterCategory = $('#filterCategory');
    const refreshBtn     = $('#refreshBtn');
    const tableBody      = $('#tableBody');

    async function loadProducts(){
      if (!tableBody) return;
      tableBody.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";
      try{
        const cat = (filterCategory?.value || 'perfume').toLowerCase();
        const snap = await db.collection('products').where('category','==',cat).get();
        if (snap.empty){
          tableBody.innerHTML = "<tr><td colspan='6'>No products</td></tr>";
          return;
        }
        tableBody.innerHTML = '';
        snap.forEach(doc=>{
          const p = doc.data();
          const tr = document.createElement('tr');
          const sizes = Array.isArray(p.sizes) ? p.sizes.map(s=>${s.label} Rs${s.price}).join(', ') : '';
          tr.innerHTML = `
            <td>${p.imageURL?<img src="${p.imageURL}" width="50" height="50" style="object-fit:cover;border-radius:6px;border:1px solid #eee">:''}</td>
            <td>${p.name||''}${p.brand?<div class="muted">${p.brand}</div>:''}</td>
            <td>${sizes}</td>
            <td>Rs${Number(p.basePrice||0).toFixed(0)}</td>
            <td>${p.active?'Yes':'No'}</td>
            <td>
              <button class="edit" data-id="${doc.id}">Edit</button>
              <button class="delete" data-id="${doc.id}">Delete</button>
            </td>
          `;
          tableBody.appendChild(tr);
        });

        // wire edit/delete minimal (you already have the full CRUD elsewhere)
        tableBody.querySelectorAll('.delete').forEach(b=>{
          b.addEventListener('click', async ()=>{
            if (!confirm('Delete this product?')) return;
            await db.collection('products').doc(b.dataset.id).delete();
            loadProducts();
          });
        });

        tableBody.querySelectorAll('.edit').forEach(b=>{
          b.addEventListener('click', async ()=>{
            const d = await db.collection('products').doc(b.dataset.id).get();
            if (!d.exists) return;
            const p = d.data();
            // fill form
            $('#docId').value = d.id;
            $('#name').value = p.name || '';
            $('#price').value = Number(p.basePrice||0) || 0;
            $('#brand').value = p.brand || '';
            $('#sizes').value = (Array.isArray(p.sizes)?p.sizes:[]).map(s=>${s.label}|${s.price}).join('\n');
            $('#description').value = p.description || '';
            $('#category').value = p.category || 'perfume';
            $('#active').checked = !!p.active;
            window.scrollTo({top:0, behavior:'smooth'});
          });
        });
      }catch(err){
        console.error('Load products failed:', err);
        tableBody.innerHTML = "<tr><td colspan='6'>Error loading products</td></tr>";
      }
    }

    if (filterCategory) filterCategory.addEventListener('change', loadProducts);
    if (refreshBtn)     refreshBtn.addEventListener('click',  loadProducts);
    setTimeout(loadProducts, 700); // small delay to let auth state settle
  });
})();
