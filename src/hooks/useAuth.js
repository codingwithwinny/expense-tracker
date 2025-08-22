// src/hooks/useAuth.js
import { useEffect, useState } from "react";
import { startAuthListener, handleRedirectResultOnce } from "@/lib/firebase";

/**
 * Keeps you signed-in state in React.
 * Returns: { user, pending }
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    // Resolve redirect sign-in (if any) once
    handleRedirectResultOnce().catch(() => {});
    // Subscribe to auth changes
    const unsub = startAuthListener((u) => {
      setUser(u);
      setPending(false);
    });
    return unsub;
  }, []);

  return { user, pending };
}