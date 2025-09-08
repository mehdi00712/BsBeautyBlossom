// admin.js – with stock support
(function(){
  if (!window.firebase || !window.db) {
    console.error("❌ Firebase not initialized: check admin.html includes firebase-config.js after Firebase scripts.");
    return;
  }

  const $ = (s) => document.querySelector(s);
  const authStatus=$('#auth-status'),
        loginBtn=$('#loginBtn'), signupBtn=$('#signupBtn'), logoutBtn=$('#logoutBtn'),
        email=$('#email'), password=$('#password');

  const productSection=$('#product-section'),
        listSection=$('#list-section'),
        nameEl=$('#name'), priceEl=$('#price'), brandEl=$('#brand'), stockEl=$('#stock'),
        sizesEl=$('#sizes'), descEl=$('#description'),
        categoryEl=$('#category'), imgEl=$('#images'),
        activeEl=$('#active'), saveBtn=$('#saveBtn'), resetBtn=$('#resetBtn'),
        tableBody=$('#tableBody'), filterCategory=$('#filterCategory'),
        refreshBtn=$('#refreshBtn'), docIdEl=$('#docId');

  // ===== AUTH =====
  loginBtn.onclick=()=>auth.signInWithEmailAndPassword(email.value,password.value).catch(e=>alert(e.message));
  signupBtn.onclick=()=>auth.createUserWithEmailAndPassword(email.value,password.value).then(()=>alert("Account created")).catch(e=>alert(e.message));
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

  // ===== PRODUCTS =====
  const parseSizes=(t)=>t.split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{
    let [label,p]=l.split("|").map(x=>x.trim());
    return {label, price:Number(p)};
  });

  const renderSizes=(s)=> (s||[]).map(x=>${x.label} Rs${x.price}).join(", ");

  resetBtn.onclick=()=>{docIdEl.value=""; nameEl.value=priceEl.value=brandEl.value=stockEl.value=sizesEl.value=descEl.value=""; imgEl.value=""; categoryEl.value="perfume"; activeEl.checked=true;};

  saveBtn.onclick=async()=>{
    const sizes=parseSizes(sizesEl.value);
    const data={
      name:nameEl.value,
      basePrice:Number(priceEl.value),
      brand:brandEl.value,
      stock:Number(stockEl.value||0),
      sizes,
      description:descEl.value,
      category:categoryEl.value,
      active:activeEl.checked,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    };
    const id=docIdEl.value||db.collection("products").doc().id;

    // Cloudinary upload if images chosen
    if(imgEl.files.length){
      const urls=[];
      for(const f of imgEl.files){
        const fd=new FormData();
        fd.append("file", f);
        fd.append("upload_preset", window.CLOUDINARY_UPLOAD_PRESET);
        const res=await fetch(https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/image/upload,{method:"POST",body:fd});
        const out=await res.json();
        if(out.secure_url) urls.push(out.secure_url);
      }
      if(urls.length) data.imageURL=urls[0], data.images=urls;
    }

    if(docIdEl.value){
      delete data.createdAt;
      await db.collection("products").doc(id).set(data,{merge:true});
    } else {
      await db.collection("products").doc(id).set(data);
    }
    alert("✅ Product saved");
    resetBtn.click();
    load();
  };

  async function load(){
    tableBody.innerHTML="<tr><td colspan='6'>Loading…</td></tr>";
    const snap=await db.collection("products").where("category","==",filterCategory.value).get();
    if(snap.empty){tableBody.innerHTML="<tr><td colspan='6'>No products</td></tr>";return;}
    tableBody.innerHTML="";
    snap.forEach(doc=>{
      const p=doc.data();
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td>${p.imageURL?<img src="${p.imageURL}" width="50">:""}</td>
        <td>${p.name}</td>
        <td>${renderSizes(p.sizes)}<br><small>Stock: ${p.stock||0}</small></td>
        <td>Rs${p.basePrice||0}</td>
        <td>${p.active?"Yes":"No"}</td>
        <td>
          <button class="edit" data-id="${doc.id}">Edit</button>
          <button class="delete" data-id="${doc.id}">Delete</button>
        </td>`;
      tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll(".edit").forEach(b=>b.onclick=async()=>{
      const d=await db.collection("products").doc(b.dataset.id).get();
      if(d.exists){
        const p=d.data();
        docIdEl.value=d.id;
        nameEl.value=p.name||"";
        priceEl.value=p.basePrice||0;
        brandEl.value=p.brand||"";
        stockEl.value=p.stock||0;
        sizesEl.value=(p.sizes||[]).map(s=>${s.label}|${s.price}).join("\n");
        descEl.value=p.description||"";
        categoryEl.value=p.category||"perfume";
        activeEl.checked=!!p.active;
      }
    });

    tableBody.querySelectorAll(".delete").forEach(b=>b.onclick=()=>db.collection("products").doc(b.dataset.id).delete().then(load));
  }

  refreshBtn.onclick=load;
  filterCategory.onchange=load;
  setTimeout(load,1000);
})();
