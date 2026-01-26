/* admin.js — Auth, allowlist-gated admin UI, Products (Firestore), Orders (Realtime DB) */

if (!window.firebase) throw new Error("❌ Firebase SDK missing");
const auth = firebase.auth();
const db   = firebase.firestore();
const storage = firebase.storage(); // ✅ ADDED (Firebase Storage)

/* ===== ONLY THESE UIDs GET ADMIN FEATURES ===== */
const ALLOWED_UIDS = [
  "nyQYzolZI2fLFqIkAPNHHbcSJ2p1",
  "w5jtigflSVezQwUvnsgM7AY4ZK73"
];

/* ---------- helpers ---------- */
const $  = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const show = (el) => el && el.classList.remove("hide");
const hide = (el) => el && el.classList.add("hide");
const toNumber = (v) => (v === "" || v == null ? 0 : Number(v));
const parseSizes = (t) => String(t || "").split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{
  const [label, p] = l.split("|").map(x => (x||"").trim());
  return { label, price: Number(p || 0) };
});
const renderSizes = (arr) => (arr||[]).map(s=>`${s.label} (Rs${isFinite(s.price)?s.price:0})`).join(", ");
function esc(v){ return String(v ?? "-").replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&lt;","&gt;":"&gt;","\"":"&quot;","'":"&#39;"}[s])); }
function fmtMoney(v){ const n = Number(v); return isFinite(n)? new Intl.NumberFormat(undefined,{style:"currency",currency:"MUR"}).format(n):"-"; }
function fmtTime(t){ if(!t) return "-"; const d = new Date(t); return isNaN(d)? String(t): d.toLocaleString(); }
const canSeeAdmin = (user) => !!user && ALLOWED_UIDS.includes(user.uid);

/* ---------- Cloudinary (optional) ---------- */
const CLOUD_NAME    = window.CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET || "";
async function uploadToCloudinary(file){
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error("Cloudinary not configured.");
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
  const r = await fetch(url,{method:"POST",body:fd}); if(!r.ok) throw new Error("Cloudinary upload failed");
  return (await r.json()).secure_url;
}

/* ---------- Firebase Storage (NEW) ---------- */
async function uploadToFirebase(file, folder){
  const uid = auth.currentUser?.uid || "anon";
  const path = `${folder}/${uid}/${Date.now()}_${file.name}`;
  const ref = storage.ref(path);
  await ref.put(file);
  return await ref.getDownloadURL();
}

/* ---------- UI refs ---------- */
const loginBtn   = $("loginBtn");
const logoutBtn  = $("logoutBtn");
const authStatus = $("auth-status");
const emailEl    = $("email");
const passEl     = $("password");

const dashboardWrap  = $("dashboard-sections");
const siteSection    = $("site-section");
const productSection = $("product-section");
const listSection    = $("list-section");

const btnSeeOrders = $("btnSeeOrders");
const btnBack      = $("btnBack");
const ordersSection= $("orders-section");
const ordersStatus = $("orders-status");
const ordersBody   = $("orders-body");

/* ---------- Login / Logout ---------- */
loginBtn?.addEventListener("click", async () => {
  try {
    if (emailEl?.value && passEl?.value) {
      await auth.signInWithEmailAndPassword(emailEl.value.trim(), passEl.value.trim());
    } else {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    }
    authStatus && (authStatus.textContent = "✅ Logged in");
  } catch (e) {
    authStatus && (authStatus.textContent = "❌ " + (e?.message || e));
    console.error(e);
  }
});
logoutBtn?.addEventListener("click", async () => {
  try { await auth.signOut(); authStatus && (authStatus.textContent = "Logged out"); }
  catch(e){ console.error(e); }
});

/* ---------- Orders view toggle (guarded) ---------- */
btnSeeOrders?.addEventListener("click", () => {
  const u = auth.currentUser;
  if (!canSeeAdmin(u)) return;
  hide(dashboardWrap);
  show(ordersSection);
  show(btnBack);
  hide(btnSeeOrders);
  ordersStatus && (ordersStatus.textContent = "Loading orders…");
  attachOrdersListener();
});
btnBack?.addEventListener("click", () => {
  show(dashboardWrap);
  hide(ordersSection);
  hide(btnBack);
  show(btnSeeOrders);
});

/* ---------- Orders (Realtime DB) ---------- */
let ordersListenerAttached = false;
function rowHTML(id, order){
  const itemsText = Array.isArray(order.items)
    ? order.items.map(i=>`${i.name||i.title||"item"} x${i.qty||i.quantity||1}`).join(", ")
    : (order.items && typeof order.items==="object"
        ? Object.values(order.items).map(i=>`${i.name||i.title||"item"} x${i.qty||i.quantity||1}`).join(", ")
        : String(order.items||""));

  const status = (order.status || "pending").toLowerCase();
  const cls = {
    pending:"status pending",
    shipped:"status shipped",
    completed:"status completed"
  }[status] || "status";

  const phone = (order.phone || "").trim();
  const total = order.total ?? order.totalAmount;

  return `
    <td data-col="id">${id}</td>
    <td data-col="name">${esc(order.name)}</td>
    <td data-col="email">${esc(order.email)}</td>
    <td data-col="phone">${esc(phone)}</td>
    <td data-col="items">${esc(itemsText)}</td>
    <td data-col="total">${fmtMoney(total)}</td>
    <td data-col="address">${esc(order.address)}</td>
    <td data-col="time">${fmtTime(order.timestamp)}</td>
    <td data-col="status" data-status="${status}">
      <span class="${cls}">${status[0].toUpperCase()+status.slice(1)}</span>
    </td>
    <td data-col="action">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn sm" data-set-status="pending" data-id="${id}">Pending</button>
        <button class="btn sm" data-set-status="shipped" data-id="${id}">Shipped</button>
        <button class="btn sm" data-set-status="completed" data-id="${id}">Completed</button>
        <button class="btn sm danger" data-delete-id="${id}">Delete</button>
      </div>
    </td>`;
}

function attachOrdersListener(){
  if (ordersListenerAttached) return;
  const rtdb = firebase.database();
  const ref = rtdb.ref("orders").limitToLast(500);

  ref.on("value", snap => {
    ordersBody.innerHTML = "";
    const data = snap.val() || {};
    const rows = [];

    Object.entries(data).forEach(([id, order]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = rowHTML(id, order || {});
      rows.push([order.timestamp || 0, tr]);
    });

    rows.sort((a,b)=>(new Date(b[0]).getTime())-(new Date(a[0]).getTime()));
    rows.forEach(([,tr]) => ordersBody.appendChild(tr));

    ordersStatus.textContent = rows.length ?
      `Loaded ${rows.length} order(s).` : "No orders yet.";

    window.__applyOrderFilters?.();
  });

  ordersListenerAttached = true;
}

/* Delegated event for order status + delete */
document.addEventListener("click", async (e)=>{
  const setBtn = e.target.closest("[data-set-status]");
  const delBtn = e.target.closest("[data-delete-id]");

  if (setBtn){
    const id = setBtn.dataset.id;
    const next = setBtn.dataset["setStatus"];
    try{
      await firebase.database().ref(`orders/${id}`).update({
        status: next,
        adminUpdatedAt: new Date().toISOString()
      });
      const cell = setBtn.closest("tr")?.querySelector('[data-col="status"]');
      if (cell){
        const cls = {pending:"status pending", shipped:"status shipped", completed:"status completed"}[next];
        cell.dataset.status = next;
        cell.innerHTML = `<span class="${cls}">${next[0].toUpperCase()+next.slice(1)}</span>`;
      }
    }catch(err){
      alert("Failed to update status: " + err.message);
    }
  }

  if (delBtn){
    const id = delBtn.dataset["deleteId"];
    if (!confirm("Delete this order?")) return;
    try{
      await firebase.database().ref(`orders/${id}`).remove();
      delBtn.closest("tr")?.remove();
    }catch(err){
      alert("Failed to delete: " + err.message);
    }
  }
});

/* ---------- Site Settings ---------- */
const site = {
  heroTitle: $("site-heroTitle"),
  heroSubtitle: $("site-heroSubtitle"),
  featuredCategory: $("site-featuredCategory"),
  showFeatured: $("site-showFeatured"),
  banner: $("site-banner"),
  bannerPreview: $("site-banner-preview"),
  gallery: $("site-gallery"),
  galleryPreview: $("site-gallery-preview"),
  saveBtn: $("site-save"),
  reloadBtn: $("site-reload"),
  status: $("site-status")
};

const siteDocRef = db.collection("site").doc("home");

async function loadSite(){
  try{
    site.status.textContent = "Loading…";
    const snap = await siteDocRef.get();
    const data = snap.data() || {};

    site.heroTitle.value = data.heroTitle || "";
    site.heroSubtitle.value = data.heroSubtitle || "";
    site.featuredCategory.value = data.featuredCategory || "perfume";
    site.showFeatured.checked = !!data.showFeatured;

    site.bannerPreview.innerHTML = data.bannerImage ?
      `<img src="${data.bannerImage}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ccc">`
      : "";

    site.galleryPreview.innerHTML = Array.isArray(data.gallery)
      ? data.gallery.map(u=>`<img src="${u}" style="width:86px;height:86px;border-radius:8px;border:1px solid #ccc">`).join("")
      : "";

    site.status.textContent = "Ready.";
  }catch(e){
    site.status.textContent = "Error loading site settings.";
  }
}

site.reloadBtn?.addEventListener("click", loadSite);

site.saveBtn?.addEventListener("click", async ()=>{
  try{
    site.status.textContent = "Saving…";

    let bannerUrl = "";
    let galleryUrls = [];

    if (site.banner.files.length){
      // ✅ CHANGED: Cloudinary -> Firebase Storage
      bannerUrl = await uploadToFirebase(site.banner.files[0], "site/banner");
    }

    if (site.gallery.files.length){
      // ✅ CHANGED: Cloudinary -> Firebase Storage
      const uploads = [...site.gallery.files].map(f=>uploadToFirebase(f, "site/gallery"));
      galleryUrls = await Promise.all(uploads);
    }

    const data = {
      heroTitle: site.heroTitle.value.trim(),
      heroSubtitle: site.heroSubtitle.value.trim(),
      featuredCategory: site.featuredCategory.value.trim(),
      showFeatured: site.showFeatured.checked
    };

    if (bannerUrl) data.bannerImage = bannerUrl;
    if (galleryUrls.length) data.gallery = galleryUrls;

    await siteDocRef.set(data,{merge:true});
    site.status.textContent = "Saved ✓";
    loadSite();
  }catch(e){
    site.status.textContent = "Save failed: " + e.message;
  }
});

/* ---------- Products (Firestore) ---------- */
const nameEl        = $("name");
const priceEl       = $("price");
const discountPriceEl = $("discountPrice");  // ⭐ NEW
const brandEl       = $("brand");
const sizesEl       = $("sizes");
const descEl        = $("description");
const categoryEl    = $("category");
const activeEl      = $("active");
const imagesEl      = $("images");

const tableBody     = $("tableBody");
const filterCategory= $("filterCategory");
const refreshBtn    = $("refreshBtn");
const resetBtn      = $("resetBtn");
const saveBtn       = $("saveBtn");
const docIdEl       = $("docId");

function resetForm(){
  docIdEl.value = "";
  nameEl.value = "";
  priceEl.value = "";
  discountPriceEl.value = "";      // ⭐ NEW
  brandEl.value = "";
  sizesEl.value = "";
  descEl.value = "";
  categoryEl.value = "perfume";
  activeEl.checked = true;
  imagesEl.value = "";
}

resetBtn?.addEventListener("click", resetForm);

function normalizeCategory(raw){
  const v = (raw||"").toLowerCase().trim();
  return v === "jewelry" ? "jewellery" : v;
}

async function loadProducts(){
  tableBody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;

  const cat = normalizeCategory(filterCategory.value);

  let snap;
  if (cat === "all") snap = await db.collection("products").get();
  else snap = await db.collection("products").where("category","==",cat).get();

  tableBody.innerHTML = "";

  if (snap.empty){
    tableBody.innerHTML = `<tr><td colspan="7">No products found</td></tr>`;
    return;
  }

  snap.forEach(doc=>{
    const p = doc.data();
    const img = p.imageURL || (p.images?.[0] || "");

    const isOut = (p.stockStatus || "").toLowerCase() === "out";

    const tr = document.createElement("tr");
    tr.style.opacity = isOut ? "0.5" : "1";

    tr.innerHTML = `
      <td>${img?`<img src="${img}" width="60" height="60" style="object-fit:cover;border-radius:6px">`:""}</td>
      <td>${esc(p.name)}<div class="muted">${esc(p.brand||"")}</div></td>
      <td>${renderSizes(p.sizes)}</td>
      <td>Rs${Number(p.basePrice||0).toFixed(2)}</td>
      <td>${p.discountPrice ? `Rs${p.discountPrice}` : "-"}</td>   <!-- ⭐ NEW -->
      <td>${p.active?"Yes":"No"}</td>
      <td>
        <button class="btn edit" data-id="${doc.id}">Edit</button>
        <button class="btn danger delete" data-id="${doc.id}">Delete</button>
        <button class="btn stock" data-id="${doc.id}" data-status="${isOut?"out":"in"}">
          ${isOut?"Set In Stock":"Set Out of Stock"}
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  /* Edit */
  $$(".edit").forEach(btn=>btn.addEventListener("click", async ()=>{
    const snap = await db.collection("products").doc(btn.dataset.id).get();
    if (!snap.exists) return;
    const p = snap.data();

    docIdEl.value = snap.id;
    nameEl.value = p.name || "";
    priceEl.value = p.basePrice || "";
    discountPriceEl.value = p.discountPrice || "";   // ⭐ NEW
    brandEl.value = p.brand || "";
    descEl.value = p.description || "";
    sizesEl.value = (p.sizes||[]).map(s=>`${s.label} | ${s.price}`).join("\n");
    categoryEl.value = normalizeCategory(p.category);
    activeEl.checked = !!p.active;

    window.scrollTo({top:0,behavior:"smooth"});
  }));

  /* Delete */
  $$(".delete").forEach(btn=>btn.addEventListener("click", async ()=>{
    if (!confirm("Delete this product?")) return;
    await db.collection("products").doc(btn.dataset.id).delete();
    loadProducts();
  }));

  /* Stock toggle */
  $$(".stock").forEach(btn=>btn.addEventListener("click", async ()=>{
    const id = btn.dataset.id;
    const next = btn.dataset.status === "out" ? "in" : "out";
    await db.collection("products").doc(id).set({stockStatus:next},{merge:true});
    alert("Updated.");
    loadProducts();
  }));
}

refreshBtn?.addEventListener("click", loadProducts);
filterCategory?.addEventListener("change", loadProducts);

/* SAVE PRODUCT */
saveBtn?.addEventListener("click", async ()=>{
  try{
    const id = docIdEl.value || db.collection("products").doc().id;
    const sizes = parseSizes(sizesEl.value);

    const data = {
      name: nameEl.value.trim(),
      basePrice: Number(priceEl.value),
      discountPrice: discountPriceEl.value ? Number(discountPriceEl.value) : null,   // ⭐ NEW
      brand: brandEl.value.trim(),
      sizes,
      description: descEl.value.trim(),
      category: normalizeCategory(categoryEl.value),
      active: activeEl.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!docIdEl.value){
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    if (imagesEl.files.length){
      // ✅ CHANGED: Cloudinary -> Firebase Storage
      const uploads = [...imagesEl.files].map(f=>uploadToFirebase(f, "products"));
      const urls = await Promise.all(uploads);
      data.images = urls;
      data.imageURL = urls[0];
    }

    await db.collection("products").doc(id).set(data,{merge:true});
    alert("Saved ✓");
    resetForm();
    loadProducts();
  }catch(e){
    alert("Save failed: " + e.message);
  }
});

/* ---------- Auth state ---------- */
auth.onAuthStateChanged(user=>{
  const logged = !!user;
  logged ? hide(loginBtn) : show(loginBtn);
  logged ? show(logoutBtn) : hide(logoutBtn);

  if (!logged){
    authStatus.textContent = "Please sign in.";
  } else if (canSeeAdmin(user)){
    authStatus.textContent = `Signed in as ${user.email}`;
  } else {
    authStatus.textContent = "Access denied.";
  }

  const allowed = logged && canSeeAdmin(user);

  allowed ? show(btnSeeOrders) : hide(btnSeeOrders);

  if (allowed){
    dashboardWrap.style.display = "block";
    siteSection.style.display = "block";
    productSection.style.display = "block";
    listSection.style.display = "block";

    loadSite();
    loadProducts();
  } else {
    dashboardWrap.style.display = "none";
    siteSection.style.display = "none";
    productSection.style.display = "none";
    listSection.style.display = "none";
    hide(ordersSection);
    hide(btnBack);
  }
});
