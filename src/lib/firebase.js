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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
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

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

/* ---------------------------------------
   Firebase Functions (AI endpoints)
---------------------------------------- */
const functions = getFunctions(app, "us-central1");
export const getSpendingInsightsFn = httpsCallable(
  functions,
  "getSpendingInsights",
  { timeout: 60000 },
);
export const parseExpenseFn = httpsCallable(functions, "parseExpense", {
  timeout: 30000,
});
export const parseBankStatementFn = httpsCallable(
  functions,
  "parseBankStatement",
  { timeout: 60000 },
);

/* ---------------------------------------
   Auth helpers
---------------------------------------- */
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true ||
    window.navigator.userAgent.includes("wv")
  );
}

export function startAuthListener(cb) {
  return onAuthStateChanged(auth, (user) => cb(user || null));
}

export let redirectResultReady = false;
let _resolveRR;
const _rrPromise = new Promise((res) => (_resolveRR = res));
export function waitForRedirectResult() {
  return redirectResultReady ? Promise.resolve() : _rrPromise;
}

export async function handleRedirectResultOnce() {
  const pending = sessionStorage.getItem("auth:pendingRedirect");
  console.log("Checking for redirect result...", { pending });

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
      new CustomEvent("auth:error", { detail: e?.message || String(e) }),
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
        await signInWithPopup(auth, provider);
        return;
      } catch (popupError) {
        console.log("PWA popup failed, falling back to redirect:", popupError);
        sessionStorage.setItem("auth:pendingRedirect", "1");
        await signInWithRedirect(auth, provider);
        return;
      }
    }

    console.log("Regular web detected, trying popup first");
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Authentication error:", error);
    try {
      sessionStorage.setItem("auth:pendingRedirect", "1");
      await signInWithRedirect(auth, provider);
    } catch (redirectError) {
      console.error("Redirect also failed:", redirectError);
      throw redirectError;
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
export async function loadUserDoc(uid) {
  if (!uid) return null;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data();
  } catch (err) {
    console.error("loadUserDoc failed:", err);
    return null;
  }
}

export async function saveUserDoc(uid, data) {
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid);
    await setDoc(ref, data, { merge: true });
  } catch (err) {
    console.error("saveUserDoc failed:", err);
    throw err;
  }
}

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
    { merge: true },
  );
}
