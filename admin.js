// Ensure Firebase is ready
if (!window.firebase || !window.auth || !window.db) {
  throw new Error("❌ Firebase not initialized: ensure firebase-auth-compat.js + firebase-config.js loaded first.");
}

// Auth elements
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("auth-status");

const siteSection = document.getElementById("site-section");
const productSection = document.getElementById("product-section");
const listSection = document.getElementById("list-section");

// Allowed admins
const ALLOWED_ADMIN_UIDS = new Set([
  "w5jtigflSVezQwUvnsgM7AY4ZK73", // your UID
  "nyQYzolZI2fLFqIkAPNHHbcSJ2p1"  // extra admin UID
]);

// Login
loginBtn?.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passwordEl.value.trim();
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    console.log("Logged in", cred.user.uid);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// Log out
logoutBtn?.addEventListener("click", async () => {
  await auth.signOut();
});

// Auth state listener
auth.onAuthStateChanged((user) => {
  if (user && ALLOWED_ADMIN_UIDS.has(user.uid)) {
    statusEl.textContent = "Signed in as " + (user.email || user.uid);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    siteSection.style.display = "block";
    productSection.style.display = "block";
    listSection.style.display = "block";
  } else {
    statusEl.textContent = user ? "Not authorized" : "Please log in.";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    siteSection.style.display = "none";
    productSection.style.display = "none";
    listSection.style.display = "none";
  }
});
