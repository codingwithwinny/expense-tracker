// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// ---- 1) Init ----
const firebaseConfig = {
  apiKey: "AIzaSyDQs2iH0aFwB6Ii_Jpv1EU6JkNddpa12zc",
  authDomain: "ancyexpensetracker.firebaseapp.com",
  projectId: "ancyexpensetracker",
  storageBucket: "ancyexpensetracker.firebasestorage.app",
  messagingSenderId: "37602943977",
  appId: "1:37602943977:web:82b5888edd0b1f79ebe178",
  measurementId: "G-LJCZN39EN0",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// optional offline cache
enableIndexedDbPersistence(db).catch(() => {});

// ---- 2) Auth helpers ----
const provider = new GoogleAuthProvider();

export function startAuthListener(callback) {
  // returns unsubscribe
  return onAuthStateChanged(auth, (user) => callback(user || null));
}

export async function googleSignIn() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // Fallback for iOS Safari / popup blocked
    if (
      e?.code === "auth/popup-blocked" ||
      e?.code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export async function handleRedirectResultOnce() {
  try {
    await getRedirectResult(auth);
  } catch {
    // no-op if there was no redirect
  }
}

export async function signOutUser() {
  await signOut(auth);
}

// ---- 3) App data helpers ----
export async function loadMonth(uid, monthKey) {
  const ref = doc(db, "users", uid, "months", monthKey);
  const snap = await getDoc(ref);
  return snap.exists()
    ? snap.data()
    : { incomeSources: [], expenses: [], catBudgets: {} };
}

export async function saveMonth(uid, monthKey, payload) {
  const ref = doc(db, "users", uid, "months", monthKey);
  await setDoc(
    ref,
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
export async function googleRedirectSignIn() {
  await signInWithRedirect(auth, provider);
}