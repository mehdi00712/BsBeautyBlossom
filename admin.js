/* admin.js — Auth, Site & Products (Firestore), Orders (Realtime DB) */

if (!window.firebase) throw new Error("❌ Firebase SDK missing");
const auth = firebase.auth();
const db   = firebase.firestore();

/* ---------- Helpers ---------- */
const $  = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const toNumber = (v) => (v === "" || v == null ? 0 : Number(v));
const parseSizes = (t) =>
  String(t || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, p] = l.split("|").map((x) => (x || "").trim());
      return { label, price: Number(p || 0) };
    });
const renderSizes = (arr) =>
  (arr || []).map((s) => `${s.label} (Rs${isFinite(s.price) ? s.price : 0})`).join(", ");
function esc(v){ return String(v ?? "-").replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&gt;","&quot;":"&quot;","'":"&#39;"}[s])); }
function fmtMoney(v){ const n = Number(v); return isFinite(n) ? (new Intl.NumberFormat(undefined,{style:"currency",currency:"MUR"}).format(n)) : "-"; }
function fmtTime(t){ if(!t) return "-"; const d = new Date(t); return isNaN(d) ? String(t) : d.toLocaleString(); }

/* ---------- Cloudinary ---------- */
const CLOUD_NAME    = window.CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET || "";
async function uploadToCloudinary(file){
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error("Cloudinary not configured.");
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(url, {method:"POST", body:fd});
  if (!res.ok) throw new Error("Cloudinary upload failed");
  return (await res.json()).secure_url;
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

/* ---------- Auth buttons ---------- */
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

/* ---------- Toggle Orders-only view ---------- */
btnSeeOrders?.addEventListener("click", () => {
  dashboardWrap?.classList.add("hide");
  ordersSection?.classList.remove("hide");
  btnBack?.classList.remove("hide");
  btnSeeOrders?.classList.add("hide");
  ordersStatus && (ordersStatus.textContent = "Loading orders…");
  attachOrdersListener();
});
btnBack?.addEventListener("click", () => {
  ordersSection?.classList.add("hide");
  dashboardWrap?.classList.remove("hide");
  btnBack?.classList.add("hide");
  btnSeeOrders?.classList.remove("hide");
});

/* ---------- Orders (Realtime DB) ---------- */
let ordersListenerAttached = false;
function renderOrderRow(id, order){
  const itemsText = Array.isArray(order.items)
    ? order.items.map(i=>`${i.name||i.title||'item'} x${i.qty||i.quantity||1}`).join(", ")
    : (order.items && typeof order.items==="object"
      ? Object.values(order.items).map(i=>`${i.name||i.title||'item'} x${i.qty||i.quantity||1}`).join(", ")
      : String(order.items||""));
  const status = (order.status || "pending").toLowerCase();
  const cls = {pending:"status pending", shipped:"status shipped", completed:"status completed"}[status] || "status";
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td data-col="id">${id}</td>
    <td data-col="name">${esc(order.name)}</td>
    <td data-col="email">${esc(order.email)}</td>
    <td data-col="items">${esc(itemsText)}</td>
    <td data-col="total">${fmtMoney(order.total)}</td>
    <td data-col="address">${esc(order.address)}</td>
    <td data-col="time">${fmtTime(order.timestamp)}</td>
    <td data-col="status" data-status="${status}"><span class="${cls}">${status[0].toUpperCase()+status.slice(1)}</span></td>
    <td data-col="action">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn sm" data-set-status="pending"   data-id="${id}">Pending</button>
        <button class="btn sm" data-set-status="shipped"   data-id="${id}">Shipped</button>
        <button class="btn sm" data-set-status="completed" data-id="${id}">Completed</button>
      </div>
    </td>
  `;
  return tr;
}
function attachOrdersListener(){
  if (ordersListenerAttached) return;
  if (!firebase.database) { ordersStatus && (ordersStatus.textContent="Realtime Database not available."); return; }
  const rtdb = firebase.database();
  const ref = rtdb.ref("orders").limitToLast(500);
  ref.on("value", (snap)=>{
    if (!ordersBody) return;
    ordersBody.innerHTML = "";
    const val = snap.val() || {};
    const rows = [];
    Object.entries(val).forEach(([id, order])=> rows.push([order.timestamp || 0, renderOrderRow(id, order||{})]));
    rows.sort((a,b)=>(new Date(b[0]).getTime()||0)-(new Date(a[0]).getTime()||0));
    rows.forEach(([,tr])=>ordersBody.appendChild(tr));
    ordersStatus && (ordersStatus.textContent = rows.length ? `Loaded ${rows.length} order(s).` : "No orders yet.");
    window.__applyOrderFilters?.();
  }, (err)=>{
    console.error(err);
    ordersStatus && (ordersStatus.textContent = "Permission error or missing rules.");
  });
  ordersListenerAttached = true;
}
/* status buttons (delegated) */
document.addEventListener("click", async (e)=>{
  const b = e.target.closest("[data-set-status]");
  if (!b) return;
  const id = b.getAttribute("data-id");
  const next = b.getAttribute("data-set-status");
  try{
    await firebase.database().ref(`orders/${id}`).update({ status: next, adminUpdatedAt: new Date().toISOString() });
    const row = b.closest("tr");
    const cell = row?.querySelector('[data-col="status"]');
    if (cell) {
      cell.dataset.status = next;
      const cls = {pending:"status pending", shipped:"status shipped", completed:"status completed"}[next] || "status";
      cell.innerHTML = `<span class="${cls}">${next[0].toUpperCase()+next.slice(1)}</span>`;
    }
    window.__applyOrderFilters?.();
  }catch(err){ console.error(err); alert("Failed to update status: " + (err?.message || err)); }
});

/* ---------- Site Settings (Firestore) ---------- */
const site = {
  heroTitle: $("site-heroTitle"), heroSubtitle: $("site-heroSubtitle"),
  featuredCategory: $("site-featuredCategory"), showFeatured: $("site-showFeatured"),
  wa: $("site-wa"), ig: $("site-ig"), tt: $("site-tt"),
  banner: $("site-banner"), bannerPreview: $("site-banner-preview"),
  gallery: $("site-gallery"), galleryPreview: $("site-gallery-preview"),
  saveBtn: $("site-save"), reloadBtn: $("site-reload"), status: $("site-status"),
};
const siteDocRef = db.collection("site").doc("home");

async function loadSite(){
  if(!site.heroTitle || !site.heroSubtitle || !site.featuredCategory || !site.showFeatured) return;
  try{
    site.status && (site.status.textContent = "Loading…");
    const snap = await siteDocRef.get();
    const data = snap.exists ? snap.data() : {};
    site.heroTitle.value        = data.heroTitle || "";
    site.heroSubtitle.value     = data.heroSubtitle || "";
    site.featuredCategory.value = (data.featuredCategory || "perfume").toLowerCase();
    site.showFeatured.checked   = !!data.showFeatured;
    site.bannerPreview && (site.bannerPreview.innerHTML = data.bannerImage ? `<img src="${data.bannerImage}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">` : "");
    site.galleryPreview && (site.galleryPreview.innerHTML = Array.isArray(data.gallery) ? data.gallery.map(u=>`<img src="${u}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`).join("") : "");
    site.status && (site.status.textContent = "Ready.");
  }catch(e){ console.error(e); site.status && (site.status.textContent = "Error loading site settings."); }
}
site.reloadBtn?.addEventListener("click", loadSite);

site.saveBtn?.addEventListener("click", async ()=>{
  try{
    site.status && (site.status.textContent = "Saving…");
    let bannerURL;
    if (site.banner?.files?.[0]) bannerURL = await uploadToCloudinary(site.banner.files[0]);
    let galleryURLs = null;
    if (site.gallery?.files?.length) {
      const ups = []; for (const f of site.gallery.files) ups.push(uploadToCloudinary(f));
      galleryURLs = await Promise.all(ups);
    }
    const payload = {
      heroTitle: site.heroTitle?.value.trim() || "",
      heroSubtitle: site.heroSubtitle?.value.trim() || "",
      featuredCategory: site.featuredCategory?.value || "perfume",
      showFeatured: !!site.showFeatured?.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (bannerURL)  payload.bannerImage = bannerURL;
    if (galleryURLs)payload.gallery = galleryURLs;
    await siteDocRef.set(payload, {merge:true});
    site.status && (site.status.textContent = "Saved ✓");
    await loadSite();
  }catch(e){ console.error(e); site.status && (site.status.textContent="Error saving site settings."); alert("Error: "+(e?.message||e)); }
});

/* ---------- Products (Firestore) ---------- */
const nameEl=$("name"), priceEl=$("price"), brandEl=$("brand"), sizesEl=$("sizes"), descEl=$("description"),
      categoryEl=$("category"), activeEl=$("active"), imagesEl=$("images");
const tableBody=$("tableBody"), filterCategory=$("filterCategory"), refreshBtn=$("refreshBtn"),
      resetBtn=$("resetBtn"), saveBtn=$("saveBtn"), docIdEl=$("docId");

function resetForm(){ if(docIdEl)docIdEl.value=""; if(nameEl)nameEl.value=""; if(priceEl)priceEl.value=""; if(brandEl)brandEl.value=""; if(sizesEl)sizesEl.value=""; if(descEl)descEl.value=""; if(categoryEl)categoryEl.value="perfume"; if(activeEl)activeEl.checked=true; if(imagesEl)imagesEl.value=""; }
resetBtn?.addEventListener("click", resetForm);

async function loadProducts(){
  if(!tableBody || !filterCategory){ return; }
  tableBody.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";
  try{
    const snap = await db.collection("products").where("category","==",filterCategory.value).get();
    if (snap.empty){ tableBody.innerHTML = "<tr><td colspan='6'>No products</td></tr>"; return; }
    tableBody.innerHTML = "";
    snap.forEach((doc)=>{
      const p = doc.data() || {};
      const img = p.imageURL || (Array.isArray(p.images) && p.images[0]) || "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${img?`<img src="${img}" width="60" height="60" style="object-fit:cover;border-radius:6px;border:1px solid #e5e5e5">`:""}</td>
        <td>${p.name||""}${p.brand?`<div class="muted">${p.brand}</div>`:""}</td>
        <td>${renderSizes(p.sizes)}</td>
        <td>Rs${Number(p.basePrice||0).toFixed(2)}</td>
        <td>${p.active?"Yes":"No"}</td>
        <td>
          <button class="btn edit" data-id="${doc.id}">Edit</button>
          <button class="btn danger delete" data-id="${doc.id}">Delete</button>
        </td>`;
      tableBody.appendChild(tr);
    });

    $$(".edit").forEach((b)=>b.addEventListener("click", async ()=>{
      const d = await db.collection("products").doc(b.dataset.id).get();
      if (!d.exists) return;
      const p = d.data()||{};
      if (docIdEl) docIdEl.value = d.id;
      if (nameEl)  nameEl.value = p.name || "";
      if (priceEl) priceEl.value = p.basePrice || 0;
      if (brandEl) brandEl.value = p.brand || "";
      if (sizesEl) sizesEl.value = (p.sizes||[]).map(s=>`${s.label} | ${s.price}`).join("\n");
      if (descEl)  descEl.value = p.description || "";
      if (categoryEl) categoryEl.value = p.category || "perfume";
      if (activeEl) activeEl.checked = !!p.active;
      window.scrollTo({top:0,behavior:"smooth"});
    }));
    $$(".delete").forEach((b)=>b.addEventListener("click", async ()=>{
      if(!confirm("Delete this product?")) return;
      await db.collection("products").doc(b.dataset.id).delete();
      loadProducts();
    }));
  }catch(e){ console.error(e); tableBody.innerHTML = "<tr><td colspan='6'>Error loading products</td></tr>"; }
}
refreshBtn?.addEventListener("click", loadProducts);
filterCategory?.addEventListener("change", loadProducts);

saveBtn?.addEventListener("click", async ()=>{
  try{
    const id = (docIdEl && docIdEl.value) || db.collection("products").doc().id;
    const sizes = parseSizes(sizesEl ? sizesEl.value : "");
    const data = {
      name: (nameEl && nameEl.value.trim()) || "",
      basePrice: toNumber(priceEl ? priceEl.value : 0),
      brand: (brandEl && brandEl.value.trim()) || "",
      sizes,
      description: (descEl && descEl.value.trim()) || "",
      category: (categoryEl && categoryEl.value) || "perfume",
      active: !!(activeEl && activeEl.checked),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (!docIdEl || !docIdEl.value) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

    if (imagesEl?.files?.length){
      const uploads = []; for (const f of imagesEl.files) uploads.push(uploadToCloudinary(f));
      const urls = await Promise.all(uploads);
      data.images = urls; if (!data.imageURL && urls[0]) data.imageURL = urls[0];
    }
    await db.collection("products").doc(id).set(data,{merge:true});
    alert("Saved ✓"); resetForm(); await loadProducts();
  }catch(e){ console.error(e); alert("Save failed: " + (e?.message || e)); }
});

/* ---------- Auth state: show/hide UI ---------- */
auth.onAuthStateChanged((user)=>{
  const loggedIn = !!user;
  loginBtn && (loginBtn.style.display = loggedIn ? "none" : "inline-block");
  logoutBtn && (logoutBtn.style.display = loggedIn ? "inline-block" : "none");

  authStatus && (authStatus.textContent = loggedIn
    ? `Signed in as ${user.email || user.uid}`
    : "Please sign in.");

  if (loggedIn){
    dashboardWrap?.classList.remove("hide");
    loadSite();
    loadProducts();
  } else {
    dashboardWrap?.classList.add("hide");
    // also hide Orders view if it was open
    ordersSection?.classList.add("hide");
    btnBack?.classList.add("hide");
    btnSeeOrders?.classList.remove("hide");
  }
});
