// firebase-config.js — load AFTER firebase-app-compat.js AND firebase-firestore-compat.js
(function () {
  if (!window.firebase) {
    throw new Error("Firebase SDK not loaded. Include firebase-app-compat.js and firebase-firestore-compat.js BEFORE firebase-config.js");
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

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  if (!firebase.firestore) {
    throw new Error("firebase-firestore-compat.js not loaded — add it BEFORE firebase-config.js");
  }

  // Expose Firestore (and RTDB only if you load its compat script on that page)
  window.db = firebase.firestore();
  try { window.rtdb = firebase.database?.(); } catch (_) {}

  console.log("✅ Firebase ready", { apps: firebase.apps.length, hasDb: !!window.db });
})();
