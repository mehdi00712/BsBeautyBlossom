// firebase-config.js — load AFTER firebase-app-compat.js + firebase-auth-compat.js + firebase-firestore-compat.js
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

  if (!firebase.auth || !firebase.firestore) {
    throw new Error("Load firebase-auth-compat.js and firebase-firestore-compat.js BEFORE firebase-config.js");
  }

  window.auth = firebase.auth();
  window.db   = firebase.firestore();

  console.log("✅ Firebase initialized:", { apps: firebase.apps.length, hasAuth: !!window.auth, hasDb: !!window.db });
})();
