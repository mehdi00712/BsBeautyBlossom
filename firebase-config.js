// firebase-config.js  (PLAIN JS — do NOT wrap in <script> tags)
if (typeof firebase === 'undefined') {
  throw new Error('Firebase SDK not loaded before firebase-config.js');
}

// Your config
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

// Initialize once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Shortcuts
window.auth = firebase.auth ? firebase.auth() : undefined;
window.db   = firebase.firestore ? firebase.firestore() : undefined;
window.rtdb = firebase.database ? firebase.database() : undefined;

console.log('✅ Firebase ready', { apps: firebase.apps.length, hasDb: !!window.db });
