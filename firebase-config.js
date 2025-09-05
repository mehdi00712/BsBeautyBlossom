// firebase-config.js (Compat SDK initializer)
// Include these in pages BEFORE this file:
//   <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

if (!window.firebase) {
  throw new Error("Firebase SDK not loaded. Add firebase-app-compat & firebase-firestore-compat before firebase-config.js");
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

window.db = firebase.firestore();
