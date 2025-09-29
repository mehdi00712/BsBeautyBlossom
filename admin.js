/* admin.js — login that works (Email & Google), allowlist, Products (Firestore), Orders (RTDB with PHONE column) */

if (!window.firebase) throw new Error("❌ Firebase SDK missing");
const auth = firebase.auth();
const db   = firebase.firestore();

/* ============ Only these UIDs get admin features ============ */
const ALLOWED_UIDS = [
  "nyQYzolZI2fLFqIkAPNHHbcSJ2p1",
  "w5jtigflSVezQwUvnsgM7AY4ZK73"
];

/* ---------------- helpers ---------------- */
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
function esc(v){ return String(v ?? "-").replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s])); }
function fmtMoney(v){ const n = Number(v); return isFinite(n)? `Rs${n.toFixed(2)}`:"-"; }
function fmtTime(t){ if(!t) return "-"; const d = new Date(t); return isNaN(d)? String(t): d.toLocaleString(); }
const canSeeAdmin = (user) => !!user && ALLOWED_UIDS.includes(user.uid);

/* ---------------- UI refs ---------------- */
const loginEmailBtn = $("loginEmailBtn");
const loginGoogleBtn= $("loginGoogleBtn");
const logoutBtn     = $("logoutBtn");
const authStatus    = $("auth-status");
const emailEl       = $("email");
const passEl        = $("password");
const authSection   = $("auth-section");

const dashboardWrap  = $("dashboard-sections");
const btnSeeOrders   = $("btnSeeOrders");
const btnBack        = $("btnBack");
const ordersSection  = $("orders-section");
const ordersStatus   = $("orders-status");
const ordersBody     = $("orders-body");

/* ---------------- Safer Auth Persistence ---------------- */
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(()=>{ /* ignore */ });

/* ---------------- Login flows ---------------- */
loginEmailBtn?.addEventListener("click", async () => {
  const email = (emailEl?.value || "").trim();
  const pass  = (passEl?.value  || "").trim();
  if (!email || !pass){
    alert("Enter email and password.");
    return;
  }
  try{
    await auth.signInWithEmailAndPassword(email, pass);
    authStatus && (authStatus.textContent = "✅ Logged in (Email)");
  }catch(e){
    const msg = e?.code === "auth/operation-not-allowed"
      ? "Email/Password sign-in is disabled in your Firebase project. Enable it in Authentication → Sign-in method."
      : e?.message || String(e);
    alert(msg);
    authStatus && (authStatus.textContent = "❌ " + msg);
  }
});

loginGoogleBtn?.addEventListener("click", async () => {
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (e) {
      // Popup blocked or not allowed → attempt redirect
      if (e?.code === "auth/popup-blocked" || e?.code === "auth/popup-closed-by-user") {
        await auth.signInWithRedirect(provider);
        return;
      }
      if (e?.code === "auth/operation-not-allowed") {
        alert("Google sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method → Google.");
      } else if (e?.code === "auth/unauthorized-domain") {
        alert("This domain is not authorized for OAuth. Add it under Authentication → Settings → Authorized domains.");
      } else {
        alert(e?.message || String(e));
      }
      throw e;
    }
    authStatus && (authStatus.textContent = "✅ Logged in (Google)");
  }catch(e){
    console.error(e);
    authStatus && (authStatus.textContent = "❌ Login failed");
  }
});

logoutBtn?.addEventListener("click", async ()=>{
  try{ await auth.signOut(); authStatus && (authStatus.textContent="Logged out"); }
  catch(e){ console.error(e); }
});

/* ---------------- Orders view toggle (guarded) ---------------- */
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

/* ---------------- Orders (Realtime DB) ---------------- */
let ordersListenerAttached = false;
function rowHTML(id, order){
  const itemsText = Array.isArray(order.items)
    ? order.items.map(i=>`${i.name||i.title||'item'} x${i.qty||i.quantity||1}`).join(", ")
    : (order.items && typeof order.items==="object"
        ? Object.values(order.items).map(i=>`${i.name||i.title||'item'} x${i.qty||i.quantity||1}`).join(", ")
        : String(order.items||""));
  const status = (order.status || "pending").toLowerCase();
  const cls = {pending:"status pending", shipped:"status shipped", completed:"status completed"}[status] || "status";
  return `
    <td data-col="id">${id}</td>
    <td data-col="name">${esc(order.name)}</td>
    <td data-col="email">${esc(order.email)}</td>
    <td data-col="phone">${esc(order.phone || "")}</td>
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
        <button class="btn sm" data-delete-id="${id}" style="border-color:#cc0000">Delete</button>
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
    const msg = err?.message || "Permission error or missing rules.";
    ordersStatus && (ordersStatus.textContent = msg);
  });
  ordersListenerAttached = true;
}

/* status + delete (delegated) */
document.addEventListener("click", async (e)=>{
  const setBtn = e.target.closest("[data-set-status]");
  const delBtn = e.target.closest("[data-delete-id]");
  if (setBtn){
    const id = setBtn.getAttribute("data-id");
    const next = setBtn.getAttribute("data-set-status");
    try{
      await firebase.database().ref(`orders/${id}`).update({ status: next, adminUpdatedAt: new Date().toISOString() });
      const cell = setBtn.closest("tr")?.querySelector('[data-col="status"]');
      if (cell) {
        const cls = {pending:"status pending", shipped:"status shipped", completed:"status completed"}[next] || "status";
        cell.dataset.status = next;
        cell.innerHTML = `<span class="${cls}">${next[0].toUpperCase()+next.slice(1)}</span>`;
      }
      window.__applyOrderFilters?.();
    }catch(err){ console.error(err); alert("Failed to update status: " + (err?.message || err)); }
    return;
  }
  if (delBtn){
    const id = delBtn.getAttribute("data-delete-id");
    if (!confirm("Delete this order? This cannot be undone.")) return;
    try{
      await firebase.database().ref(`orders/${id}`).remove();
      delBtn.closest("tr")?.remove();
    }catch(err){ console.error(err); alert("Failed to delete: " + (err?.message || err)); }
  }
});

/* ---------------- Site + Products (Firestore) ----------------
   Keep your existing site/product code here if you were using it.
   (Omitted to keep this file focused on the login fix and orders table.)
----------------------------------------------------------------*/

/* ---------------- Auth state: gate admin UI & See Orders ---------------- */
auth.onAuthStateChanged((user)=>{
  const loggedIn = !!user;

  // Toggle sections
  if (loggedIn && canSeeAdmin(user)) {
    hide($("auth-section"));
    show(logoutBtn);
    show(btnSeeOrders);
    if ($("dashboard-sections")) {
      $("dashboard-sections").style.display = "block";
    }
    authStatus && (authStatus.textContent = `Signed in as ${user.email || user.uid}`);
  } else {
    show($("auth-section"));
    hide(logoutBtn);
    hide(btnSeeOrders);
    hide(ordersSection);
    hide(btnBack);
    if ($("dashboard-sections")) {
      $("dashboard-sections").style.display = "none";
    }
    authStatus && (authStatus.textContent = loggedIn ? "Access denied for this account. Ask admin to add your UID." : "Please sign in.");
  }
});
