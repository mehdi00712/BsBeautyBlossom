// firebase-config.js — must be loaded AFTER firebase-app-compat.js + firebase-auth-compat.js + firebase-firestore-compat.js

if (!window.firebase) {
  throw new Error("Firebase SDK not loaded. Add compat scripts before firebase-config.js");
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

// Initialize Firebase if not already
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export globals so admin.js can see them
window.auth = firebase.auth();
window.db   = firebase.firestore();

console.log("✅ Firebase initialized, auth and db ready", window.auth, window.db);
