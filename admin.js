// admin.js – Admin CRUD with variants (sizes/shades/flavors) + Cloudinary uploads
(function(){
  // Basic guard so we don't crash if scripts were included in wrong order
  if (!window.firebase || !window.db || !window.auth) {
    console.error("❌ Firebase not initialized. Make sure admin.html loads firebase-app-compat, auth-compat, firestore-compat, then firebase-config.js.");
    return;
  }

  const $ = (s) => document.querySelector(s);

  // Auth widgets
  const authStatus=$('#auth-status'),
        loginBtn=$('#loginBtn'), signupBtn=$('#signupBtn'), logoutBtn=$('#logoutBtn'),
        email=$('#email'), password=$('#password');

  // Product widgets
  const productSection=$('#product-section'),
        listSection=$('#list-section'),
        nameEl=$('#name'), priceEl=$('#price'), brandEl=$('#brand'),
        sizesEl=$('#sizes'), descEl=$('#description'),
        categoryEl=$('#category'), imgEl=$('#images'),
        activeEl=$('#active'), saveBtn=$('#saveBtn'), resetBtn=$('#resetBtn'),
        tableBody=$('#tableBody'), filterCategory=$('#filterCategory'),
        refreshBtn=$('#refreshBtn'), docIdEl=$('#docId');

  // ===== AUTH =====
  loginBtn.onclick=()=>auth.signInWithEmailAndPassword(email.value,password.value)
    .catch(e=>alert(e.message));

  signupBtn.onclick=()=>auth.createUserWithEmailAndPassword(email.value,password.value)
    .then(()=>alert("Account created. (Remember to secure Firestore rules)"))
    .catch(e=>alert(e.message));

  logoutBtn.onclick=()=>auth.signOut();

  auth.onAuthStateChanged(u=>{
    if(u){
      authStatus.textContent=Signed in as ${u.email};
      logoutBtn.style.display="inline-block";
      productSection.style.display=listSection.style.display="block";
    } else {
      authStatus.textContent="Not signed in";
      logoutBtn.style.display="none";
      productSection.style.display=listSection.style.display="none";
    }
  });

  // ===== HELPERS =====
  const parseSizes=(t)=>t.split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{
    let [label,p]=l.split("|").map(x=>x.trim());
    return {label, price:Number(p)};
  });

  const renderSizes=(s)=> (s||[]).map(x=>${x.label} Rs${x.price}).join(", ");

  const resetForm=()=>{
    docIdEl.value="";
    nameEl.value="";
    priceEl.value="";
    brandEl.value="";
    sizesEl.value="";
    descEl.value="";
    imgEl.value="";
    categoryEl.value="perfume";
    activeEl.checked=true;
  };

  resetBtn.onclick=resetForm;

  // ===== SAVE (CREATE/UPDATE) =====
  saveBtn.onclick=async()=>{
    try{
      const sizes=parseSizes(sizesEl.value);
      const data={
        name:nameEl.value,
        basePrice:Number(priceEl.value || 0),
        brand:brandEl.value,
        sizes,
        description:descEl.value,
        category:categoryEl.value,
        active:activeEl.checked,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      };

      // get or create ID
      const id=docIdEl.value || db.collection("products").doc().id;

      // Optional: upload images to Cloudinary (unsigned)
      if(imgEl.files && imgEl.files.length){
        const urls=[];
        for(const f of imgEl.files){
          const fd=new FormData();
          fd.append("file", f);
          fd.append("upload_preset", window.CLOUDINARY_UPLOAD_PRESET);
          const res=await fetch(https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/image/upload,{
            method:"POST", body:fd
          });
          const out=await res.json();
          if(out && out.secure_url) urls.push(out.secure_url);
        }
        if(urls.length){
          data.imageURL = urls[0]; // primary image
          data.images   = urls;    // all images
        }
      }

      if (docIdEl.value){
        // update existing
        delete data.createdAt;
        await db.collection("products").doc(id).set(data,{merge:true});
      } else {
        // create new
        await db.collection("products").doc(id).set(data);
      }

      alert("✅ Product saved");
      resetForm();
      load();
    }catch(err){
      console.error(err);
      alert("Save failed: " + (err?.message||err));
    }
  };

  // ===== LIST / EDIT / DELETE =====
  async function load(){
    tableBody.innerHTML="<tr><td colspan='6'>Loading…</td></tr>";
    try{
      const snap=await db.collection("products")
        .where("category","==",String(filterCategory.value).toLowerCase())
        .get();

      if(snap.empty){
        tableBody.innerHTML="<tr><td colspan='6'>No products</td></tr>";
        return;
      }

      tableBody.innerHTML="";
      snap.forEach(doc=>{
        const p=doc.data();
        const tr=document.createElement("tr");
        tr.innerHTML=`
          <td>${p.imageURL ? <img src="${p.imageURL}" width="50" height="50" style="object-fit:cover;border-radius:6px;border:1px solid #eee"> : ""}</td>
          <td>${p.name||""}${p.brand?<div class="muted">${p.brand}</div>:""}</td>
          <td>${renderSizes(p.sizes)}</td>
          <td>Rs${Number(p.basePrice||0).toFixed(0)}</td>
          <td>${p.active ? "Yes" : "No"}</td>
          <td>
            <button class="edit" data-id="${doc.id}">Edit</button>
            <button class="delete" data-id="${doc.id}">Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

      // wire edit/delete
      tableBody.querySelectorAll(".edit").forEach(b=>b.onclick=async()=>{
        try{
          const d=await db.collection("products").doc(b.dataset.id).get();
          if(!d.exists) return;
          const p=d.data();
          docIdEl.value=d.id;
          nameEl.value=p.name||"";
          priceEl.value=p.basePrice||0;
          brandEl.value=p.brand||"";
          sizesEl.value=(p.sizes||[]).map(s=>${s.label}|${s.price}).join("\n");
          descEl.value=p.description||"";
          categoryEl.value=p.category||"perfume";
          activeEl.checked=!!p.active;
          window.scrollTo({top:0,behavior:"smooth"});
        }catch(err){
          alert("Could not load product: " + (err?.message||err));
        }
      });

      tableBody.querySelectorAll(".delete").forEach(b=>b.onclick=async()=>{
        if(!confirm("Delete this product?")) return;
        try{
          await db.collection("products").doc(b.dataset.id).delete();
          load();
        }catch(err){
          alert("Delete failed: " + (err?.message||err));
        }
      });

    }catch(err){
      console.error(err);
      tableBody.innerHTML="<tr><td colspan='6'>Error loading products</td></tr>";
    }
  }

  refreshBtn.onclick=load;
  filterCategory.onchange=load;
  // initial load (little delay so auth state resolves)
  setTimeout(load, 600);
})();
