<!-- firebase-config.js -->
<script>
// Requires compat SDKs loaded on each page BEFORE this file:
// firebase-app-compat.js (+ auth-compat.js where auth is used, + firestore-compat.js where db is used)
// (On cart.html we also load firebase-database-compat.js)

if (!window.firebase) {
  throw new Error("Firebase SDK not loaded. Include compat scripts before firebase-config.js");
}
// Your project config
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

// Shortcuts
window.auth = firebase.auth?.();
window.db = firebase.firestore?.();
window.rtdb = firebase.database?.();
if (!window.db) console.error("firebase-config.js did not initialize Firestore — ensure firestore-compat.js is included on this page before firebase-config.js");
</script>
