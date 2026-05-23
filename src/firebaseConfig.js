// Put your Firebase web app config here to skip the first-launch setup screen.
// Firebase Console → Project settings → General → Your apps → SDK setup and configuration.

export const firebaseConfig = {
  apiKey: "AIzaSyBR5DVdPrL_-yEoDivvXjaS_k7TqptEPCE",
  authDomain: "devvault-phevenam.firebaseapp.com",
  projectId: "devvault-phevenam",
  storageBucket: "devvault-phevenam.firebasestorage.app",
  messagingSenderId: "1011527462549",
  appId: "1:1011527462549:web:4e78489f43d0c744eb759c",
};

export const hasBundledFirebaseConfig =
  Object.values(firebaseConfig).every(Boolean);
