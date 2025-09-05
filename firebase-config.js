// firebase-config.js (defensive, no throws; sets window.db safely + logs)
(function () {
  try {
    console.log('[firebase-config] start');
    if (typeof firebase === 'undefined') {
      console.warn('[firebase-config] window.firebase is undefined. Did the SDKs load?');
      return; // don't throw; products.js waits and will show a friendly message
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
      console.log('[firebase-config] initializeApp() done');
    } else {
      console.log('[firebase-config] using existing app');
    }

    // Make globals
    window.auth = firebase.auth ? firebase.auth() : undefined;
    window.db   = firebase.firestore ? firebase.firestore() : undefined;
    window.rtdb = firebase.database ? firebase.database() : undefined;

    console.log('[firebase-config] ready →',
      'firebase:', typeof firebase,
      'db:', typeof window.db,
      'auth:', typeof window.auth
    );
  } catch (e) {
    console.error('[firebase-config] ERROR:', e);
  }
})();
