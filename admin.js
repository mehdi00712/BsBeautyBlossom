if (!window.firebase || !window.db) {
  throw new Error("❌ Firebase not initialized: check firebase-config.js is loaded before admin.js");
}

const auth = firebase.auth();
const db   = firebase.firestore();

// Elements
const loginBtn  = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusEl  = document.getElementById("auth-status");

// 🔑 AUTH
auth.onAuthStateChanged(user => {
  if (user) {
    statusEl.textContent = `✅ Logged in as ${user.email}`;
    document.getElementById("site-section").style.display = "block";
    document.getElementById("product-section").style.display = "block";
    document.getElementById("list-section").style.display = "block";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    statusEl.textContent = "❌ Not logged in";
    document.getElementById("site-section").style.display = "none";
    document.getElementById("product-section").style.display = "none";
    document.getElementById("list-section").style.display = "none";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

// Login
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const pass  = document.getElementById("password").value.trim();
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    statusEl.textContent = "❌ " + e.message;
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
});
