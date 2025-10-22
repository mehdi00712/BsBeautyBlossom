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
function esc(v){ return String(v ?? "-").replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&lt;","&gt;":">","\"":"&quot;","'":"&#39;"}[s])); }
function fmtMoney(v){ const n = Number(v); return isFinite(n)? new Intl.NumberFormat(undefined,{style:"currency",currency:"MUR"}).format(n):"-"; }
function fmtTime(t){ if(!t) return "-"; const d = new Date(t); return isNaN(d)? String(t): d.toLocaleString(); }
const canSeeAdmin = (user) => !!user && ALLOWED_UIDS.includes(user.uid);

/* ---------- Cloudflare R2 ---------- */
const R2_BUCKET_URL = "https://pub-debe71c65e07451f9a413f6d91c86f9a.r2.dev/";

async function uploadToR2(file) {
  if (!file) throw new Error("No file selected");
  const fileName = encodeURIComponent(file.name.replace(/\s+/g, "_"));
  const uploadUrl = R2_BUCKET_URL + fileName;
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file
  });
  if (!res.ok) throw new Error("Failed to upload to R2: " + res.statusText);
  return uploadUrl;
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

/* ---------- Orders ---------- */
let ordersListenerAttached = false;
function rowHTML(id, order){
  const itemsText = Array.isArray(order.items)
    ? order.items.map(i=>`${i.name||i.title||'item'} x${i.qty||1}`).join(", ")
    : String(order.items||"");
  const status = (order.status || "pending").toLowerCase();
  const cls = {pending:"status pending", shipped:"status shipped", completed:"status completed"}[status] || "status";
  return `
    <td>${id}</td>
    <td>${esc(order.name)}</td>
    <td>${esc(order.email)}</td>
    <td>${esc(order.phone || "")}</td>
    <td>${esc(itemsText)}</td>
    <td>${fmtMoney(order.total || 0)}</td>
    <td>${esc(order.address)}</td>
    <td>${fmtTime(order.timestamp)}</td>
    <td><span class="${cls}">${status}</span></td>
    <td>
      <button class="btn sm" data-set-status="pending" data-id="${id}">Pending</button>
      <button class="btn sm" data-set-status="shipped" data-id="${id}">Shipped</button>
      <button class="btn sm" data-set-status="completed" data-id="${id}">Completed</button>
      <button class="btn sm danger" data-delete-id="${id}">Delete</button>
    </td>`;
}

function attachOrdersListener(){
  if (ordersListenerAttached) return;
  const rtdb = firebase.database();
  const ref = rtdb.ref("orders").limitToLast(500);
  ref.on("value",(snap)=>{
    if (!ordersBody) return;
    ordersBody.innerHTML="";
    const val=snap.val()||{};
    Object.entries(val).forEach(([id,order])=>{
      const tr=document.createElement("tr");
      tr.innerHTML=rowHTML(id,order);
      ordersBody.appendChild(tr);
    });
    ordersStatus.textContent="Loaded.";
  });
  ordersListenerAttached=true;
}

/* ---------- Site Settings ---------- */
const site = {
  heroTitle: $("site-heroTitle"), heroSubtitle: $("site-heroSubtitle"),
  featuredCategory: $("site-featuredCategory"), showFeatured: $("site-showFeatured"),
  banner: $("site-banner"), bannerPreview: $("site-banner-preview"),
  gallery: $("site-gallery"), galleryPreview: $("site-gallery-preview"),
  saveBtn: $("site-save"), reloadBtn: $("site-reload"), status: $("site-status"),
};
const siteDocRef = db.collection("site").doc("home");

async function loadSite(){
  try {
    const snap = await siteDocRef.get();
    const data = snap.exists ? snap.data() : {};
    site.heroTitle.value = data.heroTitle || "";
    site.heroSubtitle.value = data.heroSubtitle || "";
    site.featuredCategory.value = (data.featuredCategory || "perfume").toLowerCase();
    site.showFeatured.checked = !!data.showFeatured;
    site.bannerPreview.innerHTML = data.bannerImage ? `<img src="${data.bannerImage}" width="120">` : "";
    site.galleryPreview.innerHTML = (data.gallery || []).map(u=>`<img src="${u}" width="86">`).join("");
  } catch (e){ console.error(e); }
}
site.reloadBtn?.addEventListener("click", loadSite);

/* ---------- Products ---------- */
const nameEl=$("name"), priceEl=$("price"), brandEl=$("brand"), sizesEl=$("sizes"),
descEl=$("description"), categoryEl=$("category"), activeEl=$("active"), imagesEl=$("images");
const tableBody=$("tableBody"), filterCategory=$("filterCategory"), refreshBtn=$("refreshBtn"),
resetBtn=$("resetBtn"), saveBtn=$("saveBtn"), docIdEl=$("docId");

resetBtn?.addEventListener("click", ()=>{
  nameEl.value=priceEl.value=brandEl.value=descEl.value=sizesEl.value="";
  categoryEl.value="perfume"; activeEl.checked=true; imagesEl.value="";
  docIdEl.value="";
});

async function loadProducts(){
  const cat=(filterCategory.value||"all").toLowerCase();
  const snap=cat==="all"?await db.collection("products").get():
  await db.collection("products").where("category","==",cat).get();
  tableBody.innerHTML="";
  snap.forEach((d)=>{
    const p=d.data(); const img=p.imageURL||(p.images&&p.images[0])||"";
    const tr=document.createElement("tr");
    tr.innerHTML=`<td><img src="${img}" width="60"></td>
    <td>${esc(p.name)}<div class="muted">${esc(p.brand||"")}</div></td>
    <td>${renderSizes(p.sizes)}</td>
    <td>Rs${p.basePrice||0}</td>
    <td>${p.active?"Yes":"No"}</td>
    <td><button class="btn edit" data-id="${d.id}">Edit</button>
    <button class="btn danger delete" data-id="${d.id}">Delete</button></td>`;
    tableBody.appendChild(tr);
  });
}
refreshBtn?.addEventListener("click",loadProducts);
filterCategory?.addEventListener("change",loadProducts);

saveBtn?.addEventListener("click",async()=>{
  try{
    const id=docIdEl.value||db.collection("products").doc().id;
    const sizes=parseSizes(sizesEl.value);
    const data={
      name:nameEl.value.trim(),
      basePrice:toNumber(priceEl.value),
      brand:brandEl.value.trim(),
      sizes, description:descEl.value.trim(),
      category:categoryEl.value.toLowerCase(),
      active:activeEl.checked,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    };
    if(!docIdEl.value) data.createdAt=firebase.firestore.FieldValue.serverTimestamp();
    if(imagesEl.files.length){
      const urls=[];
      for(const f of imagesEl.files) urls.push(await uploadToR2(f));
      data.images=urls; data.imageURL=urls[0];
    }
    await db.collection("products").doc(id).set(data,{merge:true});
    alert("Saved ✓");
    loadProducts();
  }catch(e){console.error(e);alert("Save failed: "+e.message);}
});

/* ---------- Auth state ---------- */
auth.onAuthStateChanged((user)=>{
  const allowed=user&&ALLOWED_UIDS.includes(user.uid);
  if(allowed){
    show(dashboardWrap); loadSite(); loadProducts();
  }else{
    hide(dashboardWrap);
  }
});
