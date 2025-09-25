/* admin.js — login present, safe DOM guards, Cloudinary uploads, Firestore CRUD + Orders toggle */

if (!window.firebase) throw new Error("❌ Firebase SDK missing");
const auth = firebase.auth();
const db   = firebase.firestore();

/* ====================== Admin-only UIDs ====================== */
const ALLOWED = [
  "RhMAQ5ey7zYdRLwtr5fxjqVrfgN2",
  "uufregjJNyXeLfjZ9bb0Aj8kzSh1"
];

/* ====================== Tiny helpers ====================== */
const $  = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const elExists = (...els) => els.every(Boolean);
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

function esc(v){ return String(v ?? "-").replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s])); }
function fmtMoney(v){
  const n = Number(v);
  if (!isFinite(n)) return "-";
  try { return new Intl.NumberFormat(undefined, {style:"currency", currency:"MUR"}).format(n); }
  catch { return n.toFixed(2); }
}
function fmtTime(t){
  if (!t) return "-";
  const d = new Date(t);
  return isNaN(d) ? String(t) : d.toLocaleString();
}

/* ====================== Cloudinary upload ====================== */
const CLOUD_NAME    = window.CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET || "";

async function uploadToCloudinary(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary not configured (CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET).");
  }
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return data.secure_url;
}

/* ====================== Auth UI ====================== */
const loginBtn   = $("loginBtn");
const logoutBtn  = $("logoutBtn");
const authStatus = $("auth-status");
const emailEl    = $("email");
const passEl     = $("password");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      if (emailEl && passEl && emailEl.value && passEl.value) {
        await auth.signInWithEmailAndPassword(emailEl.value.trim(), passEl.value.trim());
      } else {
        // Fallback to Google popup if no email/pass provided
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
      }
      authStatus && (authStatus.textContent = "✅ Logged in");
    } catch (e) {
      authStatus && (authStatus.textContent = "❌ " + (e && e.message ? e.message : e));
    }
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    authStatus && (authStatus.textContent = "Logged out");
  });
}

/* ====================== Sections (may be missing) ====================== */
const siteSection    = $("site-section");
const productSection = $("product-section");
const listSection    = $("list-section");

/* ====================== Dashboard ↔ Orders toggle ====================== */
const dashboardWrap  = $("dashboard-sections");    // wrapper for all normal admin blocks
const ordersSection  = $("orders-section");        // orders-only container (table)
const ordersStatus   = $("orders-status");
const ordersBody     = $("orders-body");
const btnSeeOrders   = $("btnSeeOrders");
const btnBack        = $("btnBack");

// Attach handlers if present
if (btnSeeOrders) btnSeeOrders.addEventListener("click", () => {
  if (dashboardWrap) dashboardWrap.classList.add("hide");
  if (ordersSection) ordersSection.classList.remove("hide");
  if (btnBack) btnBack.classList.remove("hide");
  if (btnSeeOrders) btnSeeOrders.classList.add("hide");
  if (ordersStatus) ordersStatus.textContent = "Loading orders…";
  attachOrdersListener();
});
if (btnBack) btnBack.addEventListener("click", () => {
  if (ordersSection) ordersSection.classList.add("hide");
  if (dashboardWrap) dashboardWrap.classList.remove("hide");
  if (btnBack) btnBack.classList.add("hide");
  if (btnSeeOrders) btnSeeOrders.classList.remove("hide");
});

/* ====================== Orders listener (Realtime DB) ====================== */
let ordersListenerAttached = false;
function attachOrdersListener(){
  if (ordersListenerAttached) return;
  if (!firebase.database) {
    ordersStatus && (ordersStatus.textContent = "Realtime Database not available.");
    return;
  }
  const rtdb = firebase.database();
  const ref = rtdb.ref("orders").limitToLast(300);
  ref.on("value", (snap)=>{
    if (!ordersBody) return;
    ordersBody.innerHTML = "";
    const val = snap.val() || {};
    const rows = [];
    Object.entries(val).forEach(([id, order])=>{
      const itemsText = Array.isArray(order.items)
        ? order.items.map(i => `${i.name || i.title || 'item'} x${i.qty || i.quantity || 1}`).join(", ")
        : (order.items && typeof order.items === "object"
            ? Object.values(order.items).map(i => `${i.name || i.title || 'item'} x${i.qty || i.quantity || 1}`).join(", ")
            : String(order.items || ""));
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${id}</td>
        <td>${esc(order.name)}</td>
        <td>${esc(order.email)}</td>
        <td>${esc(itemsText)}</td>
        <td>${fmtMoney(order.total)}</td>
        <td>${esc(order.address)}</td>
        <td>${fmtTime(order.timestamp)}</td>
      `;
      rows.push([order.timestamp || 0, tr]);
    });
    rows.sort((a,b)=>(new Date(b[0]).getTime()||0)-(new Date(a[0]).getTime()||0));
    rows.forEach(([,tr])=>ordersBody.appendChild(tr));
    ordersStatus && (ordersStatus.textContent = rows.length ? `Loaded ${rows.length} order(s).` : "No orders yet.");
  }, (err)=>{
    console.error(err);
    ordersStatus && (ordersStatus.textContent = "Permission error or missing rules.");
  });
  ordersListenerAttached = true;
}

/* ====================== Site Settings block ====================== */
const site = {
  heroTitle: $("site-heroTitle"),
  heroSubtitle: $("site-heroSubtitle"),
  featuredCategory: $("site-featuredCategory"),
  showFeatured: $("site-showFeatured"),
  wa: $("site-wa"),
  ig: $("site-ig"),
  tt: $("site-tt"),
  banner: $("site-banner"),
  bannerPreview: $("site-banner-preview"),
  gallery: $("site-gallery"),
  galleryPreview: $("site-gallery-preview"),
  saveBtn: $("site-save"),
  reloadBtn: $("site-reload"),
  status: $("site-status"),
};
const siteDocRef = db.collection("site").doc("home");

async function loadSite() {
  if (!elExists(site.heroTitle, site.heroSubtitle, site.featuredCategory, site.showFeatured)) {
    console.warn("Site Settings elements not found — skipping loadSite()");
    return;
  }
  try {
    if (site.status) site.status.textContent = "Loading…";
    const snap = await siteDocRef.get();
    const data = snap.exists ? snap.data() : {};

    site.heroTitle.value       = data.heroTitle || "";
    site.heroSubtitle.value    = data.heroSubtitle || "";
    site.featuredCategory.value= (data.featuredCategory || "perfume").toLowerCase();
    site.showFeatured.checked  = !!data.showFeatured;

    if (site.wa) site.wa.value = data.whatsapp  || "https://wa.me/23058195560";
    if (site.ig) site.ig.value = data.instagram || "https://www.instagram.com/yourusername";
    if (site.tt) site.tt.value = data.tiktok    || "https://www.tiktok.com/@yourusername";

    if (site.bannerPreview) {
      site.bannerPreview.innerHTML = data.bannerImage
        ? `<img src="${data.bannerImage}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`
        : "";
    }
    if (site.galleryPreview) {
      site.galleryPreview.innerHTML = Array.isArray(data.gallery)
        ? data.gallery
            .map((u) => `<img src="${u}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`)
            .join("")
        : "";
    }
    if (site.status) site.status.textContent = "Ready.";
  } catch (e) {
    console.error(e);
    if (site.status) site.status.textContent = "Error loading site settings.";
  }
}

if (site.reloadBtn) site.reloadBtn.addEventListener("click", loadSite);

if (site.saveBtn) {
  site.saveBtn.addEventListener("click", async () => {
    try {
      if (site.status) site.status.textContent = "Saving…";

      let bannerURL;
      if (site.banner && site.banner.files && site.banner.files[0]) {
        bannerURL = await uploadToCloudinary(site.banner.files[0]);
      }

      let galleryURLs = null;
      if (site.gallery && site.gallery.files && site.gallery.files.length) {
        const uploads = [];
        for (const f of site.gallery.files) uploads.push(uploadToCloudinary(f));
        galleryURLs = await Promise.all(uploads);
      }

      const payload = {};
      if (site.heroTitle)       payload.heroTitle = site.heroTitle.value.trim();
      if (site.heroSubtitle)    payload.heroSubtitle = site.heroSubtitle.value.trim();
      if (site.featuredCategory)payload.featuredCategory = site.featuredCategory.value;
      if (site.showFeatured)    payload.showFeatured = !!site.showFeatured.checked;
      if (site.wa)              payload.whatsapp = site.wa.value.trim();
      if (site.ig)              payload.instagram = site.ig.value.trim();
      if (site.tt)              payload.tiktok = site.tt.value.trim();

      payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      if (bannerURL)  payload.bannerImage = bannerURL;
      if (galleryURLs)payload.gallery = galleryURLs;

      await siteDocRef.set(payload, { merge: true });
      if (site.status) site.status.textContent = "Saved ✓";
      await loadSite();
    } catch (e) {
      console.error(e);
      if (site.status) site.status.textContent = "Error saving site settings.";
      alert("Error: " + e.message);
    }
  });
}

/* ====================== Products block ====================== */
const nameEl   = $("name");
const priceEl  = $("price");
const brandEl  = $("brand");
const sizesEl  = $("sizes");
const descEl   = $("description");
const categoryEl = $("category");
const activeEl = $("active");
const imagesEl = $("images");

const tableBody      = $("tableBody");
const filterCategory = $("filterCategory");
const refreshBtn     = $("refreshBtn");
const resetBtn       = $("resetBtn");
const saveBtn        = $("saveBtn");
const docIdEl        = $("docId");

function resetForm() {
  if (docIdEl) docIdEl.value = "";
  if (nameEl)  nameEl.value = "";
  if (priceEl) priceEl.value = "";
  if (brandEl) brandEl.value = "";
  if (sizesEl) sizesEl.value = "";
  if (descEl)  descEl.value = "";
  if (categoryEl) categoryEl.value = "perfume";
  if (activeEl) activeEl.checked = true;
  if (imagesEl) imagesEl.value = "";
}
if (resetBtn) resetBtn.addEventListener("click", resetForm);

async function loadProducts() {
  if (!tableBody || !filterCategory) {
    console.warn("Product list elements not found — skipping loadProducts()");
    return;
  }
  tableBody.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";
  try {
    const snap = await db.collection("products")
      .where("category", "==", filterCategory.value)
      .get();

    if (snap.empty) {
      tableBody.innerHTML = "<tr><td colspan='6'>No products</td></tr>";
      return;
    }
    tableBody.innerHTML = "";
    snap.forEach((doc) => {
      const p = doc.data() || {};
      const img = p.imageURL || (Array.isArray(p.images) && p.images[0]) || "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${img ? `<img src="${img}" width="60" height="60" style="object-fit:cover;border-radius:6px;border:1px solid #e5e5e5">` : ""}</td>
        <td>${p.name || ""}${p.brand ? `<div class="muted">${p.brand}</div>` : ""}</td>
        <td>${renderSizes(p.sizes)}</td>
        <td>Rs${Number(p.basePrice || 0).toFixed(2)}</td>
        <td>${p.active ? "Yes" : "No"}</td>
        <td>
          <button class="btn edit" data-id="${doc.id}">Edit</button>
          <button class="btn danger delete" data-id="${doc.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    $$(".edit").forEach((b) =>
      b.addEventListener("click", async () => {
        const d = await db.collection("products").doc(b.dataset.id).get();
        if (!d.exists) return;
        const p = d.data() || {};
        if (docIdEl) docIdEl.value = d.id;
        if (nameEl)  nameEl.value = p.name || "";
        if (priceEl) priceEl.value = p.basePrice || 0;
        if (brandEl) brandEl.value = p.brand || "";
        if (sizesEl) sizesEl.value = (p.sizes || []).map((s) => `${s.label} | ${s.price}`).join("\n");
        if (descEl)  descEl.value = p.description || "";
        if (categoryEl) categoryEl.value = p.category || "perfume";
        if (activeEl) activeEl.checked = !!p.active;
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
    );
    $$(".delete").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Delete this product?")) return;
        await db.collection("products").doc(b.dataset.id).delete();
        loadProducts();
      })
    );
  } catch (e) {
    console.error(e);
    tableBody.innerHTML = "<tr><td colspan='6'>Error loading products</td></tr>";
  }
}

if (refreshBtn) refreshBtn.addEventListener("click", loadProducts);
if (filterCategory) filterCategory.addEventListener("change", loadProducts);

if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    try {
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

      if (imagesEl && imagesEl.files && imagesEl.files.length) {
        const uploads = [];
        for (const f of imagesEl.files) uploads.push(uploadToCloudinary(f));
        const urls = await Promise.all(uploads);
        data.images = urls;
        if (!data.imageURL && urls[0]) data.imageURL = urls[0];
      }

      await db.collection("products").doc(id).set(data, { merge: true });
      alert("Saved ✓");
      resetForm();
      await loadProducts();
    } catch (e) {
      console.error(e);
      alert("Save failed: " + (e && e.message ? e.message : e));
    }
  });
}

/* ====================== Auth gate (show/hide UI & protect page) ====================== */
auth.onAuthStateChanged((user) => {
  const loggedIn = !!user;
  if (loginBtn)  loginBtn.style.display  = loggedIn ? "none" : "inline-block";
  if (logoutBtn) logoutBtn.style.display = loggedIn ? "inline-block" : "none";

  // Restrict to admins
  if (loggedIn && !ALLOWED.includes(user.uid)) {
    alert("Access denied for this account.");
    window.location.href = "index.html";
    return;
  }

  // Show dashboard sections only for logged-in admins
  const canSeeAdmin = loggedIn && ALLOWED.includes(user?.uid || "");
  if (siteSection)    siteSection.style.display    = canSeeAdmin ? "block" : "none";
  if (productSection) productSection.style.display = canSeeAdmin ? "block" : "none";
  if (listSection)    listSection.style.display    = canSeeAdmin ? "block" : "none";

  if (authStatus) authStatus.textContent = loggedIn
    ? `Signed in as ${user.email || user.uid}`
    : "Please sign in.";

  // Only load data when logged-in admin (to match rules)
  if (canSeeAdmin) {
    loadSite();
    loadProducts();
  }
});
