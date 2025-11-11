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
  if (!canSeeAdmin(u)) return; // safety
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
  const total = (order.total != null) ? order.total : order.totalAmount; // compatibility
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
  if (!firebase.database) { ordersStatus && (ordersStatus.textContent="Realtime Database not available."); return; }
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
    window.__applyOrderFilters?.();
  }, (err)=>{
    console.error(err);
    ordersStatus && (ordersStatus.textContent = "Permission error or missing rules.");
  });
  ordersListenerAttached = true;
}

/* ---------- Products (Firestore) ---------- */
const nameEl=$("name"), priceEl=$("price"), brandEl=$("brand"), sizesEl=$("sizes"), descEl=$("description"),
      categoryEl=$("category"), activeEl=$("active"), imagesEl=$("images");
const tableBody=$("tableBody"), filterCategory=$("filterCategory"), refreshBtn=$("refreshBtn"),
      resetBtn=$("resetBtn"), saveBtn=$("saveBtn"), docIdEl=$("docId");

function resetForm(){ if(docIdEl)docIdEl.value=""; if(nameEl)nameEl.value=""; if(priceEl)priceEl.value=""; if(brandEl)brandEl.value=""; if(sizesEl)sizesEl.value=""; if(descEl)descEl.value=""; if(categoryEl)categoryEl.value="perfume"; if(activeEl)activeEl.checked=true; if(imagesEl)imagesEl.value=""; }
resetBtn?.addEventListener("click", resetForm);

function normalizeCategory(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "jewelry") return "jewellery";
  return v;
}

async function loadProducts(){
  if(!tableBody || !filterCategory){
    console.warn("⚠ loadProducts: tableBody or filterCategory missing");
    return;
  }
  const requested = normalizeCategory(filterCategory.value || "all");
  tableBody.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";

  try{
    let snap;
    if (requested === "all") {
      snap = await db.collection("products").get();
    } else {
      snap = await db.collection("products").where("category","==",requested).get();
      if (snap.empty) {
        const all = await db.collection("products").get();
        const docs = all.docs.filter(d => normalizeCategory(d.data().category) === requested);
        snap = { empty: docs.length === 0, docs, forEach: (fn)=>docs.forEach(fn) };
      }
    }

    if (snap.empty){
      tableBody.innerHTML = `<tr><td colspan="6">No products found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = "";
    snap.forEach((doc)=>{
      const p = doc.data() || {};
      const img = p.imageURL || (Array.isArray(p.images) && p.images[0]) || "";
      // 🔹 consider both stockStatus and numeric stock so your front-end picks it up
      const isOut = (p.stockStatus === "out") || (typeof p.stock === "number" && p.stock <= 0);
      const tr = document.createElement("tr");
      tr.style.opacity = isOut ? "0.5" : "1"; // 🔹 pale row if out
      tr.innerHTML = `
        <td>${img?`<img src="${img}" width="60" height="60" style="object-fit:cover;border-radius:6px;border:1px solid #e5e5e5">`:""}</td>
        <td>${esc(p.name||"")}${p.brand?`<div class="muted">${esc(p.brand)}</div>`:""}${isOut?`<div style="color:#b91c1c;font-weight:700">Out of Stock</div>`:""}</td>
        <td>${renderSizes(p.sizes)}</td>
        <td>Rs${Number(p.basePrice||0).toFixed(2)}</td>
        <td>${p.active?"Yes":"No"}</td>
        <td>
          <button class="btn edit" data-id="${doc.id}">Edit</button>
          <button class="btn danger delete" data-id="${doc.id}">Delete</button>
          <button class="btn stock" data-id="${doc.id}" data-status="${isOut?"out":"in"}">${isOut?"Set In Stock":"Set Out of Stock"}</button>
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
      if (categoryEl) categoryEl.value = normalizeCategory(p.category || "perfume");
      if (activeEl) activeEl.checked = !!p.active;
      window.scrollTo({top:0,behavior:"smooth"});
    }));
    $$(".delete").forEach((b)=>b.addEventListener("click", async ()=>{
      if(!confirm("Delete this product?")) return;
      await db.collection("products").doc(b.dataset.id).delete();
      loadProducts();
    }));

    // 🔹 Stock toggle logic (minimal, non-destructive)
    $$(".stock").forEach((btn) => btn.addEventListener("click", async ()=>{
      const id = btn.dataset.id;
      const current = btn.dataset.status; // "out" | "in"
      const newStatus = current === "out" ? "in" : "out";
      try {
        // also set a numeric stock so category/product pages that check "stock" behave correctly
        const updates = {
          stockStatus: newStatus,
          stock: newStatus === "out" ? 0 : 1,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection("products").doc(id).set(updates, { merge: true });
        alert(`Product marked as ${newStatus === "out" ? "OUT OF STOCK" : "IN STOCK"}`);
        loadProducts();
      } catch (err) {
        console.error(err);
        alert("Failed to update stock status: " + (err?.message || err));
      }
    }));

  }catch(e){
    console.error("❌ loadProducts error:", e);
    tableBody.innerHTML = `<tr><td colspan="6">Error loading products: ${esc(e?.message || e)}</td></tr>`;
  }
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
      category: normalizeCategory(categoryEl && categoryEl.value || "perfume"),
      active: !!(activeEl && activeEl.checked),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (!docIdEl || !docIdEl.value) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    if (imagesEl?.files?.length){
      const uploads = [];
      for (const f of imagesEl.files) uploads.push(uploadToCloudinary(f));
      const urls = await Promise.all(uploads);
      data.images = urls;
      if (!data.imageURL && urls[0]) data.imageURL = urls[0];
    }
    await db.collection("products").doc(id).set(data,{merge:true});
    alert("Saved ✓"); resetForm(); await loadProducts();
  }catch(e){ console.error(e); alert("Save failed: " + (e?.message || e)); }
});

/* ---------- Auth state ---------- */
auth.onAuthStateChanged((user)=>{
  const loggedIn = !!user;
  loggedIn ? hide(loginBtn) : show(loginBtn);
  loggedIn ? show(logoutBtn) : hide(logoutBtn);
  if (authStatus) {
    if (!loggedIn) authStatus.textContent = "Please sign in.";
    else if (canSeeAdmin(user)) authStatus.textContent = `Signed in as ${user.email || user.uid}`;
    else authStatus.textContent = "Access denied for this account.";
  }
  const allowed = loggedIn && canSeeAdmin(user);
  allowed ? show(btnSeeOrders) : hide(btnSeeOrders);
  if (allowed) {
    if (dashboardWrap) dashboardWrap.style.display = "block";
    if (siteSection) siteSection.style.display = "block";
    if (productSection) productSection.style.display = "block";
    if (listSection) listSection.style.display = "block";
    loadSite();
    loadProducts();
  } else {
    if (dashboardWrap) dashboardWrap.style.display = "none";
    if (siteSection) siteSection.style.display = "none";
    if (productSection) productSection.style.display = "none";
    if (listSection) listSection.style.display = "none";
    hide(ordersSection);
    hide(btnBack);
  }
});
