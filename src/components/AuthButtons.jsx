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
  const [err, setErr] = useState("");

  useEffect(() => {
    handleRedirectResultOnce().catch(() => {});
    return startAuthListener((u) => {
      setUser(u);
      setPending(false);
    });
  }, []);

  if (pending) {
    // simple spacer so layout doesn't jump while we check the session
    return <div className={`h-9 ${className}`} />;
  }

  if (user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img
          src={user.photoURL || ""}
          alt=""
          className="h-8 w-8 rounded-full"
          referrerPolicy="no-referrer"
        />
        <span className="text-sm truncate max-w-[10rem]">
          {user.displayName || user.email}
        </span>
        <Button variant="outline" onClick={signOutUser}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={() =>
          googleSignIn().catch((e) => setErr(e?.message || "Sign-in failed"))
        }
      >
        Sign in with Google
      </Button>
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}