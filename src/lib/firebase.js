// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

/* ---------------------------------------
   Firebase init
---------------------------------------- */

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDQs2iH0aFwB6Ii_Jpv1EU6JkNddpa12zc",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "ancyexpensetracker.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ancyexpensetracker",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "ancyexpensetracker.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "37602943977",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:37602943977:web:82b5888edd0b1f79ebe178",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-LJCZN39EN0",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => {});

/* ---------------------------------------
   Auth helpers
---------------------------------------- */
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true ||
    window.navigator.userAgent.includes("wv") // Android WebView
  );
}

export function startAuthListener(cb) {
  return onAuthStateChanged(auth, (user) => cb(user || null));
}

// A tiny “ready” promise some code might await (optional)
export let redirectResultReady = false;
let _resolveRR;
const _rrPromise = new Promise((res) => (_resolveRR = res));
export function waitForRedirectResult() {
  return redirectResultReady ? Promise.resolve() : _rrPromise;
}

// ✅ SINGLE definition — do not duplicate this function below
export async function handleRedirectResultOnce() {
  const pending = sessionStorage.getItem("auth:pendingRedirect");
  console.log("Checking for redirect result...", { pending });

  // Add PWA-specific logging
  if (isStandalone()) {
    console.log("🔄 PWA detected during redirect check");
  }

  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("✅ Redirect result found:", {
        user: result.user?.email,
        credential: result.credential?.providerId,
        operationType: result.operationType,
      });

      // Dispatch success event
      window.dispatchEvent(new CustomEvent("auth:success", { detail: result }));
    } else {
      console.log("No redirect result found");
      if (pending) {
        console.log("⚠️ Pending redirect flag exists but no result found");
      }
    }
  } catch (e) {
    console.error("❌ Error handling redirect result:", e);
    window.dispatchEvent(
      new CustomEvent("auth:error", { detail: e?.message || String(e) })
    );
  } finally {
    if (pending) {
      console.log("Clearing pending redirect flag");
      sessionStorage.removeItem("auth:pendingRedirect");
    }
    redirectResultReady = true;
    _resolveRR?.();
  }
}

export async function googleSignIn() {
  try {
    // Check if we're in a PWA or standalone mode
    const isPWA = isStandalone();

    console.log("Environment check:", {
      isStandalone: isStandalone(),
      userAgent: window.navigator.userAgent,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isPWA: isPWA,
    });

    if (isPWA) {
      console.log("PWA detected, trying popup first (fallback to redirect)");
      try {
        // Try popup first for PWA (more reliable)
        await signInWithPopup(auth, provider);
        return;
      } catch (popupError) {
        console.log("PWA popup failed, falling back to redirect:", popupError);
        // Fallback to redirect if popup fails
        console.log("Current URL before redirect:", window.location.href);
        sessionStorage.setItem("auth:pendingRedirect", "1");
        console.log("About to redirect to Google...");
        await signInWithRedirect(auth, provider);
        console.log("Redirect initiated successfully");
        return;
      }
    }

    // Try popup first for regular web
    console.log("Regular web detected, trying popup first");
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Authentication error:", error);
    console.log("Popup failed, falling back to redirect:", error);
    // Fallback to redirect if popup fails
    try {
      sessionStorage.setItem("auth:pendingRedirect", "1");
      await signInWithRedirect(auth, provider);
    } catch (redirectError) {
      console.error("Redirect also failed:", redirectError);
      throw redirectError; // Re-throw the error so it can be handled by the UI
    }
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export async function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/* ---------------------------------------
   App data helpers
---------------------------------------- */
export async function loadMonth(uid, monthKey) {
  const ref = doc(db, "users", uid, "months", monthKey);
  const snap = await getDoc(ref);

  const base = {
    incomeSources: [],
    expenses: [],
    catBudgets: {},
    categories: DEFAULT_CATEGORIES,
  };

  if (!snap.exists()) {
    await setDoc(ref, base, { merge: true });
    return base;
  }

  const data = snap.data() || {};
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    data.categories = DEFAULT_CATEGORIES;
    await setDoc(ref, { categories: data.categories }, { merge: true });
  }
  if (!Array.isArray(data.incomeSources)) data.incomeSources = [];
  if (!Array.isArray(data.expenses)) data.expenses = [];
  if (typeof data.catBudgets !== "object" || data.catBudgets === null) {
    data.catBudgets = {};
  }
  return data;
}

export async function saveMonth(uid, monthKey, payload) {
  const ref = doc(db, "users", uid, "months", monthKey);
  await setDoc(
    ref,
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
