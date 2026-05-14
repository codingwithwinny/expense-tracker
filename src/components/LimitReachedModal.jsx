import React, { useState, useEffect } from "react";
import { Zap, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

function timeUntilMidnightUTC() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const diff = midnight - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function LimitReachedModal({
  isOpen,
  onClose,
  featureName,
  source,
  userId,
}) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [writeError, setWriteError] = useState("");
  const [timeLeft, setTimeLeft] = useState(timeUntilMidnightUTC());

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setEmailError("");
    setWriteError("");
    setDone(false);
    const interval = setInterval(() => setTimeLeft(timeUntilMidnightUTC()), 60000);
    return () => clearInterval(interval);
  }, [isOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    setEmailError("");
    setWriteError("");

    const emailTrimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "waitlist"), {
        email: emailTrimmed,
        source,
        userId: userId || null,
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err) {
      console.error("[LimitReachedModal] waitlist write failed:", err);
      setWriteError("Couldn't save your email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm rounded-3xl p-0 overflow-hidden border-0"
        style={{
          background: "var(--sheet-bg, #1a1b21)",
          border: "1px solid var(--bd)",
        }}
      >
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(94,182,168,0.12)" }}
            >
              <Zap className="h-7 w-7" style={{ color: "#5EB6A8" }} />
            </div>
          </div>

          <DialogHeader className="text-center mb-1">
            <DialogTitle
              className="text-lg font-semibold leading-snug"
              style={{ color: "var(--tx)" }}
            >
              You've used today's {featureName}
            </DialogTitle>
            <DialogDescription
              className="text-sm mt-1"
              style={{ color: "var(--tm)" }}
            >
              Resets at midnight UTC (in {timeLeft})
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-center mt-3 mb-5" style={{ color: "var(--tf)" }}>
            Ancy Plus will remove daily limits and add bank sync.
          </p>

          {done ? (
            <div className="text-center py-3">
              <p className="text-sm font-medium" style={{ color: "#5EB6A8" }}>
                Thanks — we'll be in touch.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: "var(--tf)" }}
                />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
                  style={{
                    background: "var(--c6, rgba(255,255,255,0.04))",
                    border: `1px solid ${emailError ? "rgba(239,68,68,0.5)" : "var(--bd)"}`,
                    color: "var(--tx)",
                  }}
                  disabled={submitting}
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-400 -mt-1">{emailError}</p>
              )}
              {writeError && (
                <p className="text-xs text-red-400 -mt-1">{writeError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #5EB6A8 0%, #4A9E91 100%)",
                  color: "#fff",
                }}
              >
                {submitting ? "Joining…" : "Join the waitlist"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-xs text-center py-1 transition-opacity hover:opacity-70"
                style={{ color: "var(--tf)" }}
              >
                Or come back tomorrow
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
