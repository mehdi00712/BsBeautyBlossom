/* admin.js — Auth, Admin UI, Products, Variants, Search, Pagination, Subcategories, Orders */

if (!window.firebase) throw new Error("❌ Firebase SDK missing");

const auth = firebase.auth();
const db = firebase.firestore();

const WORKER_UPLOAD_URL =
  window.WORKER_UPLOAD_URL ||
  "https://bbb-r2-uploader.mbhoyroo246.workers.dev/upload";

const ALLOWED_UIDS = [
  "nyQYzolZI2fLFqIkAPNHHbcSJ2p1",
  "w5jtigflSVezQwUvnsgM7AY4ZK73"
];

const $ = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const show = (el) => el && el.classList.remove("hide");
const hide = (el) => el && el.classList.add("hide");

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;

let ordersListenerAttached = false;
let allOrders = [];
let filteredOrders = [];
let currentOrderPage = 1;
const ORDERS_PER_PAGE = 10;

function esc(v) {
  return String(v ?? "-").replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[s]));
}

function fmtMoney(v) {
  const n = Number(v);
  return isFinite(n)
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "MUR"
      }).format(n)
    : "-";
}

function fmtTime(t) {
  if (!t) return "-";
  const d = new Date(t);
  return isNaN(d) ? String(t) : d.toLocaleString();
}

function normalizeCategory(raw) {
  const v = String(raw || "").toLowerCase().trim();
  return v === "jewelry" ? "jewellery" : v;
}

function normalizeSubcategory(raw) {
  return String(raw || "").trim();
}

function canSeeAdmin(user) {
  return !!user && ALLOWED_UIDS.includes(user.uid);
}

async function uploadToR2(file, folder = "products") {
  if (!file) throw new Error("No file selected.");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const res = await fetch(WORKER_UPLOAD_URL, {
    method: "POST",
    body: fd
  });

  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error("Cloudflare Worker did not return valid JSON.");
  }

  if (!res.ok || !data.ok || !data.url) {
    throw new Error(data.error || "Cloudflare R2 upload failed.");
  }

  return data.url;
}

function renderSizes(arr) {
  if (!Array.isArray(arr) || !arr.length) return "-";

  return arr
    .map(s => `${esc(s.label)} (Rs${Number(s.price || 0)})`)
    .join("<br>");
}

function getPaymentProofUrl(order) {
  return (
    order.paymentProofUrl ||
    order.payment?.proofUrl ||
    order.payment?.paymentProofUrl ||
    order.payment?.paymentProof ||
    order.proofUrl ||
    ""
  );
}

/* =========================
   UI refs
========================= */
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");
const authStatus = $("auth-status");
const emailEl = $("email");
const passEl = $("password");

const dashboardWrap = $("dashboard-sections");
const siteSection = $("site-section");
const productSection = $("product-section");
const listSection = $("list-section");

const btnSeeOrders = $("btnSeeOrders");
const btnBack = $("btnBack");
const ordersSection = $("orders-section");
const ordersStatus = $("orders-status");
const ordersBody = $("orders-body");

/* =========================
   Auth
========================= */
loginBtn?.addEventListener("click", async () => {
  try {
    if (emailEl?.value && passEl?.value) {
      await auth.signInWithEmailAndPassword(
        emailEl.value.trim(),
        passEl.value.trim()
      );
    } else {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    }

    if (authStatus) authStatus.textContent = "✅ Logged in";
  } catch (e) {
    if (authStatus) authStatus.textContent = "❌ " + (e?.message || e);
    console.error(e);
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await auth.signOut();
    if (authStatus) authStatus.textContent = "Logged out";
  } catch (e) {
    console.error(e);
  }
});

/* =========================
   Orders
========================= */
btnSeeOrders?.addEventListener("click", () => {
  const u = auth.currentUser;
  if (!canSeeAdmin(u)) return;

  hide(dashboardWrap);
  show(ordersSection);
  show(btnBack);
  hide(btnSeeOrders);

  if (ordersStatus) ordersStatus.textContent = "Loading orders…";
  attachOrdersListener();
});

btnBack?.addEventListener("click", () => {
  show(dashboardWrap);
  hide(ordersSection);
  hide(btnBack);
  show(btnSeeOrders);
});

function rowHTML(id, order) {
  const itemsText = Array.isArray(order.items)
    ? order.items
        .map(i => `${i.displayName || i.name || i.title || "item"} x${i.qty || i.quantity || 1}`)
        .join(", ")
    : "";

  const status = String(order.status || "pending").toLowerCase();

  const cls = {
    pending: "status pending",
    pending_verification: "status pending",
    shipped: "status shipped",
    completed: "status completed"
  }[status] || "status";

  const phone = String(order.phone || order.customer?.phone || "").trim();
  const total = order.total ?? order.totalAmount;
  const proofUrl = getPaymentProofUrl(order);

  return `
    <td data-col="id">${esc(order.orderNumber || id)}</td>
    <td data-col="name">${esc(order.name || order.customer?.name)}</td>
    <td data-col="email">${esc(order.email || order.customer?.email)}</td>
    <td data-col="phone">${esc(phone)}</td>
    <td data-col="items">${esc(itemsText)}</td>
    <td data-col="total">${fmtMoney(total)}</td>

    <td data-col="payment">
      ${
        proofUrl
          ? `<a class="btn sm primary" href="${esc(proofUrl)}" target="_blank" rel="noopener">View Proof</a>`
          : `<span class="muted">No proof</span>`
      }
    </td>

    <td data-col="address">${esc(order.address || order.customer?.address)}</td>
    <td data-col="time">${fmtTime(order.timestamp || order.createdAt)}</td>

    <td data-col="status" data-status="${esc(status)}">
      <span class="${esc(cls)}">${esc(status.replaceAll("_", " "))}</span>
    </td>

    <td data-col="action">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn sm" data-set-status="pending" data-id="${esc(id)}">Pending</button>
        <button class="btn sm" data-set-status="shipped" data-id="${esc(id)}">Shipped</button>
        <button class="btn sm" data-set-status="completed" data-id="${esc(id)}">Completed</button>
        <button class="btn sm danger" data-delete-id="${esc(id)}">Delete</button>
      </div>
    </td>
  `;
}

function attachOrdersListener() {
  if (ordersListenerAttached) return;

  const ref = firebase.database().ref("orders").limitToLast(500);

  ref.on(
    "value",
    snap => {
      const data = snap.val() || {};

      allOrders = Object.entries(data).map(([id, order]) => ({
        id,
        order: order || {},
        time: order?.timestamp || order?.createdAt || 0
      }));

      allOrders.sort((a, b) => {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });

      currentOrderPage = 1;
      applyOrderFilters();

      if (ordersStatus) {
        ordersStatus.textContent = allOrders.length
          ? `Loaded ${allOrders.length} order(s).`
          : "No orders yet.";
      }
    },
    err => {
      console.error(err);
      if (ordersStatus) ordersStatus.textContent = "Permission error or missing rules.";
    }
  );

  ordersListenerAttached = true;
}

function applyOrderFilters() {
  const q = $("orderSearch");
  const f = $("orderStatusFilter");

  const txt = String(q?.value || "").toLowerCase().trim();
  const status = String(f?.value || "").toLowerCase().trim();

  filteredOrders = allOrders.filter(({ id, order }) => {
    const proofUrl = getPaymentProofUrl(order);

    const haystack = [
      id,
      order.orderNumber,
      order.name,
      order.email,
      order.phone,
      order.customer?.name,
      order.customer?.email,
      order.customer?.phone,
      order.address,
      order.customer?.address,
      proofUrl
    ].join(" ").toLowerCase();

    const orderStatus = String(order.status || "pending").toLowerCase();

    return (!txt || haystack.includes(txt)) && (!status || orderStatus === status);
  });

  renderOrdersPage();
}

function renderOrdersPage() {
  if (!ordersBody) return;

  ordersBody.innerHTML = "";

  if (!filteredOrders.length) {
    ordersBody.innerHTML = `<tr><td colspan="11">No orders found.</td></tr>`;
    renderOrderPagination();
    return;
  }

  const start = (currentOrderPage - 1) * ORDERS_PER_PAGE;
  const pageItems = filteredOrders.slice(start, start + ORDERS_PER_PAGE);

  pageItems.forEach(({ id, order }) => {
    const tr = document.createElement("tr");
    tr.innerHTML = rowHTML(id, order);
    ordersBody.appendChild(tr);
  });

  renderOrderPagination();
}

function renderOrderPagination() {
  const wrap = $("orderPagination");
  if (!wrap) return;

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  wrap.innerHTML = "";

  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.className = "page-btn";
  prev.textContent = "‹";
  prev.disabled = currentOrderPage === 1;

  prev.addEventListener("click", () => {
    currentOrderPage--;
    renderOrdersPage();
  });

  wrap.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === currentOrderPage ? " active" : "");
    btn.textContent = i;

    btn.addEventListener("click", () => {
      currentOrderPage = i;
      renderOrdersPage();
    });

    wrap.appendChild(btn);
  }

  const next = document.createElement("button");
  next.className = "page-btn";
  next.textContent = "›";
  next.disabled = currentOrderPage === totalPages;

  next.addEventListener("click", () => {
    currentOrderPage++;
    renderOrdersPage();
  });

  wrap.appendChild(next);
}

window.__applyOrderFilters = function () {
  currentOrderPage = 1;
  applyOrderFilters();
};

$("orderSearch")?.addEventListener("input", window.__applyOrderFilters);
$("orderStatusFilter")?.addEventListener("change", window.__applyOrderFilters);

document.addEventListener("click", async e => {
  const setBtn = e.target.closest("[data-set-status]");
  const delBtn = e.target.closest("[data-delete-id]");

  if (setBtn) {
    const id = setBtn.dataset.id;
    const next = setBtn.dataset.setStatus;

    try {
      await firebase.database().ref(`orders/${id}`).update({
        status: next,
        adminUpdatedAt: new Date().toISOString()
      });
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  }

  if (delBtn) {
    const id = delBtn.dataset.deleteId;
    if (!confirm("Delete this order?")) return;

    try {
      await firebase.database().ref(`orders/${id}`).remove();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }
});

/* =========================
   Site Settings
========================= */
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

async function loadSite() {
  if (!site.heroTitle || !site.heroSubtitle || !site.featuredCategory || !site.showFeatured) return;

  try {
    site.status.textContent = "Loading…";

    const snap = await siteDocRef.get();
    const data = snap.data() || {};

    site.heroTitle.value = data.heroTitle || "";
    site.heroSubtitle.value = data.heroSubtitle || "";
    site.featuredCategory.value = data.featuredCategory || "perfume";
    site.showFeatured.checked = !!data.showFeatured;

    site.bannerPreview.innerHTML = data.bannerImage
      ? `<img src="${esc(data.bannerImage)}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ccc">`
      : "";

    site.galleryPreview.innerHTML = Array.isArray(data.gallery)
      ? data.gallery
          .map(u => `<img src="${esc(u)}" style="width:86px;height:86px;border-radius:8px;border:1px solid #ccc;object-fit:cover">`)
          .join("")
      : "";

    site.status.textContent = "Ready.";
  } catch (e) {
    console.error(e);
    site.status.textContent = "Error loading site settings.";
  }
}

site.reloadBtn?.addEventListener("click", loadSite);

site.saveBtn?.addEventListener("click", async () => {
  try {
    site.status.textContent = "Saving…";

    let bannerUrl = "";
    let galleryUrls = [];

    if (site.banner?.files?.length) {
      bannerUrl = await uploadToR2(site.banner.files[0], "site/banner");
    }

    if (site.gallery?.files?.length) {
      galleryUrls = await Promise.all(
        [...site.gallery.files].map(f => uploadToR2(f, "site/gallery"))
      );
    }

    const data = {
      heroTitle: site.heroTitle.value.trim(),
      heroSubtitle: site.heroSubtitle.value.trim(),
      featuredCategory: site.featuredCategory.value.trim(),
      showFeatured: site.showFeatured.checked
    };

    if (bannerUrl) data.bannerImage = bannerUrl;
    if (galleryUrls.length) data.gallery = galleryUrls;

    await siteDocRef.set(data, { merge: true });

    site.status.textContent = "Saved ✓";
    loadSite();
  } catch (e) {
    console.error(e);
    site.status.textContent = "Save failed: " + e.message;
  }
});

/* =========================
   Product refs
========================= */
const nameEl = $("name");
const priceEl = $("price");
const discountPriceEl = $("discountPrice");
const brandEl = $("brand");
const subcategoryEl = $("subcategory");
const sizesEl = $("sizes");
const descEl = $("description");
const categoryEl = $("category");
const activeEl = $("active");
const imagesEl = $("images");

const variantRows = $("variantRows");
const addVariantBtn = $("addVariantBtn");

const tableBody = $("tableBody");
const filterCategory = $("filterCategory");
const productSearch = $("productSearch");
const productsPerPage = $("productsPerPage");
const productPagination = $("productPagination");

const refreshBtn = $("refreshBtn");
const resetBtn = $("resetBtn");
const saveBtn = $("saveBtn");
const docIdEl = $("docId");

/* =========================
   Variant builder
========================= */
function addVariantRow(label = "", price = "") {
  if (!variantRows) return;

  const row = document.createElement("div");
  row.className = "variant-row";

  row.innerHTML = `
    <div>
      <label>Variant / Size</label>
      <input class="variant-label" type="text" placeholder="Example: 100ml, Small, Red" value="${esc(label)}">
    </div>

    <div>
      <label>Price Rs</label>
      <input class="variant-price" type="number" placeholder="450" value="${esc(price)}">
    </div>

    <button type="button" class="btn danger remove-variant">Remove</button>
  `;

  variantRows.appendChild(row);

  row.querySelector(".remove-variant").addEventListener("click", () => {
    row.remove();
    syncVariantsToTextarea();
  });

  row.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", syncVariantsToTextarea);
  });

  syncVariantsToTextarea();
}

function getVariantsFromRows() {
  const rows = Array.from(document.querySelectorAll(".variant-row"));

  return rows
    .map(row => {
      const label = row.querySelector(".variant-label")?.value.trim() || "";
      const price = Number(row.querySelector(".variant-price")?.value || 0);
      return { label, price };
    })
    .filter(v => v.label && Number.isFinite(v.price) && v.price > 0);
}

function syncVariantsToTextarea() {
  const variants = getVariantsFromRows();

  if (sizesEl) {
    sizesEl.value = variants.map(v => `${v.label} | ${v.price}`).join("\n");
  }
}

function loadVariantsIntoRows(sizes = []) {
  if (!variantRows) return;

  variantRows.innerHTML = "";

  if (Array.isArray(sizes) && sizes.length) {
    sizes.forEach(s => addVariantRow(s.label || "", s.price || ""));
  } else {
    addVariantRow("", "");
  }

  syncVariantsToTextarea();
}

addVariantBtn?.addEventListener("click", () => {
  addVariantRow("", "");
});

/* =========================
   Products
========================= */
function resetForm() {
  if (docIdEl) docIdEl.value = "";
  if (nameEl) nameEl.value = "";
  if (priceEl) priceEl.value = "";
  if (discountPriceEl) discountPriceEl.value = "";
  if (brandEl) brandEl.value = "";
  if (subcategoryEl) subcategoryEl.value = "";
  if (sizesEl) sizesEl.value = "";
  if (descEl) descEl.value = "";
  if (categoryEl) categoryEl.value = "perfume";
  if (activeEl) activeEl.checked = true;
  if (imagesEl) imagesEl.value = "";

  loadVariantsIntoRows([]);
}

resetBtn?.addEventListener("click", resetForm);

function getProductsPerPage() {
  return Number(productsPerPage?.value || 10);
}

function applyProductFilters() {
  const cat = normalizeCategory(filterCategory?.value || "all");
  const q = String(productSearch?.value || "").toLowerCase().trim();

  filteredProducts = allProducts.filter(item => {
    const p = item.data;

    const matchesCategory =
      cat === "all" || normalizeCategory(p.category) === cat;

    const haystack = [
      p.name,
      p.brand,
      p.subcategory,
      p.category,
      p.description
    ].join(" ").toLowerCase();

    const matchesSearch = !q || haystack.includes(q);

    return matchesCategory && matchesSearch;
  });

  currentPage = 1;
  renderProductsTable();
}

function renderProductsTable() {
  const perPage = getProductsPerPage();
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));

  if (!tableBody) return;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  tableBody.innerHTML = "";

  if (!filteredProducts.length) {
    tableBody.innerHTML = `<tr><td colspan="9">No products found</td></tr>`;
    if (productPagination) productPagination.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * perPage;
  const pageItems = filteredProducts.slice(start, start + perPage);

  pageItems.forEach(item => {
    const doc = item;
    const p = item.data;

    const img = p.imageURL || p.images?.[0] || "";
    const isOut = String(p.stockStatus || "").toLowerCase() === "out";

    const tr = document.createElement("tr");
    tr.style.opacity = isOut ? "0.5" : "1";

    tr.innerHTML = `
      <td>
        ${img ? `<img src="${esc(img)}" width="60" height="60" style="object-fit:cover;border-radius:6px">` : ""}
      </td>

      <td>
        <strong>${esc(p.name)}</strong>
        <div class="muted">${esc(p.brand || "")}</div>
      </td>

      <td>${esc(p.category || "-")}</td>
      <td>${esc(p.subcategory || "-")}</td>
      <td>${renderSizes(p.sizes)}</td>
      <td>Rs${Number(p.basePrice || 0).toFixed(2)}</td>
      <td>${p.discountPrice ? `Rs${Number(p.discountPrice).toFixed(2)}` : "-"}</td>
      <td>${p.active ? "Yes" : "No"}</td>

      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn sm edit" data-id="${esc(doc.id)}">Edit</button>
          <button class="btn sm danger delete" data-id="${esc(doc.id)}">Delete</button>
          <button class="btn sm stock" data-id="${esc(doc.id)}" data-status="${isOut ? "out" : "in"}">
            ${isOut ? "Set In Stock" : "Set Out of Stock"}
          </button>
        </div>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  bindProductButtons();
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  if (!productPagination) return;

  productPagination.innerHTML = "";

  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.className = "page-btn";
  prev.textContent = "‹";
  prev.disabled = currentPage === 1;

  prev.addEventListener("click", () => {
    currentPage--;
    renderProductsTable();
  });

  productPagination.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === currentPage ? " active" : "");
    btn.textContent = i;

    btn.addEventListener("click", () => {
      currentPage = i;
      renderProductsTable();
    });

    productPagination.appendChild(btn);
  }

  const next = document.createElement("button");
  next.className = "page-btn";
  next.textContent = "›";
  next.disabled = currentPage === totalPages;

  next.addEventListener("click", () => {
    currentPage++;
    renderProductsTable();
  });

  productPagination.appendChild(next);
}

function bindProductButtons() {
  $$(".edit").forEach(btn => {
    btn.addEventListener("click", async () => {
      const snap = await db.collection("products").doc(btn.dataset.id).get();
      if (!snap.exists) return;

      const p = snap.data();

      if (docIdEl) docIdEl.value = snap.id;
      if (nameEl) nameEl.value = p.name || "";
      if (priceEl) priceEl.value = p.basePrice || "";
      if (discountPriceEl) discountPriceEl.value = p.discountPrice || "";
      if (brandEl) brandEl.value = p.brand || "";
      if (subcategoryEl) subcategoryEl.value = p.subcategory || "";
      if (descEl) descEl.value = p.description || "";
      if (categoryEl) categoryEl.value = normalizeCategory(p.category);
      if (activeEl) activeEl.checked = !!p.active;

      loadVariantsIntoRows(p.sizes || []);

      productSection?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });

  $$(".delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this product?")) return;

      await db.collection("products").doc(btn.dataset.id).delete();
      await loadProducts();
    });
  });

  $$(".stock").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const next = btn.dataset.status === "out" ? "in" : "out";

      await db.collection("products").doc(id).set(
        { stockStatus: next },
        { merge: true }
      );

      await loadProducts();
    });
  });
}

async function loadProducts() {
  if (!tableBody) return;

  try {
    tableBody.innerHTML = `<tr><td colspan="9">Loading…</td></tr>`;

    const snap = await db.collection("products").get();

    allProducts = snap.docs.map(doc => ({
      id: doc.id,
      data: doc.data() || {}
    }));

    allProducts.sort((a, b) => {
      const an = String(a.data.name || "").toLowerCase();
      const bn = String(b.data.name || "").toLowerCase();
      return an.localeCompare(bn);
    });

    applyProductFilters();
  } catch (e) {
    console.error(e);
    tableBody.innerHTML = `<tr><td colspan="9">Error loading products: ${esc(e.message)}</td></tr>`;
  }
}

refreshBtn?.addEventListener("click", loadProducts);
filterCategory?.addEventListener("change", applyProductFilters);
productSearch?.addEventListener("input", applyProductFilters);

productsPerPage?.addEventListener("change", () => {
  currentPage = 1;
  renderProductsTable();
});

saveBtn?.addEventListener("click", async () => {
  try {
    syncVariantsToTextarea();

    const id = docIdEl.value || db.collection("products").doc().id;
    const sizes = getVariantsFromRows();

    const basePrice = Number(priceEl.value || 0);
    const discountPrice = discountPriceEl?.value
      ? Number(discountPriceEl.value)
      : null;

    const data = {
      name: nameEl.value.trim(),
      basePrice,
      discountPrice,
      brand: brandEl.value.trim(),
      subcategory: normalizeSubcategory(subcategoryEl?.value),
      sizes,
      description: descEl.value.trim(),
      category: normalizeCategory(categoryEl.value),
      active: activeEl.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!data.name) return alert("Product name is required.");
    if (!data.category) return alert("Category is required.");
    if (!data.basePrice || data.basePrice <= 0) return alert("Base price is required.");

    if (discountPrice && discountPrice >= basePrice) {
      return alert("Discount price must be lower than base price.");
    }

    if (!sizes.length) {
      const useBase = confirm("No variants added. Use base price as one default variant?");

      if (useBase) {
        data.sizes = [{ label: "Default", price: basePrice }];
      }
    }

    if (!docIdEl.value) {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    if (imagesEl.files.length) {
      const urls = await Promise.all(
        [...imagesEl.files].map(f => uploadToR2(f, "products"))
      );

      data.images = urls;
      data.imageURL = urls[0];
    }

    await db.collection("products").doc(id).set(data, { merge: true });

    alert("Saved ✓");

    resetForm();
    await loadProducts();
  } catch (e) {
    alert("Save failed: " + e.message);
    console.error(e);
  }
});

/* =========================
   Auth state
========================= */
auth.onAuthStateChanged(user => {
  const logged = !!user;

  logged ? hide(loginBtn) : show(loginBtn);
  logged ? show(logoutBtn) : hide(logoutBtn);

  if (!logged) {
    if (authStatus) authStatus.textContent = "Please sign in.";
  } else if (canSeeAdmin(user)) {
    if (authStatus) authStatus.textContent = `Signed in as ${user.email || user.uid}`;
  } else {
    if (authStatus) authStatus.textContent = "Access denied.";
  }

  const allowed = logged && canSeeAdmin(user);

  allowed ? show(btnSeeOrders) : hide(btnSeeOrders);

  if (allowed) {
    if (dashboardWrap) dashboardWrap.style.display = "block";
    if (siteSection) siteSection.style.display = "block";
    if (productSection) productSection.style.display = "block";
    if (listSection) listSection.style.display = "block";

    loadVariantsIntoRows([]);
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
