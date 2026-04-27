// src/components/InsightsModal.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, AlertTriangle, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SEVERITY = {
  high: {
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    dot: "bg-red-400",
    label: "High",
  },
  medium: {
    badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    dot: "bg-amber-400",
    label: "Medium",
  },
  low: {
    badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    dot: "bg-blue-400",
    label: "Low",
  },
};


function AnomaliesTab({ anomalies, dark }) {
  if (!anomalies?.length) {
    return (
      <div className="py-10 text-center">
        <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
          No anomalies detected — your spending looks normal!
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {anomalies.map((a, i) => {
        const sev = SEVERITY[a.severity] || SEVERITY.low;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`p-4 rounded-xl border ${dark ? "bg-white/[0.04] border-white/8" : "bg-gray-50 border-gray-100"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`flex-shrink-0 w-2 h-2 rounded-full ${sev.dot}`} />
                <p className={`font-medium text-sm truncate ${dark ? "text-gray-100" : "text-gray-800"}`}>
                  {a.title}
                </p>
              </div>
              <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${sev.badge}`}>
                {sev.label}
              </span>
            </div>
            <p className={`mt-2 text-xs leading-relaxed pl-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              {a.description}
            </p>
            {a.category && (
              <p className={`mt-1.5 text-xs pl-4 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                Category:{" "}
                <span className={`font-medium ${dark ? "text-violet-400" : "text-violet-600"}`}>
                  {a.category}
                </span>
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function PersonalityTab({ personality, dark }) {
  if (!personality) {
    return (
      <div className="py-10 text-center">
        <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Personality profile unavailable.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <div
        className={`p-4 rounded-xl border text-center ${dark ? "bg-violet-500/10 border-violet-500/20" : "bg-violet-50 border-violet-100"}`}
      >
        <p className={`text-xs font-medium mb-1 ${dark ? "text-violet-400" : "text-violet-500"}`}>
          Your Spender Personality
        </p>
        <p className={`text-lg font-bold ${dark ? "text-gray-100" : "text-gray-800"}`}>
          {personality.archetype}
        </p>
        <p className={`mt-1 text-sm italic ${dark ? "text-gray-400" : "text-gray-500"}`}>
          "{personality.tagline}"
        </p>
      </div>

      {personality.traits?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {personality.traits.map((trait, i) => (
            <span
              key={i}
              className={`text-xs px-3 py-1 rounded-full border font-medium ${
                dark
                  ? "bg-white/5 border-white/10 text-gray-300"
                  : "bg-gray-100 border-gray-200 text-gray-600"
              }`}
            >
              {trait.label}: {trait.value}
            </span>
          ))}
        </div>
      )}

      <div className={`p-4 rounded-xl border ${dark ? "bg-white/[0.03] border-white/8" : "bg-gray-50 border-gray-100"}`}>
        <p className={`text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
          {personality.summary}
        </p>
      </div>
    </motion.div>
  );
}

export default function InsightsModal({ open, onClose, insights, loading, error, dark }) {
  const [tab, setTab] = useState("anomalies");

  const tabs = [
    { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
    { id: "personality", label: "Personality", icon: Star },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className={`max-w-lg rounded-2xl ${dark ? "bg-[#1e2235] border-white/10" : ""}`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <span className={dark ? "text-gray-100" : "text-gray-800"}>
              AI Spending Insights
            </span>
          </DialogTitle>
          <DialogDescription className={dark ? "text-gray-400" : ""}>
            Powered by Claude AI — personalized just for you
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
              <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                Analyzing your spending...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {insights && !loading && (
            <>
              <div
                className={`flex rounded-xl p-1 mb-4 ${dark ? "bg-white/5" : "bg-gray-100"}`}
              >
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      tab === id
                        ? dark
                          ? "bg-[#1e2235] text-violet-400 shadow-sm"
                          : "bg-white text-violet-600 shadow-sm"
                        : dark
                        ? "text-gray-500 hover:text-gray-300"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {id === "anomalies" && insights.anomalies?.length > 0 && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                          tab === id
                            ? "bg-violet-500/20 text-violet-400"
                            : dark
                            ? "bg-white/10 text-gray-400"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {insights.anomalies.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {tab === "anomalies" ? (
                    <AnomaliesTab anomalies={insights.anomalies} dark={dark} />
                  ) : (
                    <PersonalityTab personality={insights.personality} dark={dark} />
                  )}
                </motion.div>
              </AnimatePresence>

              <div
                className={`mt-4 pt-3 border-t grid grid-cols-3 gap-2 ${dark ? "border-white/5" : "border-gray-100"}`}
              >
                {[
                  { label: "Total Spent", value: insights.summary?.totalExpenses?.toLocaleString() },
                  { label: "Remaining", value: insights.summary?.remaining?.toLocaleString() },
                  { label: "Savings Rate", value: `${insights.summary?.savingsRate}%` },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`p-3 rounded-xl text-center ${dark ? "bg-white/5 border border-white/5" : "bg-gray-50 border border-gray-100"}`}
                  >
                    <p className={`text-xs mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      {s.label}
                    </p>
                    <p className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-800"}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl border text-sm transition-colors ${
              dark
                ? "border-white/10 text-gray-400 hover:bg-white/5"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
