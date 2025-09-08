// firebase-config.js — must load AFTER:
//   firebase-app-compat.js
//   firebase-auth-compat.js   (needed on admin.html)
//   firebase-firestore-compat.js

(function () {
  if (!window.firebase) throw new Error("Firebase SDK not loaded.");

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

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  // Always expose Firestore
  if (!firebase.firestore) {
    throw new Error("firebase-firestore-compat.js not loaded");
  }
  window.db = firebase.firestore();

  // Expose Auth when the page loaded auth-compat (admin.html does)
  if (firebase.auth) {
    window.auth = firebase.auth();
  } else {
    // On catalog pages you might not include auth-compat, that’s fine.
    window.auth = null;
  }

  console.log("✅ Firebase ready", {
    apps: firebase.apps.length,
    hasDb: !!window.db,
    hasAuth: !!window.auth
  });
})();
