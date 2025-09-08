<!-- firebase-config.js -->
<script>
  // Make sure compat SDKs are loaded BEFORE this file:
  // firebase-app-compat.js, firebase-auth-compat.js (admin only), firebase-firestore-compat.js
  if (!window.firebase) {
    throw new Error("Firebase SDK not loaded. Include the compat scripts before firebase-config.js");
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

  window.db   = firebase.firestore();
  // Only admin.html uses auth; other pages don’t require it, but exposing is fine:
  window.auth = firebase.auth?.();
</script>
