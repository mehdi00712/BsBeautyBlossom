<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Admin – B’s Beauty Blossom</title>
  <link rel="stylesheet" href="style.css"/>

  <!-- Firebase (ORDER MATTERS) -->
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
  <script src="firebase-config.js"></script>

  <!-- Cloudinary config (for image uploads) -->
  <script>
    window.CLOUDINARY_CLOUD_NAME = "dlwk13ady";
    window.CLOUDINARY_UPLOAD_PRESET = "unsigned_bbb";
  </script>
</head>
<body>
<header>
  <nav class="navbar">
    <div class="logo">
      <a href="index.html"><span class="logo-mark">B’s</span> Beauty Blossom</a>
    </div>
    <ul class="nav-links">
      <li><a href="index.html">Home</a></li>
      <li><a href="perfume.html">Perfume</a></li>
      <li><a href="body.html">Body</a></li>
      <li><a href="skincare.html">Skincare</a></li>
      <li><a href="cosmetics.html">Cosmetics</a></li>
      <li><a href="jewellery.html">Jewellery</a></li>
      <li><a href="gift.html">Gift</a></li>
      <li><a href="cart.html">🛒 Cart (<span id="cart-count">0</span>)</a></li>
      <li><a href="admin.html" class="active">Admin</a></li>
    </ul>
    <div class="hamburger" aria-label="menu" aria-expanded="false">&#9776;</div>
  </nav>
  <div id="nav-overlay"></div>
</header>

<main class="admin-wrap">
  <h1>Admin Dashboard</h1>

  <!-- Auth -->
  <section id="auth-section" class="card">
    <h2>Login</h2>
    <label for="email">Admin email</label>
    <input id="email" type="email" placeholder="Email">
    <label for="password">Password</label>
    <input id="password" type="password" placeholder="Password">
    <div style="display:flex;gap:8px;margin:8px 0">
      <button id="loginBtn" class="btn">Log In</button>
      <button id="signupBtn" class="btn muted">Sign Up (first time)</button>
      <button id="logoutBtn" class="btn danger" style="display:none">Log Out</button>
    </div>
    <p id="auth-status" class="muted"></p>
  </section>

  <div class="admin-grid">

    <!-- Product Form -->
    <section id="product-section" class="card" style="display:none">
      <h2>Add / Edit Product</h2>

      <div class="row">
        <label for="category">Category</label>
        <select id="category">
          <option value="perfume">Perfume</option>
          <option value="body">Body</option>
          <option value="skincare">Skincare</option>
          <option value="cosmetics">Cosmetics</option>
          <option value="jewellery">Jewellery</option>
          <option value="gift">Gift</option>
        </select>
      </div>

      <div class="row row-2">
        <div>
          <label for="name">Product name</label>
          <input id="name" placeholder="Product name">
        </div>
        <div>
          <label for="price">Base price (Rs)</label>
          <input id="price" type="number" placeholder="Base price (Rs)">
        </div>
      </div>

      <div class="row row-2">
        <div>
          <label for="brand">Brand (optional)</label>
          <input id="brand" placeholder="Brand">
        </div>
        <div>
          <label>Active</label><br>
          <label><input id="active" type="checkbox" checked> Visible on site</label>
        </div>
      </div>

      <div class="row">
        <label for="sizes">
          Sizes (one per line):
          <small>Use <b>Label | Price | Stock</b> — e.g. <code>100ml | 2350 | 5</code>. Stock is optional.</small>
        </label>
        <textarea id="sizes" rows="4" placeholder="100ml | 2350 | 5&#10;30ml | 1550 | 2"></textarea>
      </div>

      <div class="row">
        <label for="stock">
          Global Stock (no sizes)
          <small>For products without sizes. Leave blank if using size-based stock.</small>
        </label>
        <input id="stock" type="number" min="0" placeholder="e.g. 10">
      </div>

      <div class="row">
        <label for="description">Short description (optional)</label>
        <textarea id="description" rows="3" placeholder="Description"></textarea>
      </div>

      <div class="row">
        <label for="images">Image(s) (upload)</label>
        <input id="images" type="file" accept="image/*" multiple>
      </div>

      <div style="display:flex;gap:8px">
        <button id="saveBtn" class="btn btn-primary">Save Product</button>
        <button id="resetBtn" class="btn muted">Reset Form</button>
      </div>
      <input type="hidden" id="docId">
    </section>

    <!-- Product List -->
    <section id="list-section" class="card" style="display:none">
      <h2>Products</h2>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <select id="filterCategory">
          <option value="perfume">Perfume</option>
          <option value="body">Body</option>
          <option value="skincare">Skincare</option>
          <option value="cosmetics">Cosmetics</option>
          <option value="jewellery">Jewellery</option>
          <option value="gift">Gift</option>
        </select>
        <button id="refreshBtn" class="btn muted">Refresh</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Image</th><th>Name</th><th>Sizes / Stock</th><th>Base</th><th>Active</th><th>Actions</th></tr>
          </thead>
          <tbody id="tableBody"><tr><td colspan="6">Loading…</td></tr></tbody>
        </table>
      </div>
    </section>
  </div>
</main>

<footer class="site-footer">
  <p>© 2025 B’s Beauty Blossom • Admin</p>
</footer>

<!-- Scripts LAST -->
<script src="script.js" defer></script>
<script src="admin.js" defer></script>
</body>
</html>
