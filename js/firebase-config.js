/**
 * SHADA1st Apparel Shop — Firebase Configuration & Initialization
 * Module uses standard Firebase JS SDK (v10 modular CDN).
 */

// Default placeholder config. Replace with your actual Firebase Project credentials in Admin Settings or edit here.
export const defaultFirebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

let db = null;
let auth = null;
let storage = null;
let isFirebaseActive = false;

export async function initFirebase(customConfig = null) {
  const config = customConfig || getStoredFirebaseConfig() || defaultFirebaseConfig;
  
  if (!config.apiKey || !config.projectId) {
    console.warn("SHADA1st: No active Firebase credentials found. Running in LocalStorage Engine mode.");
    isFirebaseActive = false;
    return { isFirebaseActive: false, db: null, auth: null, storage: null };
  }

  try {
    // Dynamically import Firebase App and Firestore modules from official CDN
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    
    const app = initializeApp(config);
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log("SHADA1st: Connected successfully to Firebase Firestore (" + config.projectId + ")");
    return { isFirebaseActive: true, db, auth, storage };
  } catch (error) {
    console.error("SHADA1st: Failed to initialize Firebase:", error);
    isFirebaseActive = false;
    return { isFirebaseActive: false, db: null, auth: null, storage: null, error };
  }
}

export function getStoredFirebaseConfig() {
  try {
    const stored = localStorage.getItem("shada_firebase_config");
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

export function saveStoredFirebaseConfig(config) {
  try {
    localStorage.setItem("shada_firebase_config", JSON.stringify(config));
  } catch (e) {
    console.error("Failed to store Firebase config", e);
  }
}

export function isFirebaseConfigured() {
  const config = getStoredFirebaseConfig() || defaultFirebaseConfig;
  return Boolean(config && config.apiKey && config.projectId);
}
