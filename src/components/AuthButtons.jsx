// src/components/AuthButtons.jsx
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import {
  googleSignIn,
  signOutUser,
  startAuthListener,
  handleRedirectResultOnce,
} from "@/lib/firebase";

export default function AuthButtons({ className = "" }) {
  const [user, setUser] = useState(null);
  const [pending, setPending] = useState(true);
  const [redirecting, setRedirecting] = useState(
    !!sessionStorage.getItem("auth:pendingRedirect")
  );
  const [err, setErr] = useState("");

  useEffect(() => {
    handleRedirectResultOnce().catch(() => {});
    const off = startAuthListener((u) => {
      setUser(u);
      setPending(false);
      setRedirecting(false);
      setErr("");
    });
    function onAuthError(e) {
      setErr(e?.detail || "Authentication failed.");
      setRedirecting(false);
      sessionStorage.removeItem("auth:pendingRedirect");
    }
    window.addEventListener("auth:error", onAuthError);
    return () => {
      off();
      window.removeEventListener("auth:error", onAuthError);
    };
  }, []);

  // Reserve space, avoid layout shift
  if (pending || redirecting) {
    return (
      <div className={`flex items-center gap-2 w-full sm:w-auto ${className}`}>
        <Button disabled className="h-9 w-full sm:w-auto whitespace-nowrap">
          Please wait…
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex items-center gap-2 w-full sm:w-auto ${className}`}>
        <Button
          onClick={() =>
            googleSignIn().catch((e) => setErr(e?.message || "Sign-in failed"))
          }
          className="h-9 w-full sm:w-auto whitespace-nowrap"
        >
          Sign in with Google
        </Button>
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 w-full sm:w-auto ${className}`}>
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.displayName || "User"}
          className="h-6 w-6 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="hidden sm:block truncate max-w-[10rem] text-xs text-gray-600">
        {user.displayName || user.email}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-full sm:w-auto shrink-0 whitespace-nowrap"
        onClick={() =>
          signOutUser().catch((e) => setErr(e?.message || "Sign-out failed"))
        }
      >
        Sign out
      </Button>
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}
