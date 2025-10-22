/* admin.js — Auth, allowlist-gated admin UI, Products (Firestore), Orders (Realtime DB) */

if (!window.firebase) throw new Error("❌ Firebase SDK missing");
const auth = firebase.auth();
const db   = firebase.firestore();

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

/* ---------- Cloudflare R2 (replaces Cloudinary) ---------- */
const WORKER_UPLOAD_URL = "https://bbb-r2-uploader.mbhoyroo246.workers.dev";

async function uploadToR2(file, folder = "products") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const r = await fetch(WORKER_UPLOAD_URL, { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error(j.error || "Upload failed");
  return j.url;
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
    ? order.items.map(i=>`${i.name||i.title||'item'} x${i.qty||i.quantity||1}`).join(", ")
    : (order.items && typeof order.items==="object"
        ? Object.values(order.items).map(i=>`${i.name||i.title||'item'} x${i.qty||i.quantity||1}`).join(", ")
        : String(order.items||""));
  const status = (order.status || "pending").toLowerCase();
  const cls = {pending:"status pending", shipped:"status shipped", completed:"status completed"}[status] || "status";
  const phone = (order.phone || "").trim();
  const total = (order.total != null) ? order.total : order.totalAmount;
  return `
    <td data-col="id">${id}</td>
    <td data-col="name">${esc(order.name)}</td>
    <td data-col="email">${esc(order.email)}</td>
    <td data-col="phone">${esc(phone)}</td>
    <td data-col="items">${esc(itemsText)}</td>
    <td data-col="total">${fmtMoney(total)}</td>
    <td data-col="address">${esc(order.address)}</td>
    <td data-col="time">${fmtTime(order.timestamp)}</td>
    <td data-col="status" data-status="${status}"><span class="${cls}">${status[0].toUpperCase()+status.slice(1)}</span></td>
    <td data-col="action">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn sm" data-set-status="pending"   data-id="${id}">Pending</button>
        <button class="btn sm" data-set-status="shipped"   data-id="${id}">Shipped</button>
        <button class="btn sm" data-set-status="completed" data-id="${id}">Completed</button>
        <button class="btn sm danger" data-delete-id="${id}">Delete</button>
      </div>
    </td>`;
}
function attachOrdersListener(){
  if (ordersListenerAttached) return;
  const rtdb = firebase.database();
  const ref = rtdb.ref("orders").limitToLast(500);
  ref.on("value", (snap)=>{
    if (!ordersBody) return;
    ordersBody.innerHTML = "";
    const val = snap.val() || {};
    const rows = [];
    Object.entries(val).forEach(([id, order])=> {
      const tr = document.createElement("tr");
      tr.innerHTML = rowHTML(id, order || {});
      rows.push([order.timestamp||0, tr]);
    });
    rows.sort((a,b)=>(new Date(b[0]).getTime()||0)-(new Date(a[0]).getTime()||0));
    rows.forEach(([,tr])=>ordersBody.appendChild(tr));
    ordersStatus && (ordersStatus.textContent = rows.length ? `Loaded ${rows.length} order(s).` : "No orders yet.");
  });
  ordersListenerAttached = true;
}

/* ---------- Site Settings (Firestore) ---------- */
const site = {
  heroTitle: $("site-heroTitle"), heroSubtitle: $("site-heroSubtitle"),
  featuredCategory: $("site-featuredCategory"), showFeatured: $("site-showFeatured"),
  banner: $("site-banner"), bannerPreview: $("site-banner-preview"),
  gallery: $("site-gallery"), galleryPreview: $("site-gallery-preview"),
  saveBtn: $("site-save"), reloadBtn: $("site-reload"), status: $("site-status"),
};
const siteDocRef = db.collection("site").doc("home");

async function loadSite(){
  try{
    site.status.textContent = "Loading…";
    const snap = await siteDocRef.get();
    const data = snap.exists ? snap.data() : {};
    site.heroTitle.value = data.heroTitle || "";
    site.heroSubtitle.value = data.heroSubtitle || "";
    site.featuredCategory.value = (data.featuredCategory || "perfume").toLowerCase();
    site.showFeatured.checked = !!data.showFeatured;
    site.bannerPreview.innerHTML = data.bannerImage ? `<img src="${data.bannerImage}" width="120">` : "";
    site.galleryPreview.innerHTML = Array.isArray(data.gallery) ? data.gallery.map(u=>`<img src="${u}" width="86">`).join("") : "";
    site.status.textContent = "Ready.";
  }catch(e){ site.status.textContent = "Error loading site settings."; console.error(e); }
}
site.reloadBtn?.addEventListener("click", loadSite);

site.saveBtn?.addEventListener("click", async ()=>{
  try{
    site.status.textContent="Saving…";
    const data={
      heroTitle:site.heroTitle.value.trim(),
      heroSubtitle:site.heroSubtitle.value.trim(),
      featuredCategory:site.featuredCategory.value,
      showFeatured:site.showFeatured.checked
    };
    if(site.banner?.files?.length)
      data.bannerImage = await uploadToR2(site.banner.files[0],"banners");
    if(site.gallery?.files?.length)
      data.gallery = await Promise.all([...site.gallery.files].map(f=>uploadToR2(f,"gallery")));
    await siteDocRef.set(data,{merge:true});
    site.status.textContent="Saved ✓";
    loadSite();
  }catch(e){ site.status.textContent="Save failed: "+e.message; }
});

/* ---------- Products (Firestore) ---------- */
const nameEl=$("name"), priceEl=$("price"), brandEl=$("brand"), sizesEl=$("sizes"), descEl=$("description"),
      categoryEl=$("category"), activeEl=$("active"), imagesEl=$("images");
const tableBody=$("tableBody"), filterCategory=$("filterCategory"), refreshBtn=$("refreshBtn"),
      resetBtn=$("resetBtn"), saveBtn=$("saveBtn"), docIdEl=$("docId");

function resetForm(){ if(docIdEl)docIdEl.value=""; if(nameEl)nameEl.value=""; if(priceEl)priceEl.value=""; if(brandEl)brandEl.value=""; if(sizesEl)sizesEl.value=""; if(descEl)sizesEl.value=""; if(categoryEl)categoryEl.value="perfume"; if(activeEl)activeEl.checked=true; if(imagesEl)imagesEl.value=""; }
resetBtn?.addEventListener("click", resetForm);

function normalizeCategory(raw){ const v=String(raw||"").trim().toLowerCase(); if(v==="jewelry")return"jewellery"; return v; }

saveBtn?.addEventListener("click", async ()=>{
  try{
    const id=(docIdEl&&docIdEl.value)||db.collection("products").doc().id;
    const sizes=parseSizes(sizesEl? sizesEl.value:"");
    const data={
      name:(nameEl&&nameEl.value.trim())||"",
      basePrice:toNumber(priceEl?priceEl.value:0),
      brand:(brandEl&&brandEl.value.trim())||"",
      sizes,
      description:(descEl&&descEl.value.trim())||"",
      category:normalizeCategory(categoryEl&&categoryEl.value||"perfume"),
      active:!!(activeEl&&activeEl.checked),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    };
    if(!docIdEl||!docIdEl.value)data.createdAt=firebase.firestore.FieldValue.serverTimestamp();

    if(imagesEl?.files?.length){
      const uploads=[];for(const f of imagesEl.files)uploads.push(uploadToR2(f,"products"));
      const urls=await Promise.all(uploads);
      data.images=urls;if(!data.imageURL&&urls[0])data.imageURL=urls[0];
    }
    await db.collection("products").doc(id).set(data,{merge:true});
    alert("Saved ✓"); resetForm(); await loadProducts();
  }catch(e){ alert("Save failed: "+e.message); }
});

/* ---------- Auth state ---------- */
auth.onAuthStateChanged((user)=>{
  const loggedIn=!!user;
  loggedIn?hide(loginBtn):show(loginBtn);
  loggedIn?show(logoutBtn):hide(logoutBtn);
  if(!loggedIn)authStatus.textContent="Please sign in.";
  else if(canSeeAdmin(user))authStatus.textContent=`Signed in as ${user.email||user.uid}`;
  else authStatus.textContent="Access denied for this account.";
  const allowed=loggedIn&&canSeeAdmin(user);
  allowed?show(btnSeeOrders):hide(btnSeeOrders);
  if(allowed){
    dashboardWrap.style.display="block";
    siteSection.style.display="block";
    productSection.style.display="block";
    listSection.style.display="block";
    loadSite();
    loadProducts();
  }else{
    dashboardWrap.style.display="none";
    siteSection.style.display="none";
    productSection.style.display="none";
    listSection.style.display="none";
    hide(ordersSection); hide(btnBack);
  }
});
