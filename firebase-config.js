// firebase-config.js (Compat SDK initializer)
// Pages that need Firestore MUST include (in this order):
// 1) https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js
// 2) https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js
// 3) this file (firebase-config.js)

if (!window.firebase) {
  throw new Error("Firebase SDK not loaded. Include firebase-app-compat + firebase-firestore-compat before firebase-config.js");
}

const firebaseConfig = {
  apiKey: "AIzaSyBSA9iP3kjdYZM0eXt_KOXAgPT_z74cGJ8",
  authDomain: "beauty-blossom-5247d.firebaseapp.com",
  databaseURL: "https://beauty-blossom-5247d-default-rtdb.firebaseio.com",
  projectId: "beauty-blossom-5247d",
  storageBucket: "beauty-blossom-5247d.firebasestorage.app",
  messagingSenderId: "916163644879",
  appId: "1:916163644879:web:2bf1f40e21b1abd73816ba",
  measurementId: "G-1QD13LXLRM"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Expose Firestore for the rest of your scripts
window.db = firebase.firestore();
