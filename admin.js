// admin.js — no-login version
(function () {
  if (!window.db) {
    console.error("❌ Firebase not initialized: ensure firebase-app-compat.js + firebase-config.js loaded first.");
    alert("Firebase not initialized. Check firebase-config.js.");
    return;
  }

  // ---------- Helpers ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const toNumber = (v) => (v === "" || v == null ? 0 : Number(v));
  const parseSizes = (t) =>
    String(t || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        let [label, p] = l.split("|").map((x) => (x || "").trim());
        return { label, price: Number(p || 0) };
      });

  const renderSizes = (arr) =>
    (arr || []).map((s) => `${s.label} (${isFinite(s.price) ? "Rs" + s.price : "-"})`).join(", ");

  const cloudName = window.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = window.CLOUDINARY_UPLOAD_PRESET;

  async function uploadToCloudinary(file) {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Cloudinary upload failed");
    const data = await res.json();
    return data.secure_url;
  }

  // ---------- Site Settings ----------
  const siteDocRef = db.collection("site").doc("home");
  const site = {
    heroTitle: $("#site-heroTitle"),
    heroSubtitle: $("#site-heroSubtitle"),
    featuredCategory: $("#site-featuredCategory"),
    showFeatured: $("#site-showFeatured"),
    wa: $("#site-wa"),
    ig: $("#site-ig"),
    tt: $("#site-tt"),
    banner: $("#site-banner"),
    bannerPreview: $("#site-banner-preview"),
    gallery: $("#site-gallery"),
    galleryPreview: $("#site-gallery-preview"),
    saveBtn: $("#site-save"),
    reloadBtn: $("#site-reload"),
    status: $("#site-status"),
  };

  async function loadSite() {
    site.status.textContent = "Loading…";
    const snap = await siteDocRef.get();
    const data = snap.exists ? snap.data() : {};
    site.heroTitle.value = data.heroTitle || "";
    site.heroSubtitle.value = data.heroSubtitle || "";
    site.featuredCategory.value = (data.featuredCategory || "perfume").toLowerCase();
    site.showFeatured.checked = !!data.showFeatured;
    site.wa.value = data.whatsapp || "https://wa.me/23058195560";
    site.ig.value = data.instagram || "https://www.instagram.com/yourusername";
    site.tt.value = data.tiktok || "https://www.tiktok.com/@yourusername";

    site.bannerPreview.innerHTML = data.bannerImage ? `<img src="${data.bannerImage}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">` : "";
    site.galleryPreview.innerHTML = Array.isArray(data.gallery)
      ? data.gallery
          .map((u) => `<img src="${u}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5">`)
          .join("")
      : "";
    site.status.textContent = "Ready.";
  }

  site.reloadBtn.addEventListener("click", loadSite);

  site.saveBtn.addEventListener("click", async () => {
    try {
      site.status.textContent = "Saving…";
      let bannerURL;
      if (site.banner.files[0]) {
        bannerURL = await uploadToCloudinary(site.banner.files[0]);
      }
      let galleryURLs = null;
      if (site.gallery.files.length) {
        const uploads = [];
        for (const f of site.gallery.files) uploads.push(uploadToCloudinary(f));
        galleryURLs = await Promise.all(uploads);
      }

      const payload = {
        heroTitle: site.heroTitle.value.trim(),
        heroSubtitle: site.heroSubtitle.value.trim(),
        featuredCategory: site.featuredCategory.value,
        showFeatured: site.showFeatured.checked,
        whatsapp: site.wa.value.trim(),
        instagram: site.ig.value.trim(),
        tiktok: site.tt.value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (bannerURL) payload.bannerImage = bannerURL;
      if (galleryURLs) payload.gallery = galleryURLs;

      await siteDocRef.set(payload, { merge: true });
      site.status.textContent = "Saved ✓";
      await loadSite();
    } catch (e) {
      console.error(e);
      site.status.textContent = "Error saving site settings.";
      alert("Error: " + e.message);
    }
  });

  loadSite();

  // ---------- Products ----------
  const nameEl = $("#name"),
    priceEl = $("#price"),
    brandEl = $("#brand"),
    sizesEl = $("#sizes"),
    descEl = $("#description"),
    categoryEl = $("#category"),
    activeEl = $("#active"),
    imagesEl = $("#images"),
    tableBody = $("#tableBody"),
    filterCategory = $("#filterCategory"),
    refreshBtn = $("#refreshBtn"),
    resetBtn = $("#resetBtn"),
    saveBtn = $("#saveBtn"),
    docIdEl = $("#docId");

  function resetForm() {
    docIdEl.value =
      nameEl.value =
      priceEl.value =
      brandEl.value =
      sizesEl.value =
      descEl.value =
        "";
    categoryEl.value = "perfume";
    activeEl.checked = true;
    imagesEl.value = "";
  }

  resetBtn.addEventListener("click", resetForm);

  async function loadProducts() {
    tableBody.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";
    const snap = await db.collection("products").where("category", "==", filterCategory.value).get();
    if (snap.empty) {
      tableBody.innerHTML = "<tr><td colspan='6'>No products</td></tr>";
      return;
    }
    tableBody.innerHTML = "";
    snap.forEach((doc) => {
      const p = doc.data();
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

    // bind actions
    $$(".edit").forEach((b) =>
      b.addEventListener("click", async () => {
        const d = await db.collection("products").doc(b.dataset.id).get();
        if (!d.exists) return;
        const p = d.data();
        docIdEl.value = d.id;
        nameEl.value = p.name || "";
        priceEl.value = p.basePrice || 0;
        brandEl.value = p.brand || "";
        sizesEl.value = (p.sizes || []).map((s) => `${s.label} | ${s.price}`).join("\n");
        descEl.value = p.description || "";
        categoryEl.value = p.category || "perfume";
        activeEl.checked = !!p.active;
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
  }

  refreshBtn.addEventListener("click", loadProducts);
  filterCategory.addEventListener("change", loadProducts);

  async function saveProduct() {
    try {
      const id = docIdEl.value || db.collection("products").doc().id;
      const sizes = parseSizes(sizesEl.value);
      const data = {
        name: nameEl.value.trim(),
        basePrice: toNumber(priceEl.value),
        brand: brandEl.value.trim(),
        sizes,
        description: (descEl.value || "").trim(),
        category: categoryEl.value,
        active: !!activeEl.checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (!docIdEl.value) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

      // image uploads (optional)
      if (imagesEl.files.length) {
        const urls = [];
        for (const f of imagesEl.files) urls.push(uploadToCloudinary(f));
        const uploaded = await Promise.all(urls);
        data.images = uploaded;
        if (!data.imageURL && uploaded[0]) data.imageURL = uploaded[0];
      }

      await db.collection("products").doc(id).set(data, { merge: true });
      alert("Saved ✓");
      resetForm();
      await loadProducts();
    } catch (e) {
      console.error(e);
      alert("Save failed: " + e.message);
    }
  }

  saveBtn.addEventListener("click", saveProduct);

  // initial load
  loadProducts();
})();
