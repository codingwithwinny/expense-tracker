// src/hooks/useAuth.js
import { useEffect, useState, useCallback } from "react";
import {
  startAuthListener,
  waitForRedirectResult, // ✅ await this (a promise)
  googleSignIn,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
} from "@/lib/firebase";

/**
 * useAuth – subscribes to Firebase Auth and exposes helpers
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsub;
    (async () => {
      // Ensure any pending sign-in redirect is fully processed first
      await waitForRedirectResult();
      unsub = startAuthListener((u) => {
        setUser(u);
        setLoading(false);
        setError("");
      });
    })();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const signIn = useCallback(async () => {
    try {
      setError("");
      await googleSignIn();
    } catch (e) {
      setError(e?.message || "Sign-in failed");
    }
  }, []);

  const signInWithEmailPassword = useCallback(async (email, password) => {
    try {
      setError("");
      await signInWithEmail(email, password);
    } catch (e) {
      setError(e?.message || "Sign-in failed");
      throw e;
    }
  }, []);

  const signUpWithEmailPassword = useCallback(async (email, password) => {
    try {
      setError("");
      await signUpWithEmail(email, password);
    } catch (e) {
      setError(e?.message || "Sign-up failed");
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError("");
      await signOutUser();
    } catch (e) {
      setError(e?.message || "Sign-out failed");
    }
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    signOut,
  };
}
