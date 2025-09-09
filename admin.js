// admin.js — full admin (auth + site settings + product CRUD + Cloudinary upload)

// ---------- Guards ----------
if (!window.firebase || !window.db || !window.auth) {
  throw new Error("❌ Firebase not initialized: make sure firebase-*-compat.js + firebase-config.js are loaded BEFORE admin.js");
}
if (!window.CLOUDINARY_CLOUD_NAME || !window.CLOUDINARY_UPLOAD_PRESET) {
  console.warn("ℹ️ Cloudinary config missing; image uploads will be skipped.");
}

// ---------- Allowed Admins ----------
const ALLOWED_ADMIN_UIDS = new Set([
  "w5jtigflSVezQwUvnsgM7AY4ZK73",
  "nyQYzolZI2fLFqIkAPNHHbcSJ2p1",
]);

// ---------- Shortcuts ----------
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ---------- Auth UI ----------
const emailEl   = $("#email");
const passEl    = $("#password");
const loginBtn  = $("#loginBtn");
const logoutBtn = $("#logoutBtn");
const statusEl  = $("#auth-status");

// Sections
const siteSection    = $("#site-section");
const productSection = $("#product-section");
const listSection    = $("#list-section");

// Product form
const categoryEl = $("#category");
const nameEl     = $("#name");
const priceEl    = $("#price");
const brandEl    = $("#brand");
const sizesEl    = $("#sizes");
const descEl     = $("#description");
const imagesEl   = $("#images");
const activeEl   = $("#active");
const saveBtn    = $("#saveBtn");
const resetBtn   = $("#resetBtn");
const docIdEl    = $("#docId");

// Product list
const tableBody      = $("#tableBody");
const filterCategory = $("#filterCategory");
const refreshBtn     = $("#refreshBtn");

// Site settings
const siteHeroTitle      = $("#site-heroTitle");
const siteHeroSubtitle   = $("#site-heroSubtitle");
const siteFeaturedCat    = $("#site-featuredCategory");
const siteShowFeatured   = $("#site-showFeatured");
const siteBannerInput    = $("#site-banner");
const siteGalleryInput   = $("#site-gallery");
const siteBannerPreview  = $("#site-banner-preview");
const siteGalleryPreview = $("#site-gallery-preview");
const siteSaveBtn        = $("#site-save");
const siteReloadBtn      = $("#site-reload");
const siteStatus         = $("#site-status");

// ---------- Helpers ----------
const parseSizes = (t) =>
  String(t || "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const [labelRaw, priceRaw] = line.split("|").map(x => String(x || "").trim());
      const price = Number(priceRaw || 0);
      return { label: labelRaw || "", price: isNaN(price) ? 0 : price };
    });

const renderSizes = (sizesArr=[]) =>
  sizesArr.map(s => `${s.label} (Rs${Number(s.price||0)})`).join(", ");

const resetForm = () => {
  docIdEl.value = "";
  nameEl.value = "";
  priceEl.value = "";
  brandEl.value = "";
  sizesEl.value = "";
  descEl.value = "";
  imagesEl.value = "";
  activeEl.checked = true;
  categoryEl.value = "perfume";
};

const nowTs = () => firebase.firestore.FieldValue.serverTimestamp();

// Cloudinary unsigned upload (returns array of URLs)
async function uploadImagesIfAny(files) {
  const urls = [];
  if (!files || !files.length) return urls;

  if (!window.CLOUDINARY_CLOUD_NAME || !window.CLOUDINARY_UPLOAD_PRESET) {
    alert("Cloudinary not configured; images will not be uploaded.");
    return urls;
  }

  for (const file of files) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", window.CLOUDINARY_UPLOAD_PRESET);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/upload`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.secure_url) {
        urls.push(json.secure_url);
      } else {
        console.error("Cloudinary upload error:", json);
        alert("An image failed to upload. Check console for details.");
      }
    } catch (e) {
      console.error("Cloudinary upload failed:", e);
      alert("Network error while uploading image.");
    }
  }
  return urls;
}

// ---------- Auth Events ----------
loginBtn?.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const pass  = passEl.value.trim();
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
});

logoutBtn?.addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged((user) => {
  const ok = !!(user && ALLOWED_ADMIN_UIDS.has(user.uid));
  statusEl.textContent = user
    ? (ok ? `Signed in as ${user.email || user.uid}` : "Not authorized")
    : "Please log in.";

  loginBtn.style.display  = user ? "none" : "inline-block";
  logoutBtn.style.display = user ? "inline-block" : "none";

  siteSection.style.display    = ok ? "block" : "none";
  productSection.style.display = ok ? "block" : "none";
  listSection.style.display    = ok ? "block" : "none";

  if (ok) {
    loadProducts();
    loadSiteSettings();
  }
});

// ---------- Site Settings (load/save) ----------
async function loadSiteSettings() {
  try {
    siteStatus.textContent = "Loading site settings…";
    const snap = await db.collection("site").doc("home").get();
    const data = snap.exists ? snap.data() : {};

    siteHeroTitle.value    = data.heroTitle || "";
    siteHeroSubtitle.value = data.heroSubtitle || "";
    siteFeaturedCat.value  = data.featuredCategory || "perfume";
    siteShowFeatured.checked = !!data.showFeatured;

    // Previews (not editable until upload)
    siteBannerPreview.innerHTML = data.bannerImage
      ? `<img src="${data.bannerImage}" alt="banner" style="width:120px;height:120px;object-fit:cover;border:1px solid #eee;border-radius:8px">`
      : `<div class="muted">No banner set.</div>`;

    siteGalleryPreview.innerHTML = (Array.isArray(data.gallery) && data.gallery.length)
      ? data.gallery.map(u => `<img src="${u}" alt="g" style="width:80px;height:80px;object-fit:cover;border:1px solid #eee;border-radius:8px">`).join("")
      : `<div class="muted">No gallery images.</div>`;

    siteStatus.textContent = "Ready.";
  } catch (e) {
    console.error(e);
    siteStatus.textContent = "Failed to load site settings.";
  }
}

siteReloadBtn?.addEventListener("click", loadSiteSettings);

siteSaveBtn?.addEventListener("click", async () => {
  try {
    siteStatus.textContent = "Saving…";
    let bannerURL = null;
    let galleryURLs = null;

    // upload banner (replace)
    if (siteBannerInput.files && siteBannerInput.files[0]) {
      const [u] = await uploadImagesIfAny([siteBannerInput.files[0]]);
      bannerURL = u || null;
    }

    // upload gallery (overwrite)
    if (siteGalleryInput.files && siteGalleryInput.files.length) {
      galleryURLs = await uploadImagesIfAny(siteGalleryInput.files);
    }

    const update = {
      heroTitle: siteHeroTitle.value.trim(),
      heroSubtitle: siteHeroSubtitle.value.trim(),
      featuredCategory: siteFeaturedCat.value,
      showFeatured: !!siteShowFeatured.checked,
      updatedAt: nowTs(),
    };
    if (bannerURL !== null) update.bannerImage = bannerURL;
    if (galleryURLs !== null) update.gallery = galleryURLs;

    await db.collection("site").doc("home").set(update, { merge: true });
    siteStatus.textContent = "Saved!";
    await loadSiteSettings();
  } catch (e) {
    console.error(e);
    siteStatus.textContent = "Save failed.";
    alert("Site settings save failed: " + e.message);
  }
});

// ---------- Product Save ----------
saveBtn?.addEventListener("click", async () => {
  try {
    saveBtn.disabled = true;

    const sizes = parseSizes(sizesEl.value);
    const basePriceNum = Number(priceEl.value || 0) || 0;

    // upload images
    const imgs = await uploadImagesIfAny(imagesEl.files);
    const payload = {
      name: nameEl.value.trim(),
      basePrice: basePriceNum,
      brand: brandEl.value.trim(),
      sizes,
      description: descEl.value.trim(),
      active: !!activeEl.checked,
      category: String(categoryEl.value || "").toLowerCase(),
      updatedAt: nowTs(),
    };
    if (imgs.length) {
      // keep first as imageURL, store array in images
      payload.imageURL = imgs[0];
      payload.images = imgs;
    }

    const id = docIdEl.value || db.collection("products").doc().id;

    if (docIdEl.value) {
      // update
      await db.collection("products").doc(id).set(payload, { merge: true });
    } else {
      // create
      payload.createdAt = nowTs();
      await db.collection("products").doc(id).set(payload);
    }

    alert("Saved!");
    resetForm();
    await loadProducts();
  } catch (e) {
    console.error("Save error:", e);
    alert("Save failed: " + e.message);
  } finally {
    saveBtn.disabled = false;
  }
});

resetBtn?.addEventListener("click", resetForm);

// ---------- Product List (load, edit, delete) ----------
async function loadProducts() {
  try {
    tableBody.innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;
    const cat = String(filterCategory.value || "perfume").toLowerCase();
    const snap = await db.collection("products").where("category", "==", cat).get();

    if (snap.empty) {
      tableBody.innerHTML = `<tr><td colspan="6">No products</td></tr>`;
      return;
    }

    const rows = [];
    snap.forEach((doc) => {
      const p = doc.data() || {};
      rows.push({
        id: doc.id,
        name: p.name || "",
        sizes: Array.isArray(p.sizes) ? p.sizes : [],
        base: Number(p.basePrice || 0) || 0,
        active: !!p.active,
        img: p.imageURL || (Array.isArray(p.images) && p.images[0]) || "",
      });
    });

    tableBody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.img ? `<img src="${r.img}" width="60" height="60" style="object-fit:cover;border-radius:6px;border:1px solid #eee">` : ""}</td>
        <td>${r.name}</td>
        <td>${renderSizes(r.sizes)}</td>
        <td>Rs${r.base.toFixed(2)}</td>
        <td>${r.active ? "Yes" : "No"}</td>
        <td>
          <button class="btn edit" data-id="${r.id}">Edit</button>
          <button class="btn danger delete" data-id="${r.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    // wire buttons
    $$(".edit").forEach(b => b.addEventListener("click", () => editProduct(b.dataset.id)));
    $$(".delete").forEach(b => b.addEventListener("click", () => deleteProduct(b.dataset.id)));
  } catch (e) {
    console.error("Load products error:", e);
    tableBody.innerHTML = `<tr><td colspan="6">Error loading products</td></tr>`;
  }
}

async function editProduct(id) {
  try {
    const doc = await db.collection("products").doc(id).get();
    if (!doc.exists) return alert("Product not found");
    const p = doc.data();

    docIdEl.value = doc.id;
    categoryEl.value = p.category || "perfume";
    nameEl.value = p.name || "";
    priceEl.value = Number(p.basePrice || 0) || 0;
    brandEl.value = p.brand || "";
    sizesEl.value = (Array.isArray(p.sizes) ? p.sizes : []).map(s => `${s.label} | ${s.price}`).join("\n");
    descEl.value = p.description || "";
    activeEl.checked = !!p.active;

    window.scrollTo({ top: productSection.offsetTop - 12, behavior: "smooth" });
  } catch (e) {
    console.error(e);
    alert("Failed to load product for editing.");
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  try {
    await db.collection("products").doc(id).delete();
    await loadProducts();
  } catch (e) {
    console.error(e);
    alert("Delete failed: " + e.message);
  }
}

refreshBtn?.addEventListener("click", loadProducts);
filterCategory?.addEventListener("change", loadProducts);

// ---------- DONE ----------
console.log("✅ Admin ready");
