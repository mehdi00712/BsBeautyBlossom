// admin.js — B’s Beauty Blossom (Admin)
// Requires: admin.html includes firebase-app-compat.js, firebase-auth-compat.js,
// firebase-firestore-compat.js, then firebase-config.js (which sets window.db & window.auth).
// Also needs: window.CLOUDINARY_CLOUD_NAME and window.CLOUDINARY_UPLOAD_PRESET set in admin.html.

(function () {
  // ---------- Guards ----------
  if (!window.firebase || !window.db || !window.auth) {
    throw new Error("❌ Firebase not initialized: check that admin.html loads firebase-auth-compat.js and firebase-config.js in the right order.");
  }
  if (!window.CLOUDINARY_CLOUD_NAME || !window.CLOUDINARY_UPLOAD_PRESET) {
    console.warn("ℹ Cloudinary env not set on window — image uploads will fail.");
  }

  // ---------- DOM ----------
  const $ = (s) => document.querySelector(s);

  // Auth
  const email = $("#email");
  const password = $("#password");
  const loginBtn = $("#loginBtn");
  const signupBtn = $("#signupBtn");
  const logoutBtn = $("#logoutBtn");
  const authStatus = $("#auth-status");

  // Sections
  const siteSection = $("#site-section");
  const productSection = $("#product-section");
  const listSection = $("#list-section");

  // Site settings
  const siteHeroTitle = $("#site-heroTitle");
  const siteHeroSubtitle = $("#site-heroSubtitle");
  const siteFeaturedCategory = $("#site-featuredCategory");
  const siteShowFeatured = $("#site-showFeatured");
  const siteBanner = $("#site-banner");
  const siteBannerPreview = $("#site-banner-preview");
  const siteGallery = $("#site-gallery");
  const siteGalleryPreview = $("#site-gallery-preview");
  const siteSave = $("#site-save");
  const siteReload = $("#site-reload");
  const siteStatus = $("#site-status");

  // Product form
  const categoryEl = $("#category");
  const nameEl = $("#name");
  const priceEl = $("#price");
  const brandEl = $("#brand");
  const sizesEl = $("#sizes");
  const descEl = $("#description");
  const imagesEl = $("#images");
  const activeEl = $("#active");
  const saveBtn = $("#saveBtn");
  const resetBtn = $("#resetBtn");
  const docIdEl = $("#docId");

  // Product list
  const filterCategory = $("#filterCategory");
  const refreshBtn = $("#refreshBtn");
  const tableBody = $("#tableBody");

  // ---------- Admin Allowlist (optional) ----------
  // If you want to limit dashboard visibility to specific UIDs, put them here.
  // Leave empty to allow any signed-in user; Firestore/Storage rules still protect writes.
  const ALLOWED_UIDS = new Set([
    // "w5jtigflSVezQwUvnsgM7AY4ZK73", // example
  ]);

  // ---------- Helpers ----------
  const money = (n) => "Rs" + Number(n || 0).toFixed(0);

  function parseSizes(text) {
    return String(text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [label, price] = l.split("|").map((x) => (x || "").trim());
        return { label, price: Number(price || 0) || 0 };
      });
  }
  function renderSizesInline(sizes) {
    return (sizes || [])
      .map((s) => ${s.label} (${money(s.price)}))
      .join(", ");
  }
  function resetProductForm() {
    docIdEl.value = "";
    categoryEl.value = "perfume";
    nameEl.value = "";
    priceEl.value = "";
    brandEl.value = "";
    sizesEl.value = "";
    descEl.value = "";
    imagesEl.value = "";
    activeEl.checked = true;
  }

  // Cloudinary unsigned upload (returns secure_url)
  async function uploadToCloudinary(file) {
    if (!file) return null;
    if (!window.CLOUDINARY_CLOUD_NAME || !window.CLOUDINARY_UPLOAD_PRESET) {
      alert("Cloudinary config missing. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in admin.html.");
      throw new Error("Cloudinary missing config");
    }
    const url = https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/upload;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", window.CLOUDINARY_UPLOAD_PRESET);
    // Optional: put all product images in a folder
    fd.append("folder", "products");

    const res = await fetch(url, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error("Cloudinary error:", data);
      throw new Error(data?.error?.message || "Cloudinary upload failed");
    }
    return data.secure_url;
  }

  // ---------- AUTH ----------
  loginBtn?.addEventListener("click", async () => {
    try {
      await auth.signInWithEmailAndPassword(email.value.trim(), password.value.trim());
    } catch (e) {
      alert(e.message);
    }
  });
  signupBtn?.addEventListener("click", async () => {
    try {
      const cred = await auth.createUserWithEmailAndPassword(email.value.trim(), password.value.trim());
      alert(Signed up. Your UID: ${cred.user.uid}\nAdd to Firestore rules if you restrict writes.);
    } catch (e) {
      alert(e.message);
    }
  });
  logoutBtn?.addEventListener("click", () => auth.signOut());

  auth.onAuthStateChanged((u) => {
    const okay = !!u && (ALLOWED_UIDS.size === 0 || ALLOWED_UIDS.has(u.uid));
    authStatus.textContent = u
      ? okay
        ? Signed in as ${u.email}
        : Signed in as ${u.email} (unauthorized for admin UI)
      : "Not signed in";

    logoutBtn.style.display = u ? "inline-block" : "none";
    siteSection.style.display = okay ? "block" : "none";
    productSection.style.display = okay ? "block" : "none";
    listSection.style.display = okay ? "block" : "none";

    if (okay) {
      loadSite();
      loadProducts();
    } else {
      tableBody.innerHTML = <tr><td colspan="6">Sign in to manage products.</td></tr>;
    }
  });

  // ---------- SITE SETTINGS ----------
  async function loadSite() {
    try {
      siteStatus.textContent = "Loading…";
      siteBannerPreview.innerHTML = "";
      siteGalleryPreview.innerHTML = "";

      const snap = await db.collection("site").doc("home").get();
      const data = snap.exists ? snap.data() : {};

      siteHeroTitle.value = data.heroTitle || "";
      siteHeroSubtitle.value = data.heroSubtitle || "";
      siteFeaturedCategory.value = (data.featuredCategory || "perfume").toLowerCase();
      siteShowFeatured.checked = !!data.showFeatured;

      if (data.bannerImage) {
        const img = document.createElement("img");
        img.src = data.bannerImage;
        siteBannerPreview.appendChild(img);
      }
      if (Array.isArray(data.gallery) && data.gallery.length) {
        data.gallery.forEach((u) => {
          const img = document.createElement("img");
          img.src = u;
          siteGalleryPreview.appendChild(img);
        });
      }
      siteStatus.textContent = "Ready.";
    } catch (e) {
      console.error(e);
      siteStatus.textContent = "Failed to load site settings.";
    }
  }

  // preview chosen site images
  siteBanner?.addEventListener("change", () => {
    siteBannerPreview.innerHTML = "";
    const f = siteBanner.files?.[0];
    if (f) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(f);
      siteBannerPreview.appendChild(img);
    }
  });
  siteGallery?.addEventListener("change", () => {
    siteGalleryPreview.innerHTML = "";
    const files = Array.from(siteGallery.files || []);
    files.forEach((f) => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(f);
      siteGalleryPreview.appendChild(img);
    });
  });

  siteReload?.addEventListener("click", loadSite);

  siteSave?.addEventListener("click", async () => {
    try {
      siteStatus.textContent = "Saving…";

      // Current record
      const docRef = db.collection("site").doc("home");
      const snap = await docRef.get();
      const existing = snap.exists ? snap.data() : {};

      const payload = {
        heroTitle: siteHeroTitle.value.trim(),
        heroSubtitle: siteHeroSubtitle.value.trim(),
        featuredCategory: siteFeaturedCategory.value.trim().toLowerCase(),
        showFeatured: !!siteShowFeatured.checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Banner replace (if a new file chosen)
      if (siteBanner.files && siteBanner.files[0]) {
        const url = await uploadToCloudinary(siteBanner.files[0]);
        payload.bannerImage = url;
      } else if (existing.bannerImage) {
        // keep current if not replaced
        payload.bannerImage = existing.bannerImage;
      }

      // Gallery overwrite (if files chosen) else keep old
      if (siteGallery.files && siteGallery.files.length) {
        const urls = [];
        for (const f of Array.from(siteGallery.files)) {
          const u = await uploadToCloudinary(f);
          urls.push(u);
        }
        payload.gallery = urls;
      } else if (Array.isArray(existing.gallery)) {
        payload.gallery = existing.gallery;
      } else {
        payload.gallery = [];
      }

      await docRef.set(payload, { merge: true });
      siteStatus.textContent = "Saved ✓";
      await loadSite();
      alert("Homepage settings saved.");
    } catch (e) {
      console.error(e);
      siteStatus.textContent = "Save failed.";
      alert("Failed to save site settings: " + e.message);
    }
  });

  // ---------- PRODUCTS ----------
  async function loadProducts() {
    try {
      tableBody.innerHTML = <tr><td colspan="6">Loading…</td></tr>;
      const cat = (filterCategory.value || "perfume").toLowerCase();
      const snap = await db
        .collection("products")
        .where("category", "==", cat)
        .orderBy("name")
        .get();

      if (snap.empty) {
        tableBody.innerHTML = <tr><td colspan="6">No products in ${cat}.</td></tr>;
        return;
      }

      tableBody.innerHTML = "";
      snap.forEach((doc) => {
        const p = doc.data();
        const tr = document.createElement("tr");

        const firstImg = (Array.isArray(p.images) && p.images[0]) || p.imageURL || "";
        const sizesInline = renderSizesInline(p.sizes || []);
        tr.innerHTML = `
          <td>${firstImg ? <img src="${firstImg}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5"> : ""}</td>
          <td>
            <div style="font-weight:600">${p.name || ""}</div>
            ${p.brand ? <div class="muted">${p.brand}</div> : ""}
          </td>
          <td>${sizesInline || "—"}</td>
          <td>${money(p.basePrice || 0)}</td>
          <td>${p.active ? "Yes" : "No"}</td>
          <td>
            <button class="btn" data-edit="${doc.id}">Edit</button>
            <button class="btn danger" data-del="${doc.id}">Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

      // Bind actions
      tableBody.querySelectorAll("[data-edit]").forEach((btn) => {
        btn.addEventListener("click", () => loadIntoForm(btn.dataset.edit));
      });
      tableBody.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Delete this product?")) return;
          await db.collection("products").doc(btn.dataset.del).delete();
          loadProducts();
        });
      });
    } catch (e) {
      console.error(e);
      tableBody.innerHTML = <tr><td colspan="6">Failed to load products.</td></tr>;
    }
  }

  async function loadIntoForm(id) {
    try {
      const d = await db.collection("products").doc(id).get();
      if (!d.exists) return alert("Product not found.");
      const p = d.data();

      docIdEl.value = d.id;
      categoryEl.value = p.category || "perfume";
      nameEl.value = p.name || "";
      priceEl.value = p.basePrice || "";
      brandEl.value = p.brand || "";
      sizesEl.value = (Array.isArray(p.sizes) ? p.sizes : [])
        .map((s) => ${s.label} | ${s.price})
        .join("\n");
      descEl.value = p.description || "";
      activeEl.checked = !!p.active;

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
    }
  }

  // Save / Update product (images append)
  saveBtn?.addEventListener("click", async () => {
    try {
      const id = docIdEl.value || db.collection("products").doc().id;
      const sizes = parseSizes(sizesEl.value);
      const base = Number(priceEl.value || 0) || 0;

      // Existing doc (for merging images)
      let existing = {};
      if (docIdEl.value) {
        const snap = await db.collection("products").doc(id).get();
        existing = snap.exists ? snap.data() : {};
      }

      const data = {
        name: nameEl.value.trim(),
        basePrice: base,
        brand: brandEl.value.trim(),
        sizes,
        description: descEl.value.trim(),
        category: (categoryEl.value || "perfume").toLowerCase(),
        active: !!activeEl.checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (!docIdEl.value) {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      }

      // Upload selected images (append to existing)
      let images = Array.isArray(existing.images) ? existing.images.slice() : [];
      if (imagesEl.files && imagesEl.files.length) {
        for (const f of Array.from(imagesEl.files)) {
          const url = await uploadToCloudinary(f);
          if (url) images.push(url);
        }
      }

      // Ensure main imageURL is set (first image)
      if (!images.length) {
        // keep existing imageURL if present
        if (existing.imageURL) data.imageURL = existing.imageURL;
      } else {
        data.images = images;
        data.imageURL = images[0];
      }

      await db.collection("products").doc(id).set(data, { merge: true });
      alert("Saved ✓");
      resetProductForm();
      await loadProducts();
    } catch (e) {
      console.error(e);
      alert("Save failed: " + e.message);
    }
  });

  resetBtn?.addEventListener("click", resetProductForm);

  refreshBtn?.addEventListener("click", loadProducts);
  filterCategory?.addEventListener("change", loadProducts);

  // ---------- Done ----------
  console.log("✅ Admin JS ready");
})();
