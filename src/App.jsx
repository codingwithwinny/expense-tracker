// src/App.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import useAuth from "@/hooks/useAuth";
import useMonthData from "@/hooks/useMonthData";
import useDateSelection from "@/hooks/useDateSelection";
import { useCurrency } from "@/hooks/useCurrency.jsx";
import { fmt, buildCSV, periodKey } from "@/lib/utils";
import {
  DEFAULT_CATEGORIES,
  MAX_CATEGORIES,
  MAX_CATEGORY_NAME_LEN,
  COLORS,
} from "@/lib/constants";
import { getSpendingInsightsFn, parseExpenseFn, loadUserDoc, saveUserDoc, loadMonth, saveMonth } from "@/lib/firebase";
import BankImportModal from "@/components/BankImportModal";
import InsightsModal from "@/components/InsightsModal";

import AuthButtons from "@/components/AuthButtons";
import AuthPage from "@/components/AuthPage";
import CurrencySelector from "@/components/CurrencySelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Trash2,
  Plus,
  Download,
  Wallet,
  Wallet2,
  Target,
  X,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  PiggyBank,
  HelpCircle,
  Sun,
  Moon,
  Sparkles,
  Zap,
  Loader2,
  Pencil,
  ChevronDown,
  Upload,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function groupExpensesByDate(expenses) {
  const groups = {};
  expenses.forEach((e) => {
    const dateKey = new Date(e.date).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(e);
  });
  return Object.entries(groups)
    .map(([dateKey, items]) => ({
      dateKey,
      date: new Date(dateKey),
      items,
      total: items.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    }))
    .sort((a, b) => b.date - a.date);
}

function formatDateHeader(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: target.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" },
};
const stagger = (i) => ({
  ...fadeUp,
  transition: { ...fadeUp.transition, delay: i * 0.07 },
});

const ThemeContext = React.createContext({ dark: false, toggle: () => {} });
function useTheme() {
  return React.useContext(ThemeContext);
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "error") => {
    const id = crypto.randomUUID();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, addToast };
}

function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.22 }}
            className={`pointer-events-auto flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur-sm
              ${t.type === "error" ? "bg-red-50/90 border-red-200 text-red-800" : "bg-green-50/90 border-green-200 text-green-800"}`}
          >
            {t.type === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function GlassCard({ children, className = "" }) {
  const { dark } = useTheme();
  return (
    <div
      className={`rounded-2xl shadow-lg border ${dark ? "bg-[#1e2235]/80 border-white/5 backdrop-blur-sm" : "bg-white/70 border-white/60 backdrop-blur-sm"} ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children, iconColor = "text-indigo-500" }) {
  const { dark } = useTheme();
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <h2
        className={`font-semibold text-sm ${dark ? "text-gray-200" : "text-gray-700"}`}
      >
        {children}
      </h2>
    </div>
  );
}

function OnboardingFlow({ dark, data, setData, step, setStep, onComplete, onSkip, selectedCurrency, setSelectedCurrency }) {
  const totalSteps = 6;
  const CURRENCY_OPTIONS = [
    { code: "INR", flag: "🇮🇳", symbol: "₹" },
    { code: "USD", flag: "🇺🇸", symbol: "$" },
    { code: "EUR", flag: "🇪🇺", symbol: "€" },
    { code: "GBP", flag: "🇬🇧", symbol: "£" },
    { code: "AED", flag: "🇦🇪", symbol: "د.إ" },
    { code: "SGD", flag: "🇸🇬", symbol: "S$" },
  ];
  const [showCurrencyGrid, setShowCurrencyGrid] = React.useState(false);
  const COMMON_CATEGORIES = [
    { name: "Groceries", emoji: "🛒" },
    { name: "Rent", emoji: "🏠" },
    { name: "Food", emoji: "🍔" },
    { name: "Fuel", emoji: "⛽" },
    { name: "Utilities", emoji: "💡" },
    { name: "Transport", emoji: "🚗" },
    { name: "Entertainment", emoji: "🎬" },
    { name: "Shopping", emoji: "👕" },
    { name: "Health", emoji: "💊" },
    { name: "Travel", emoji: "✈️" },
    { name: "Bills", emoji: "📱" },
    { name: "Other", emoji: "💼" },
  ];

  const next = () => setStep(Math.min(step + 1, totalSteps));
  const back = () => setStep(Math.max(step - 1, 1));

  const toggleCategory = (name) => {
    const current = data.selectedCategories || [];
    if (current.includes(name)) {
      setData({ ...data, selectedCategories: current.filter((c) => c !== name) });
    } else {
      setData({ ...data, selectedCategories: [...current, name] });
    }
  };

  const canProceedStep3 = data.incomeAmount && Number(data.incomeAmount) > 0;
  const canProceedStep4 = (data.selectedCategories || []).length > 0;

  const bg = dark ? "bg-[#12141f]" : "bg-gradient-to-br from-slate-50 to-indigo-50";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textMuted = dark ? "text-gray-400" : "text-gray-600";
  const inputBg = dark ? "bg-[#252a3d] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900";

  return (
    <div className={`fixed inset-0 z-50 ${bg} flex flex-col overflow-y-auto`}>
      {/* Progress dots */}
      <div className="flex justify-center items-center gap-2 pt-8 pb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 === step ? "w-8 bg-indigo-500" : i + 1 < step ? "w-4 bg-indigo-500/60" : "w-4 bg-gray-400/30"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            {step === 1 && (
              <div className="text-center space-y-6">
                <div className="text-6xl mb-4">👋</div>
                <h1 className={`text-3xl font-bold ${textMain}`}>Welcome to Ancy</h1>
                <p className={`text-base ${textMuted}`}>
                  Let's set up your money dashboard in 60 seconds.
                </p>
                <div className="pt-4 space-y-3">
                  <button
                    onClick={next}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    Get Started
                  </button>
                  <button
                    onClick={onSkip}
                    className={`w-full py-2 text-sm ${textMuted} hover:underline`}
                  >
                    Skip setup
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl mb-3">🌐</div>
                  <h2 className={`text-2xl font-bold ${textMain}`}>What currency do you use?</h2>
                  <p className={`text-sm mt-2 ${textMuted}`}>
                    We detected this based on your location — change it if needed.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className={`px-8 py-5 rounded-2xl ${dark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-100 shadow-sm"} text-center`}>
                    <div className="text-5xl mb-2">{selectedCurrency.flag}</div>
                    <div className={`text-2xl font-bold ${textMain}`}>{selectedCurrency.code}</div>
                    <div className={`text-lg ${textMuted}`}>{selectedCurrency.symbol}</div>
                  </div>
                  <button
                    onClick={() => setShowCurrencyGrid((v) => !v)}
                    className={`text-sm font-medium text-indigo-500 hover:text-indigo-400 underline underline-offset-2`}
                  >
                    {showCurrencyGrid ? "Hide options" : "Use a different currency"}
                  </button>
                  {showCurrencyGrid && (
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {CURRENCY_OPTIONS.map((c) => {
                        const isSelected = selectedCurrency.code === c.code;
                        return (
                          <button
                            key={c.code}
                            onClick={() => setSelectedCurrency(c.code)}
                            className={`py-3 px-2 rounded-xl border-2 transition-all active:scale-95 text-center ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-500/10"
                                : dark
                                ? "border-white/10 hover:border-white/20"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="text-2xl mb-1">{c.flag}</div>
                            <div className={`text-xs font-semibold ${textMain}`}>{c.code}</div>
                            <div className={`text-xs ${textMuted}`}>{c.symbol}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={back}
                    className={`flex-1 py-3 rounded-xl border ${dark ? "border-white/10 text-white hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-gray-50"} font-medium transition`}
                  >
                    Back
                  </button>
                  <button
                    onClick={next}
                    className="flex-[2] py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90 active:scale-[0.98] transition"
                  >
                    Next
                  </button>
                </div>
                <button
                  onClick={next}
                  className={`w-full text-sm ${textMuted} hover:underline`}
                >
                  Skip this step
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl mb-3">💰</div>
                  <h2 className={`text-2xl font-bold ${textMain}`}>What's your monthly income?</h2>
                  <p className={`text-sm mt-2 ${textMuted}`}>
                    We'll use this to track your spending vs earning.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Source name</label>
                    <input
                      type="text"
                      value={data.incomeName}
                      onChange={(e) => setData({ ...data, incomeName: e.target.value })}
                      placeholder="Salary"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${textMuted} mb-1 block`}>
                      Amount ({selectedCurrency.code})
                    </label>
                    <input
                      type="number"
                      value={data.incomeAmount}
                      onChange={(e) => setData({ ...data, incomeAmount: e.target.value })}
                      placeholder="50000"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={back}
                    className={`flex-1 py-3 rounded-xl border ${dark ? "border-white/10 text-white hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-gray-50"} font-medium transition`}
                  >
                    Back
                  </button>
                  <button
                    onClick={next}
                    disabled={!canProceedStep3}
                    className={`flex-[2] py-3 rounded-xl font-semibold transition ${
                      canProceedStep3
                        ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90 active:scale-[0.98]"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Next
                  </button>
                </div>
                <button
                  onClick={next}
                  className={`w-full text-sm ${textMuted} hover:underline`}
                >
                  Skip this step
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl mb-3">🎯</div>
                  <h2 className={`text-2xl font-bold ${textMain}`}>What do you spend on?</h2>
                  <p className={`text-sm mt-2 ${textMuted}`}>
                    Tap the ones that apply. You can change these anytime.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {COMMON_CATEGORIES.map((cat) => {
                    const isSelected = (data.selectedCategories || []).includes(cat.name);
                    return (
                      <button
                        key={cat.name}
                        onClick={() => toggleCategory(cat.name)}
                        className={`py-3 px-2 rounded-xl border-2 transition-all active:scale-95 ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/10"
                            : dark
                            ? "border-white/10 hover:border-white/20"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-2xl mb-1">{cat.emoji}</div>
                        <div className={`text-xs font-medium ${textMain}`}>{cat.name}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={back}
                    className={`flex-1 py-3 rounded-xl border ${dark ? "border-white/10 text-white hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-gray-50"} font-medium transition`}
                  >
                    Back
                  </button>
                  <button
                    onClick={next}
                    disabled={!canProceedStep4}
                    className={`flex-[2] py-3 rounded-xl font-semibold transition ${
                      canProceedStep4
                        ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90 active:scale-[0.98]"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl mb-3">🏆</div>
                  <h2 className={`text-2xl font-bold ${textMain}`}>Any savings goals?</h2>
                  <p className={`text-sm mt-2 ${textMuted}`}>
                    Totally optional — you can add these later.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Goal name</label>
                    <input
                      type="text"
                      value={data.savingsGoalName}
                      onChange={(e) => setData({ ...data, savingsGoalName: e.target.value })}
                      placeholder="Emergency fund"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${textMuted} mb-1 block`}>
                      Target amount ({selectedCurrency.code})
                    </label>
                    <input
                      type="number"
                      value={data.savingsGoalTarget}
                      onChange={(e) => setData({ ...data, savingsGoalTarget: e.target.value })}
                      placeholder="100000"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={back}
                    className={`flex-1 py-3 rounded-xl border ${dark ? "border-white/10 text-white hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-gray-50"} font-medium transition`}
                  >
                    Back
                  </button>
                  <button
                    onClick={next}
                    className="flex-[2] py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90 active:scale-[0.98] transition"
                  >
                    Finish
                  </button>
                </div>
                <button
                  onClick={next}
                  className={`w-full text-sm ${textMuted} hover:underline`}
                >
                  Skip for now
                </button>
              </div>
            )}

            {step === 6 && (
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="text-7xl"
                >
                  🎉
                </motion.div>
                <h2 className={`text-3xl font-bold ${textMain}`}>You're all set!</h2>
                <p className={`text-base ${textMuted}`}>
                  Let's start tracking your finances.
                </p>
                <button
                  onClick={onComplete}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AITooltip({ dark, onDismiss }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-40 w-[280px] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`relative p-4 rounded-2xl shadow-2xl ${
            dark
              ? "bg-gradient-to-br from-violet-600 to-purple-700 border border-violet-400/30"
              : "bg-gradient-to-br from-violet-500 to-purple-600"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">✨</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-1">
                Try AI Quick Add
              </p>
              <p className="text-xs text-white/90 mb-3">
                Just type naturally — like{" "}
                <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded">
                  spent 500 on groceries
                </span>
              </p>
              <button
                onClick={onDismiss}
                className="text-xs font-semibold text-white/95 hover:text-white underline underline-offset-2"
              >
                Got it
              </button>
            </div>
          </div>
          {/* Arrow pointing down to Quick Add bar */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 rotate-45 ${
              dark
                ? "bg-purple-700 border-r border-b border-violet-400/30"
                : "bg-purple-600"
            }`}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ThemedInput({ className = "", error = false, ...props }) {
  const { dark } = useTheme();
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all
        ${
          dark
            ? `bg-[#252a3d] border ${error ? "border-red-500/50" : "border-white/10"} text-gray-200 placeholder-gray-500`
            : `bg-white/60 border ${error ? "border-red-300" : "border-gray-200"} text-gray-800 placeholder-gray-400`
        } ${className}`}
    />
  );
}

function GradBtn({
  onClick,
  children,
  className = "",
  disabled = false,
  variant = "primary",
}) {
  const base =
    variant === "primary"
      ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md hover:shadow-indigo-500/30 hover:opacity-90"
      : variant === "secondary"
        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:shadow-green-500/30 hover:opacity-90"
        : "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md hover:shadow-violet-500/30 hover:opacity-90";
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 ${base} ${className}`}
    >
      {children}
    </motion.button>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
}) {
  const { dark } = useTheme();
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel?.();
      }}
    >
      <DialogContent
        className={`max-w-sm rounded-2xl ${dark ? "bg-[#1e2235] border-white/10 text-gray-200" : ""}`}
      >
        <DialogHeader>
          <DialogTitle className={dark ? "text-gray-100" : "text-gray-800"}>
            {title}
          </DialogTitle>
          <DialogDescription className={dark ? "text-gray-400" : ""}>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl border text-sm transition-colors ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm?.()}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AmountInputDialog({
  open,
  title,
  description,
  currency,
  onConfirm,
  onCancel,
}) {
  const { dark } = useTheme();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setValue("");
      setError("");
    }
  }, [open]);

  function handleConfirm() {
    const num = Number(value);
    if (!value || isNaN(num) || num <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    onConfirm(num);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <DialogContent
        className={`max-w-sm rounded-2xl ${dark ? "bg-[#1e2235] border-white/10" : ""}`}
      >
        <DialogHeader>
          <DialogTitle className={dark ? "text-gray-100" : "text-gray-800"}>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className={dark ? "text-gray-400" : ""}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="mt-2 space-y-2">
          <label
            className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
          >
            Amount ({currency?.code})
          </label>
          <ThemedInput
            autoFocus
            inputMode="numeric"
            placeholder="e.g., 5000"
            value={value}
            error={!!error}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^0-9.]/g, ""));
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
            }}
          />
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl border text-sm transition-colors ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm hover:opacity-90 shadow-md"
          >
            Confirm
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggle}
      className={`h-9 w-9 rounded-full flex items-center justify-center border transition-colors shadow-sm ${dark ? "bg-[#252a3d] border-white/10 text-yellow-400 hover:bg-white/10" : "bg-white/70 border-gray-200/60 text-gray-600 hover:bg-white"}`}
    >
      <AnimatePresence mode="wait">
        {dark ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function QuickAddBar({ categories, selectedCurrency, onExpenseAdd, addToast, showAITip, onAITipDismiss }) {
  const { dark } = useTheme();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [selected, setSelected] = useState({});

  console.log("[AITip Debug] QuickAddBar showAITip prop:", showAITip);

  const MAX_CHARS = 300;
  const MAX_EXPENSES = 5;
  const remaining = MAX_CHARS - text.length;
  const isNearLimit = remaining <= 50;
  const isAtLimit = remaining <= 0;

  async function handleParse() {
    if (!text.trim() || isAtLimit) return;
    setLoading(true);
    setPreviews([]);
    setSelected({});
    try {
      const result = await parseExpenseFn({
        text,
        categories,
        currency: selectedCurrency.code,
      });
      const expenses = result.data.expenses;
      if (!expenses || expenses.length === 0) {
        addToast("No expenses found. Try 'spent 500 on groceries'", "error");
        return;
      }
      if (expenses.length >= MAX_EXPENSES)
        addToast(
          `Showing first ${MAX_EXPENSES} expenses. Add more separately!`,
          "error",
        );
      setPreviews(expenses);
      const allSelected = {};
      expenses.forEach((_, i) => {
        allSelected[i] = true;
      });
      setSelected(allSelected);
    } catch (err) {
      addToast(
        err.message || "Could not parse. Try 'spent 500 on food today'",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(i) {
    setSelected((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function handleConfirm() {
    const toAdd = previews.filter((_, i) => selected[i]);
    if (toAdd.length === 0) {
      addToast("Select at least one expense to add.", "error");
      return;
    }
    const results = toAdd.map((exp) => onExpenseAdd(exp)).filter(Boolean);
    const crossKeys = [
      ...new Set(results.filter((r) => r.crossMonth).map((r) => r.targetMonthKey)),
    ];
    if (crossKeys.length > 0) {
      addToast(
        `Expense${toAdd.length > 1 ? "s" : ""} added to ${crossKeys.join(", ")}`,
        "info",
      );
    } else {
      addToast(
        `${toAdd.length} expense${toAdd.length > 1 ? "s" : ""} added!`,
        "success",
      );
    }
    setText("");
    setPreviews([]);
    setSelected({});
  }

  function handleCancel() {
    setPreviews([]);
    setSelected({});
    setText("");
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div
      data-quickadd-bar
      className={`relative p-4 rounded-2xl border overflow-hidden ${
        dark
          ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border-violet-500/30"
          : "bg-indigo-500 border-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap
            className={`h-4 w-4 ${dark ? "text-violet-400" : "text-white"}`}
          />
          <span
            className={`text-xs font-semibold ${dark ? "text-violet-300" : "text-white"}`}
          >
            Quick Add — type up to {MAX_EXPENSES} expenses naturally
          </span>
        </div>
        {text.length > 0 && (
          <span
            className={`text-xs font-medium ${isAtLimit ? "text-red-400" : isNearLimit ? (dark ? "text-orange-400" : "text-orange-200") : dark ? "text-violet-400" : "text-white/70"}`}
          >
            {remaining} left
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          placeholder='e.g. "500 on groceries, 200 on coffee"'
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => {
            setText(e.target.value);
            if (showAITip && onAITipDismiss) onAITipDismiss();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleParse();
          }}
          className={`flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all
            ${
              dark
                ? "bg-[#252a3d] border border-white/10 text-gray-200 placeholder-gray-500"
                : "bg-white/20 border border-white/30 text-white placeholder-white/60 focus:bg-white/30"
            }`}
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleParse}
          disabled={loading || !text.trim() || isAtLimit}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap
            ${
              dark
                ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                : "bg-white/20 border border-white/40 text-white backdrop-blur-sm hover:bg-white/30"
            }`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Parsing..." : "Parse"}
        </motion.button>
      </div>

      {!previews.length && !loading && (
        <p
          className={`mt-2 text-[11px] ${dark ? "text-violet-400/60" : "text-white/60"}`}
        >
          Tip: Separate multiple expenses with commas. Max {MAX_EXPENSES} at a
          time.
        </p>
      )}

      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 p-3 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-white/90 border-white/40"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p
                className={`text-xs font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                Found {previews.length} expense{previews.length > 1 ? "s" : ""}{" "}
                — select which to add:
              </p>
              {previews.length > 1 && (
                <button
                  onClick={() => {
                    const allOn = Object.values(selected).every(Boolean);
                    const next = {};
                    previews.forEach((_, i) => {
                      next[i] = !allOn;
                    });
                    setSelected(next);
                  }}
                  className={`text-[11px] underline ${dark ? "text-violet-400" : "text-violet-600"}`}
                >
                  {Object.values(selected).every(Boolean)
                    ? "Deselect all"
                    : "Select all"}
                </button>
              )}
            </div>

            <div className="space-y-2 mb-3">
              {previews.map((exp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggleSelect(i)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                    selected[i]
                      ? dark
                        ? "bg-violet-500/20 border-violet-500/40"
                        : "bg-violet-50 border-violet-200"
                      : dark
                        ? "bg-white/5 border-white/5 opacity-50"
                        : "bg-gray-50 border-gray-200 opacity-50"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${selected[i] ? "bg-violet-500 border-violet-500" : dark ? "border-white/20" : "border-gray-300"}`}
                  >
                    {selected[i] && (
                      <span className="text-white text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-1">
                    {[
                      {
                        label: "Amount",
                        value: `${selectedCurrency?.code} ${exp.amount}`,
                      },
                      { label: "Category", value: exp.category },
                      { label: "Date", value: exp.date },
                      { label: "Description", value: exp.description || "—" },
                    ].map((f) => (
                      <div key={f.label}>
                        <p
                          className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}
                        >
                          {f.label}
                        </p>
                        <p
                          className={`text-xs font-medium truncate ${dark ? "text-gray-200" : "text-gray-800"}`}
                        >
                          {f.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={selectedCount === 0}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                ✓ Add {selectedCount > 0 ? `${selectedCount} ` : ""}Expense
                {selectedCount !== 1 ? "s" : ""}
              </button>
              <button
                onClick={handleCancel}
                className={`flex-1 py-2 rounded-xl border text-xs transition-colors ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                ✕ Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function EditExpenseModal({
  open,
  expense,
  categories,
  selectedCurrency,
  onSave,
  onCancel,
}) {
  const { dark } = useTheme();
  const [form, setForm] = useState({
    date: "",
    category: "",
    amount: "",
    description: "",
    isRecurring: false,
    frequency: "monthly",
  });
  const [errors, setErrors] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 640);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (open && expense) {
      setForm({
        date: expense.date || "",
        category: expense.category || categories[0] || "",
        amount: String(expense.amount || ""),
        description: expense.description || "",
        isRecurring: false,
        frequency: "monthly",
      });
      setErrors({});
    }
  }, [open, expense]);

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, open]);

  function handleSave() {
    const errs = {};
    const amt = Number(form.amount);
    if (!form.date) errs.date = "Please select a date.";
    else if (new Date(form.date) > new Date())
      errs.date = "Cannot use a future date.";
    if (!form.category) errs.category = "Please select a category.";
    if (isNaN(amt) || amt <= 0) errs.amount = "Please enter a valid amount.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSave({
      ...expense,
      ...form,
      amount: amt,
      isRecurring: form.isRecurring,
      frequency: form.frequency,
    });
  }

  const t = {
    bg: dark ? "bg-[#1e2235]" : "bg-white",
    text: dark ? "text-gray-100" : "text-gray-800",
    textFaint: dark ? "text-gray-500" : "text-gray-400",
    border: dark ? "border-white/10" : "border-gray-200",
    input: dark
      ? "bg-[#252a3d] border-white/10 text-gray-200 placeholder-gray-500"
      : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
    select: dark
      ? "bg-[#252a3d] border-white/10 text-gray-200"
      : "bg-white border-gray-200 text-gray-800",
  };

  const FormContent = () => (
    <div className="space-y-4">
      {/* Date */}
      <div className="space-y-1">
        <label className={`text-xs font-medium ${t.textFaint}`}>Date</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => {
            setForm((p) => ({ ...p, date: e.target.value }));
            if (errors.date) setErrors((p) => ({ ...p, date: "" }));
          }}
          className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${t.input} ${errors.date ? "border-red-400" : ""}`}
        />
        {errors.date && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.date}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label className={`text-xs font-medium ${t.textFaint}`}>Category</label>
        <select
          value={form.category}
          onChange={(e) => {
            setForm((p) => ({ ...p, category: e.target.value }));
            if (errors.category) setErrors((p) => ({ ...p, category: "" }));
          }}
          className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${t.select} ${errors.category ? "border-red-400" : ""}`}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.category}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label className={`text-xs font-medium ${t.textFaint}`}>
          Amount ({selectedCurrency?.code})
        </label>
        <input
          inputMode="decimal"
          placeholder="e.g., 1200"
          value={form.amount}
          onChange={(e) => {
            setForm((p) => ({
              ...p,
              amount: e.target.value.replace(/[^0-9.]/g, ""),
            }));
            if (errors.amount) setErrors((p) => ({ ...p, amount: "" }));
          }}
          className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${t.input} ${errors.amount ? "border-red-400" : ""}`}
        />
        {errors.amount && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.amount}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className={`text-xs font-medium ${t.textFaint}`}>
          Description (optional)
        </label>
        <input
          placeholder="e.g., Coffee at Starbucks"
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
          className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${t.input}`}
        />
      </div>

      {/* Recurring toggle */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() =>
              setForm((p) => ({ ...p, isRecurring: !p.isRecurring }))
            }
            className={`relative w-9 h-5 rounded-full transition-colors ${form.isRecurring ? "bg-indigo-500" : dark ? "bg-white/20" : "bg-gray-200"}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isRecurring ? "translate-x-4" : ""}`}
            />
          </div>
          <span className={`text-xs ${t.textFaint}`}>Save as recurring</span>
        </label>
        {form.isRecurring && (
          <div className="flex items-center gap-2">
            <span className={`text-xs ${t.textFaint}`}>Frequency:</span>
            <select
              value={form.frequency}
              onChange={(e) =>
                setForm((p) => ({ ...p, frequency: e.target.value }))
              }
              className={`h-7 px-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${dark ? "bg-[#252a3d] border-white/10 text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className={`flex-1 py-2.5 rounded-xl border text-sm transition-colors ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          Save Changes
        </button>
      </div>
    </div>
  );

  if (!open) return null;

  // Mobile — bottom sheet
  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCancel}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${t.bg} border-t ${t.border} rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto`}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <p className={`text-base font-semibold mb-4 ${t.text}`}>
                Edit Expense
              </p>
              <FormContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop — centered modal
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <DialogContent
        className={`max-w-md rounded-2xl ${dark ? "bg-[#1e2235] border-white/10" : ""}`}
      >
        <DialogHeader>
          <DialogTitle
            className={`flex items-center gap-2 ${dark ? "text-gray-100" : "text-gray-800"}`}
          >
            <Pencil className="h-4 w-4 text-indigo-400" />
            Edit Expense
          </DialogTitle>
          <DialogDescription className={dark ? "text-gray-400" : ""}>
            Update the details for this expense.
          </DialogDescription>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}
function RecurringReviewModal({
  open,
  onClose,
  recurringExpenses,
  selectedRecurring,
  setSelectedRecurring,
  onConfirm,
  selectedCurrency,
}) {
  const { dark } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 640);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, open]);

  const selectedCount = Object.values(selectedRecurring).filter(Boolean).length;
  const totalAmount = recurringExpenses
    .filter((_, i) => selectedRecurring[i])
    .reduce((sum, r) => sum + r.amount, 0);

  const t = {
    bg: dark ? "bg-[#1e2235]" : "bg-white",
    text: dark ? "text-gray-100" : "text-gray-800",
    textFaint: dark ? "text-gray-500" : "text-gray-400",
    border: dark ? "border-white/10" : "border-gray-200",
    itemBg: dark ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100",
    selectedBg: dark
      ? "bg-indigo-500/20 border-indigo-500/40"
      : "bg-indigo-50 border-indigo-200",
  };

  const Content = () => (
    <div className="space-y-3">
      <p className={`text-xs ${t.textFaint}`}>
        Select which recurring expenses to add to this period:
      </p>

      {/* Select all */}
      <button
        onClick={() => {
          const allOn = Object.values(selectedRecurring).every(Boolean);
          const next = {};
          recurringExpenses.forEach((_, i) => {
            next[i] = !allOn;
          });
          setSelectedRecurring(next);
        }}
        className={`text-xs underline ${dark ? "text-indigo-400" : "text-indigo-600"}`}
      >
        {Object.values(selectedRecurring).every(Boolean)
          ? "Deselect all"
          : "Select all"}
      </button>

      {/* Recurring items */}
      <div className="space-y-2">
        {recurringExpenses.map((r, i) => (
          <motion.div
            key={r.id}
            onClick={() => setSelectedRecurring((p) => ({ ...p, [i]: !p[i] }))}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedRecurring[i] ? t.selectedBg : t.itemBg}`}
          >
            {/* Checkbox */}
            <div
              className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${selectedRecurring[i] ? "bg-indigo-500 border-indigo-500" : dark ? "border-white/20" : "border-gray-300"}`}
            >
              {selectedRecurring[i] && (
                <span className="text-white text-[10px] font-bold">✓</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium truncate ${t.text}`}>
                  {r.description || r.category}
                </span>
                <span
                  className={`text-sm font-semibold shrink-0 ml-2 ${dark ? "text-indigo-300" : "text-indigo-600"}`}
                >
                  {fmt(
                    r.amount,
                    selectedCurrency.code,
                    selectedCurrency.locale,
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs ${t.textFaint}`}>{r.category}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${dark ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-500"}`}
                >
                  {r.frequency}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Total */}
      {selectedCount > 0 && (
        <div
          className={`p-3 rounded-xl ${dark ? "bg-indigo-500/10 border border-indigo-500/20" : "bg-indigo-50 border border-indigo-100"}`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${dark ? "text-indigo-300" : "text-indigo-600"}`}
            >
              {selectedCount} expense{selectedCount > 1 ? "s" : ""} selected
            </span>
            <span
              className={`text-sm font-bold ${dark ? "text-indigo-300" : "text-indigo-600"}`}
            >
              {fmt(totalAmount, selectedCurrency.code, selectedCurrency.locale)}
            </span>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className={`flex-1 py-2.5 rounded-xl border text-sm transition-colors ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Skip
        </button>
        <button
          onClick={onConfirm}
          disabled={selectedCount === 0}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shadow-md"
        >
          Add {selectedCount > 0 ? `${selectedCount} ` : ""}Expense
          {selectedCount !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );

  if (!open) return null;

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${t.bg} border-t ${t.border} rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto`}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <p className={`text-base font-semibold mb-4 ${t.text}`}>
                🔄 Recurring Expenses
              </p>
              <Content />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className={`max-w-md rounded-2xl ${dark ? "bg-[#1e2235] border-white/10" : ""}`}
      >
        <DialogHeader>
          <DialogTitle
            className={`flex items-center gap-2 ${dark ? "text-gray-100" : "text-gray-800"}`}
          >
            🔄 Recurring Expenses
          </DialogTitle>
          <DialogDescription className={dark ? "text-gray-400" : ""}>
            These are your recurring expenses. Add them to this period?
          </DialogDescription>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
}
export default function ExpenseTracker() {
  const {
    selectedMonth,
    setSelectedMonth,
    customDateRange,
    setCustomDateRange,
  } = useDateSelection();
  const { selectedCurrency, changeCurrency } = useCurrency();
  const { user, loading } = useAuth();
  const { toasts, addToast } = useToast();

  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("ancy-theme") === "dark";
    } catch {
      return false;
    }
  });
  const toggleTheme = useCallback(() => {
    setDark((d) => {
      const next = !d;
      try {
        localStorage.setItem("ancy-theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  }, []);

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
  });
  const [amountDialog, setAmountDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
  });
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    targetDate: "",
    priority: "medium",
  });
  const [sourceErrors, setSourceErrors] = useState({});
  const [expErrors, setExpErrors] = useState({});
  const [goalErrors, setGoalErrors] = useState({});
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [bankImportOpen, setBankImportOpen] = useState(false);
  const [insightsData, setInsightsData] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
  const [collapsedDates, setCollapsedDates] = useState(new Set());
  const [showOlderExpenses, setShowOlderExpenses] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    incomeName: "Salary",
    incomeAmount: "",
    selectedCategories: ["Groceries", "Rent", "Food", "Utilities", "Transport"],
    savingsGoalName: "",
    savingsGoalTarget: "",
  });
  const [showAITip, setShowAITip] = useState(false);
  const [userDoc, setUserDoc] = useState(null);

  useEffect(() => {
    const handleAuthError = () =>
      addToast("Sign-in failed. Please try again.", "error");
    window.addEventListener("auth:error", handleAuthError);
    return () => window.removeEventListener("auth:error", handleAuthError);
  }, [addToast]);

  useEffect(() => {
    setUserDoc(null);
    setShowOnboarding(false);
    setShowAITip(false);
    setState({
      incomeSources: [],
      expenses: [],
      catBudgets: {},
      categories: DEFAULT_CATEGORIES,
      savingsGoals: [],
    });

    if (!user?.uid) return;

    let cancelled = false;
    (async () => {
      try {
        console.log("[AITip Debug] Loading user doc for uid:", user.uid);
        const doc = await loadUserDoc(user.uid);
        if (cancelled) return;
        console.log("[AITip Debug] User doc loaded:", doc);
        setUserDoc(doc);
        const onboarded = doc?.onboarding?.completed === true;
        const tipDismissed = doc?.onboarding?.aiTipDismissed === true;
        console.log("[AITip Debug] onboarded:", onboarded, "tipDismissed:", tipDismissed);
        if (!onboarded) {
          console.log("[AITip Debug] → Triggering onboarding");
          setShowOnboarding(true);
        } else if (!tipDismissed) {
          console.log("[AITip Debug] → Triggering AI tip");
          setShowAITip(true);
        } else {
          console.log("[AITip Debug] → Neither onboarding nor tip needed");
        }
      } catch (err) {
        console.error("[AITip Debug] Failed to load user doc:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const monthOptions = useMemo(() => {
    const list = [{ key: "custom", label: "Custom Period" }];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      list.push({
        key,
        label: d.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        }),
      });
    }
    return list;
  }, []);

  const currentPeriodKey = useMemo(() => {
    if (
      selectedMonth === "custom" &&
      customDateRange.start &&
      customDateRange.end
    )
      return periodKey(customDateRange.start, customDateRange.end);
    return selectedMonth;
  }, [selectedMonth, customDateRange]);

  const { state, setState, totals } = useMonthData(user, currentPeriodKey);
  const {
    incomeSources = [],
    expenses = [],
    catBudgets = {},
    categories = DEFAULT_CATEGORIES,
    savingsGoals = [],
    recurringExpenses = [],
  } = state;

  // Detect new month with recurring expenses
  useEffect(() => {
    if (!user || recurringExpenses.length === 0) return;
    const hasNoExpenses = expenses.length === 0;
    const alreadyApplied =
      localStorage.getItem(`ancy-recurring-applied-${user.uid}:${currentPeriodKey}`) === "true";
    if (hasNoExpenses && !alreadyApplied) {
      setRecurringBanner(true);
      const allSelected = {};
      recurringExpenses.forEach((_, i) => {
        allSelected[i] = true;
      });
      setSelectedRecurring(allSelected);
    } else {
      setRecurringBanner(false);
    }
  }, [currentPeriodKey, recurringExpenses.length]);

  useEffect(() => {
    if (!user?.uid) return;
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthKeys = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    setTrendLoading(true);
    (async () => {
      try {
        // TODO: track per-month income in Firestore; currently falls back to current incomeSources total
        const currentIncome = totals.income;
        const results = await Promise.all(
          monthKeys.map(async (key) => {
            if (key === todayKey && key === currentPeriodKey) {
              return { key, spending: totals.totalExp, income: currentIncome };
            }
            try {
              const data = await loadMonth(user.uid, key);
              const spending = (data.expenses || []).reduce(
                (sum, e) => sum + (Number(e.amount) || 0),
                0,
              );
              const income = (data.incomeSources || []).reduce(
                (sum, s) => sum + (Number(s.amount) || 0),
                0,
              ) || currentIncome;
              return { key, spending, income };
            } catch {
              return { key, spending: 0, income: currentIncome };
            }
          }),
        );
        setTrendData(
          [...results].reverse().map((r) => {
            const [year, month] = r.key.split("-");
            const d = new Date(Number(year), Number(month) - 1, 1);
            return {
              month: d.toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              }),
              spending: r.spending,
              income: r.income,
            };
          }).filter((r) => r.spending > 0 || r.income > 0),
        );
      } catch {
        // silent
      } finally {
        setTrendLoading(false);
      }
    })();
  }, [user?.uid, totals.totalExp]);

  const [source, setSource] = useState({ name: "Salary", amount: "" });
  const [exp, setExp] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: categories[0] || "Groceries",
    description: "",
    amount: "",
    isRecurring: false,
    frequency: "monthly",
  });
  const [recurringBanner, setRecurringBanner] = useState(false);
  const [recurringReviewOpen, setRecurringReviewOpen] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState({});

  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const [newCat, setNewCat] = useState("");
  const [catError, setCatError] = useState("");

  const t = {
    bg: dark
      ? "bg-[#12141f]"
      : "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100",
    text: dark ? "text-gray-100" : "text-gray-800",
    textMuted: dark ? "text-gray-400" : "text-gray-500",
    textFaint: dark ? "text-gray-500" : "text-gray-400",
    pillBg: dark
      ? "bg-[#252a3d]/80 border-white/10"
      : "bg-white/70 border-gray-200/60",
    itemBg: dark ? "bg-white/5 border-white/5" : "bg-white/50 border-gray-100",
    tableHead: dark
      ? "text-gray-500 border-white/10"
      : "text-gray-400 border-gray-200/50",
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center ${dark ? "bg-[#12141f]" : "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100"}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className={`text-sm ${t.textMuted}`}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  function openConfirm(opts) {
    setConfirmDialog({ open: true, ...opts });
  }
  function closeConfirm() {
    setConfirmDialog({
      open: false,
      title: "",
      description: "",
      onConfirm: null,
    });
  }
  function openAmountInput(opts) {
    setAmountDialog({ open: true, ...opts });
  }
  function closeAmountInput() {
    setAmountDialog({
      open: false,
      title: "",
      description: "",
      onConfirm: null,
    });
  }

  async function fetchInsights() {
    if (expenses.length === 0) {
      addToast("Add some expenses first to get insights!", "error");
      return;
    }
    setInsightsOpen(true);
    setInsightsLoading(true);
    setInsightsError("");
    setInsightsData(null);
    try {
      const result = await getSpendingInsightsFn({
        expenses,
        income: totals.income,
        categories,
        currency: selectedCurrency.code,
        period:
          monthOptions.find((m) => m.key === selectedMonth)?.label ||
          "this month",
      });
      setInsightsData(result.data.insights);
    } catch (err) {
      setInsightsError(
        err.message || "Could not load insights. Please try again.",
      );
    } finally {
      setInsightsLoading(false);
    }
  }

  function handleQuickAddExpense(parsed) {
    const amt = Number(parsed.amount);
    if (!amt || amt <= 0) {
      addToast("Invalid amount parsed.", "error");
      return { crossMonth: false };
    }
    const newExpense = {
      id: crypto.randomUUID(),
      date: parsed.date,
      category: parsed.category,
      description: parsed.description || "",
      amount: amt,
    };
    const targetMonthKey = parsed.date.slice(0, 7);
    const sameMonth = targetMonthKey === currentPeriodKey;

    if (sameMonth) {
      setState((s) => {
        const updates = { ...s, expenses: [newExpense, ...(s.expenses || [])] };
        if (parsed.isRecurring) {
          const alreadyExists = (s.recurringExpenses || []).some(
            (r) =>
              r.description === parsed.description &&
              r.amount === amt &&
              r.category === parsed.category,
          );
          if (!alreadyExists) {
            updates.recurringExpenses = [
              {
                id: crypto.randomUUID(),
                category: parsed.category,
                description: parsed.description || "",
                amount: amt,
                frequency: parsed.frequency || "monthly",
                createdAt: new Date().toISOString(),
              },
              ...(s.recurringExpenses || []),
            ];
          }
        }
        return updates;
      });
    } else {
      const localKey = `expense-tracker:${user.uid}:${targetMonthKey}`;
      let targetData = {
        incomeSources: [],
        expenses: [],
        catBudgets: {},
        categories: DEFAULT_CATEGORIES,
      };
      const raw = localStorage.getItem(localKey);
      if (raw) {
        try {
          targetData = JSON.parse(raw);
        } catch { /* ignore malformed cached data */ }
      }
      targetData = {
        ...targetData,
        expenses: [newExpense, ...(targetData.expenses || [])],
      };
      localStorage.setItem(localKey, JSON.stringify(targetData));
      saveMonth(user.uid, targetMonthKey, targetData).catch(() => {});

      if (parsed.isRecurring) {
        setState((s) => {
          const alreadyExists = (s.recurringExpenses || []).some(
            (r) =>
              r.description === parsed.description &&
              r.amount === amt &&
              r.category === parsed.category,
          );
          if (alreadyExists) return s;
          return {
            ...s,
            recurringExpenses: [
              {
                id: crypto.randomUUID(),
                category: parsed.category,
                description: parsed.description || "",
                amount: amt,
                frequency: parsed.frequency || "monthly",
                createdAt: new Date().toISOString(),
              },
              ...(s.recurringExpenses || []),
            ],
          };
        });
      }
    }
    return { crossMonth: !sameMonth, targetMonthKey };
  }

  function addIncomeSource() {
    const errors = {};
    const amt = Number(source.amount);
    if (!source.name.trim()) errors.name = "Please enter a source name.";
    if (isNaN(amt) || amt < 0) errors.amount = "Please enter a valid amount.";
    else if (amt > 10000000) errors.amount = "Amount too large.";
    if (Object.keys(errors).length) {
      setSourceErrors(errors);
      return;
    }
    setSourceErrors({});
    setState((s) => ({
      ...s,
      incomeSources: [
        { id: crypto.randomUUID(), name: source.name, amount: amt },
        ...(s.incomeSources || []),
      ],
    }));
    setSource({ name: "", amount: "" });
    addToast("Income source added!", "success");
  }

  function removeIncomeSource(id) {
    openConfirm({
      title: "Remove income source?",
      description: "This will be permanently removed.",
      onConfirm: () => {
        setState((s) => ({
          ...s,
          incomeSources: (s.incomeSources || []).filter((i) => i.id !== id),
        }));
        addToast("Removed.", "success");
        closeConfirm();
      },
    });
  }

  function addExpense() {
    const errors = {};
    const amt = Number(exp.amount);
    if (!exp.date) errors.date = "Please select a date.";
    else if (new Date(exp.date) > new Date())
      errors.date = "Cannot add future expenses.";
    if (!exp.category) errors.category = "Please select a category.";
    if (isNaN(amt) || amt <= 0) errors.amount = "Please enter a valid amount.";
    else if (amt > selectedCurrency.maxAmount)
      errors.amount = `Max: ${fmt(selectedCurrency.maxAmount, selectedCurrency.code, selectedCurrency.locale)}`;
    if (Object.keys(errors).length) {
      setExpErrors(errors);
      return;
    }
    setExpErrors({});
    const newExpenseObj = {
      id: crypto.randomUUID(),
      date: exp.date,
      category: exp.category,
      description: exp.description,
      amount: amt,
    };
    const targetMonthKey = exp.date.slice(0, 7);
    const sameMonth = targetMonthKey === currentPeriodKey;

    if (sameMonth) {
      setState((s) => ({
        ...s,
        expenses: [newExpenseObj, ...(s.expenses || [])],
      }));
    } else {
      const localKey = `expense-tracker:${user.uid}:${targetMonthKey}`;
      let targetData = {
        incomeSources: [],
        expenses: [],
        catBudgets: {},
        categories: DEFAULT_CATEGORIES,
      };
      const raw = localStorage.getItem(localKey);
      if (raw) {
        try {
          targetData = JSON.parse(raw);
        } catch { /* ignore malformed cached data */ }
      }
      targetData = {
        ...targetData,
        expenses: [newExpenseObj, ...(targetData.expenses || [])],
      };
      localStorage.setItem(localKey, JSON.stringify(targetData));
      saveMonth(user.uid, targetMonthKey, targetData).catch(() => {});

      // For custom-range views, append to display state if the date is in range
      if (currentPeriodKey.startsWith("custom-")) {
        const suffix = currentPeriodKey.slice(7);
        const rangeStart = suffix.slice(0, 10);
        const rangeEnd = suffix.slice(11);
        if (newExpenseObj.date >= rangeStart && newExpenseObj.date <= rangeEnd) {
          setState((s) => ({ ...s, expenses: [newExpenseObj, ...(s.expenses || [])] }));
        }
      }
    }

    // If recurring, save to recurring list (always in current period's state)
    if (exp.isRecurring) {
      setState((s) => ({
        ...s,
        recurringExpenses: [
          {
            id: crypto.randomUUID(),
            category: exp.category,
            description: exp.description,
            amount: amt,
            frequency: exp.frequency,
            createdAt: new Date().toISOString(),
          },
          ...(s.recurringExpenses || []),
        ],
      }));
      addToast(
        sameMonth
          ? `Expense added + saved as ${exp.frequency} recurring!`
          : `Expense added to ${targetMonthKey} + saved as ${exp.frequency} recurring!`,
        sameMonth ? "success" : "info",
      );
    } else {
      addToast(
        sameMonth ? "Expense added!" : `Expense added to ${targetMonthKey}`,
        sameMonth ? "success" : "info",
      );
    }
    setExp({
      date: new Date().toISOString().slice(0, 10),
      category: exp.category,
      description: "",
      amount: "",
      isRecurring: false,
      frequency: "monthly",
    });
  }

  function removeExpense(id) {
    openConfirm({
      title: "Delete expense?",
      description: "This will be permanently deleted.",
      onConfirm: () => {
        setState((s) => ({
          ...s,
          expenses: (s.expenses || []).filter((e) => e.id !== id),
        }));
        addToast("Deleted.", "success");
        closeConfirm();
      },
    });
  }
  function editExpense(updated) {
    setState((s) => {
      const updatedExpenses = (s.expenses || []).map((e) =>
        e.id === updated.id ? updated : e,
      );
      // If marked as recurring, add to recurring list
      if (updated.isRecurring) {
        const alreadyExists = (s.recurringExpenses || []).some(
          (r) =>
            r.description === updated.description &&
            r.amount === updated.amount &&
            r.category === updated.category,
        );
        if (!alreadyExists) {
          return {
            ...s,
            expenses: updatedExpenses,
            recurringExpenses: [
              {
                id: crypto.randomUUID(),
                category: updated.category,
                description: updated.description,
                amount: updated.amount,
                frequency: updated.frequency || "monthly",
                createdAt: new Date().toISOString(),
              },
              ...(s.recurringExpenses || []),
            ],
          };
        }
      }
      return { ...s, expenses: updatedExpenses };
    });
    setEditingExpense(null);
    addToast(
      updated.isRecurring
        ? "Expense updated + saved as recurring!"
        : "Expense updated!",
      "success",
    );
  }
  function addRecurringExpense(recurringItem) {
    // Save to recurring list
    setState((s) => ({
      ...s,
      recurringExpenses: [
        {
          id: crypto.randomUUID(),
          ...recurringItem,
          createdAt: new Date().toISOString(),
        },
        ...(s.recurringExpenses || []),
      ],
    }));
  }

  function removeRecurringExpense(id) {
    openConfirm({
      title: "Remove recurring expense?",
      description: "This will stop it from being suggested in future months.",
      onConfirm: () => {
        setState((s) => ({
          ...s,
          recurringExpenses: (s.recurringExpenses || []).filter(
            (r) => r.id !== id,
          ),
        }));
        addToast("Recurring expense removed.", "success");
        closeConfirm();
      },
    });
  }

  function applyRecurringExpenses() {
    const toAdd = recurringExpenses.filter((_, i) => selectedRecurring[i]);
    if (toAdd.length === 0) {
      setRecurringReviewOpen(false);
      setRecurringBanner(false);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const targetMonthKey = today.slice(0, 7);
    const sameMonth = targetMonthKey === currentPeriodKey;

    if (sameMonth) {
      const newItems = toAdd.filter(
        (r) =>
          !expenses.some(
            (e) =>
              e.description === r.description &&
              e.amount === r.amount &&
              e.category === r.category,
          ),
      );
      const skipped = toAdd.length - newItems.length;
      setState((s) => ({
        ...s,
        expenses: [
          ...newItems.map((r) => ({
            id: crypto.randomUUID(),
            date: today,
            category: r.category,
            description: r.description,
            amount: r.amount,
          })),
          ...(s.expenses || []),
        ],
      }));
      const msg =
        skipped > 0
          ? `${newItems.length} added, ${skipped} already existed`
          : `${newItems.length} expense${newItems.length !== 1 ? "s" : ""} added!`;
      addToast(msg, "success");
    } else {
      const localKey = `expense-tracker:${user.uid}:${targetMonthKey}`;
      let targetData = {
        incomeSources: [],
        expenses: [],
        catBudgets: {},
        categories: DEFAULT_CATEGORIES,
      };
      const raw = localStorage.getItem(localKey);
      if (raw) {
        try {
          targetData = JSON.parse(raw);
        } catch { /* ignore malformed cached data */ }
      }
      const existingExp = targetData.expenses || [];
      const newItems = toAdd.filter(
        (r) =>
          !existingExp.some(
            (e) =>
              e.description === r.description &&
              e.amount === r.amount &&
              e.category === r.category,
          ),
      );
      const skipped = toAdd.length - newItems.length;
      targetData = {
        ...targetData,
        expenses: [
          ...newItems.map((r) => ({
            id: crypto.randomUUID(),
            date: today,
            category: r.category,
            description: r.description,
            amount: r.amount,
          })),
          ...existingExp,
        ],
      };
      localStorage.setItem(localKey, JSON.stringify(targetData));
      saveMonth(user.uid, targetMonthKey, targetData).catch(() => {});
      const msg =
        skipped > 0
          ? `${newItems.length} added to ${targetMonthKey}, ${skipped} already existed`
          : `${newItems.length} expense${newItems.length !== 1 ? "s" : ""} added to ${targetMonthKey}`;
      addToast(msg, "info");
    }

    setRecurringReviewOpen(false);
    setRecurringBanner(false);
    localStorage.setItem(`ancy-recurring-applied-${user.uid}:${currentPeriodKey}`, "true");
  }


  function setBudget(category, value) {
    const amt = Number(value);
    if (amt > selectedCurrency.maxAmount) {
      addToast("Budget too large.", "error");
      return;
    }
    setState((s) => ({
      ...s,
      catBudgets: { ...(s.catBudgets || {}), [category]: isNaN(amt) ? 0 : amt },
    }));
  }

  function exportCSV() {
    const header = [
      "Date",
      "Category",
      "Description",
      `Amount (${selectedCurrency.code})`,
    ];
    const rows = (expenses || [])
      .slice()
      .reverse()
      .map((e) => [
        e.date,
        e.category,
        (e.description || "").replaceAll(",", ";"),
        e.amount,
      ]);
    const csv = buildCSV([header, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("CSV exported!", "success");
  }

  function validateCategoryName(nameRaw) {
    const name = (nameRaw || "").trim();
    if (!name) return "Enter a category name.";
    if (name.length > MAX_CATEGORY_NAME_LEN)
      return `Max ${MAX_CATEGORY_NAME_LEN} chars.`;
    if (!/^[A-Za-z0-9 ]+$/.test(name)) return "Letters, numbers, spaces only.";
    if ((categories || []).some((c) => c.toLowerCase() === name.toLowerCase()))
      return "Already exists.";
    if ((categories || []).length >= MAX_CATEGORIES)
      return `Max ${MAX_CATEGORIES} categories.`;
    return "";
  }

  function addCategory() {
    const err = validateCategoryName(newCat);
    if (err) {
      setCatError(err);
      return;
    }
    const name = newCat.trim();
    setState((s) => ({
      ...s,
      categories: [...(s.categories || []), name],
      catBudgets: { ...(s.catBudgets || {}), [name]: 0 },
    }));
    setNewCat("");
    setCatError("");
    addToast(`"${name}" added!`, "success");
  }

  function deleteCategory(name) {
    if (name === "Other") return;
    openConfirm({
      title: `Delete "${name}"?`,
      description: `Expenses in "${name}" will move to "Other".`,
      onConfirm: () => {
        setState((s) => ({
          ...s,
          expenses: (s.expenses || []).map((e) =>
            e.category === name ? { ...e, category: "Other" } : e,
          ),
          catBudgets: Object.fromEntries(
            Object.entries(s.catBudgets || {}).filter(([k]) => k !== name),
          ),
          categories: (s.categories || []).filter((c) => c !== name),
        }));
        setExp((prev) =>
          prev.category === name ? { ...prev, category: "Other" } : prev,
        );
        addToast(`"${name}" deleted.`, "success");
        closeConfirm();
      },
    });
  }

  function addSavingsGoal() {
    const errors = {};
    const targetAmt = Number(newGoal.targetAmount);
    const currentAmt = Number(newGoal.currentAmount);
    if (!newGoal.name.trim()) errors.name = "Please enter a goal name.";
    if (isNaN(targetAmt) || targetAmt <= 0)
      errors.targetAmount = "Please enter a valid target.";
    if (isNaN(currentAmt) || currentAmt < 0)
      errors.currentAmount = "Please enter a valid amount.";
    else if (currentAmt > targetAmt)
      errors.currentAmount = "Cannot exceed target.";
    if (!newGoal.targetDate) errors.targetDate = "Please select a date.";
    if (Object.keys(errors).length) {
      setGoalErrors(errors);
      return;
    }
    setGoalErrors({});
    const goal = {
      id: crypto.randomUUID(),
      name: newGoal.name.trim(),
      targetAmount: targetAmt,
      currentAmount: currentAmt,
      targetDate: newGoal.targetDate,
      priority: newGoal.priority,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({
      ...s,
      savingsGoals: [goal, ...(s.savingsGoals || [])],
    }));
    setNewGoal({
      name: "",
      targetAmount: "",
      currentAmount: "",
      targetDate: "",
      priority: "medium",
    });
    addToast("Goal added!", "success");
  }

  function updateSavingsGoal(id, updates) {
    setState((s) => ({
      ...s,
      savingsGoals: (s.savingsGoals || []).map((g) =>
        g.id === id ? { ...g, ...updates } : g,
      ),
    }));
  }

  function removeSavingsGoal(id, goalName) {
    openConfirm({
      title: `Delete "${goalName}"?`,
      description: "Your goal and progress will be permanently deleted.",
      onConfirm: () => {
        setState((s) => ({
          ...s,
          savingsGoals: (s.savingsGoals || []).filter((g) => g.id !== id),
        }));
        addToast("Goal deleted.", "success");
        closeConfirm();
      },
    });
  }

  function handleGoalAddMoney(goal) {
    openAmountInput({
      title: `Add to "${goal.name}"`,
      description: `Current: ${fmt(goal.currentAmount, selectedCurrency.code, selectedCurrency.locale)} / Target: ${fmt(goal.targetAmount, selectedCurrency.code, selectedCurrency.locale)}`,
      onConfirm: (amount) => {
        updateSavingsGoal(goal.id, {
          currentAmount: Math.min(
            goal.currentAmount + amount,
            goal.targetAmount,
          ),
        });
        addToast(`Added!`, "success");
        closeAmountInput();
      },
    });
  }

  function handleGoalWithdraw(goal) {
    openAmountInput({
      title: `Withdraw from "${goal.name}"`,
      description: `Balance: ${fmt(goal.currentAmount, selectedCurrency.code, selectedCurrency.locale)}`,
      onConfirm: (amount) => {
        updateSavingsGoal(goal.id, {
          currentAmount: Math.max(goal.currentAmount - amount, 0),
        });
        addToast(`Withdrawn.`, "success");
        closeAmountInput();
      },
    });
  }

  const anyOverBudget = categories.some((c) => {
    const spent = totals.byCat.find((x) => x.name === c)?.value || 0;
    const bud = Number(catBudgets[c]) || 0;
    return bud > 0 && spent > bud;
  });

  return (
    <ThemeContext.Provider value={{ dark, toggle: toggleTheme }}>
      <div
        className={`min-h-screen w-full transition-colors duration-300 ${t.bg} p-4 md:p-6`}
      >
        {showOnboarding && (
          <OnboardingFlow
            dark={dark}
            data={onboardingData}
            setData={setOnboardingData}
            step={onboardingStep}
            setStep={setOnboardingStep}
            selectedCurrency={selectedCurrency}
            setSelectedCurrency={changeCurrency}
            onComplete={async () => {
              try {
                await saveUserDoc(user.uid, {
                  onboarding: {
                    completed: true,
                    completedAt: new Date().toISOString(),
                    aiTipDismissed: false,
                    skipped: false,
                  },
                });

                setState((s) => {
                  const next = { ...s };

                  if (onboardingData.incomeAmount && Number(onboardingData.incomeAmount) > 0) {
                    next.incomeSources = [
                      ...(s.incomeSources || []),
                      {
                        id: crypto.randomUUID(),
                        name: onboardingData.incomeName || "Salary",
                        amount: Number(onboardingData.incomeAmount),
                      },
                    ];
                  }

                  if ((onboardingData.selectedCategories || []).length > 0) {
                    next.categories = Array.from(
                      new Set([...(s.categories || []), ...onboardingData.selectedCategories])
                    );
                  }

                  if (onboardingData.savingsGoalName && onboardingData.savingsGoalTarget) {
                    const defaultTargetDate = new Date();
                    defaultTargetDate.setMonth(defaultTargetDate.getMonth() + 3);
                    next.savingsGoals = [
                      ...(s.savingsGoals || []),
                      {
                        id: crypto.randomUUID(),
                        name: onboardingData.savingsGoalName,
                        targetAmount: Number(onboardingData.savingsGoalTarget),
                        currentAmount: 0,
                        targetDate: defaultTargetDate.toISOString().split("T")[0],
                        priority: "medium",
                        createdAt: new Date().toISOString(),
                      },
                    ];
                  }

                  return next;
                });

                setShowOnboarding(false);
                setShowAITip(true);
                addToast("Welcome to Ancy! 🎉", "success");
              } catch (err) {
                console.error("Failed to complete onboarding:", err);
                addToast("Something went wrong. Please try again.", "error");
              }
            }}
            onSkip={async () => {
              try {
                await saveUserDoc(user.uid, {
                  onboarding: {
                    completed: true,
                    completedAt: new Date().toISOString(),
                    aiTipDismissed: false,
                    skipped: true,
                  },
                });
                setShowOnboarding(false);
                setShowAITip(true);
              } catch (err) {
                console.error("Failed to skip onboarding:", err);
              }
            }}
          />
        )}

        {dark && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-violet-600/8 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          </div>
        )}

        <ToastContainer toasts={toasts} />
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.description}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
        <AmountInputDialog
          open={amountDialog.open}
          title={amountDialog.title}
          description={amountDialog.description}
          currency={selectedCurrency}
          onConfirm={amountDialog.onConfirm}
          onCancel={closeAmountInput}
        />
        <InsightsModal
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          insights={insightsData}
          loading={insightsLoading}
          error={insightsError}
          dark={dark}
        />
        <EditExpenseModal
          open={!!editingExpense}
          expense={editingExpense}
          categories={categories}
          selectedCurrency={selectedCurrency}
          onSave={editExpense}
          onCancel={() => setEditingExpense(null)}
        />

        <RecurringReviewModal
          open={recurringReviewOpen}
          onClose={() => setRecurringReviewOpen(false)}
          recurringExpenses={recurringExpenses}
          selectedRecurring={selectedRecurring}
          setSelectedRecurring={setSelectedRecurring}
          onConfirm={applyRecurringExpenses}
          selectedCurrency={selectedCurrency}
        />

        <BankImportModal
          open={bankImportOpen}
          onClose={() => setBankImportOpen(false)}
          dark={dark}
          categories={categories}
          selectedCurrency={selectedCurrency}
          existingExpenses={expenses}
          user={user}
          currentPeriodKey={currentPeriodKey}
          setState={setState}
          addToast={addToast}
        />

        <div className="relative mx-auto max-w-7xl">
          {/* HEADER */}
          <motion.header
            {...stagger(0)}
            className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            {/* Recurring expenses banner */}
            <AnimatePresence>
              {recurringBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mb-4 p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    dark
                      ? "bg-indigo-500/10 border-indigo-500/20"
                      : "bg-indigo-50 border-indigo-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔄</span>
                    <div>
                      <p
                        className={`text-sm font-semibold ${dark ? "text-indigo-300" : "text-indigo-700"}`}
                      >
                        You have {recurringExpenses.length} recurring expense
                        {recurringExpenses.length > 1 ? "s" : ""}
                      </p>
                      <p
                        className={`text-xs ${dark ? "text-indigo-400" : "text-indigo-500"}`}
                      >
                        {fmt(
                          recurringExpenses.reduce((s, r) => s + r.amount, 0),
                          selectedCurrency.code,
                          selectedCurrency.locale,
                        )}{" "}
                        total — add them to this period?
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setRecurringReviewOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-xs font-medium hover:opacity-90 shadow-md"
                    >
                      Review & Add
                    </button>
                    <button
                      onClick={() => setRecurringBanner(false)}
                      className={`p-1.5 rounded-xl transition-colors ${dark ? "text-gray-400 hover:bg-white/5" : "text-gray-400 hover:bg-gray-100"}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-3">
              <img src="/brand/ancy-icon-512.png" alt="Ancy" className="w-10 h-10 rounded-2xl" />
              <div>
                <h1 className={`text-xl font-bold leading-tight ${t.text}`}>
                  Ancy
                </h1>
                <p className={`text-xs ${t.textFaint}`}>
                  Your smart way to manage your money.
                </p>
              </div>
              <span className="ml-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-2 py-0.5 text-[10px] font-medium text-white">
                PWA
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-col gap-1.5">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger
                    className={`h-9 px-4 rounded-full border text-sm min-w-[10rem] shadow-sm ${t.pillBg} ${t.text}`}
                  >
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent
                    className={`rounded-2xl ${dark ? "bg-[#1e2235] border-white/10" : ""}`}
                  >
                    {monthOptions.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMonth === "custom" && (
                  <div className="flex items-center gap-2">
                    <div>
                      <p className={`text-[10px] mb-0.5 ${t.textFaint}`}>
                        From
                      </p>
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) =>
                          setCustomDateRange((p) => ({
                            ...p,
                            start: e.target.value,
                          }))
                        }
                        className={`h-8 px-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32 ${dark ? "bg-[#252a3d] border-white/10 text-gray-200" : "bg-white/70 border-gray-200 text-gray-700"}`}
                      />
                    </div>
                    <div>
                      <p className={`text-[10px] mb-0.5 ${t.textFaint}`}>To</p>
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) =>
                          setCustomDateRange((p) => ({
                            ...p,
                            end: e.target.value,
                          }))
                        }
                        className={`h-8 px-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32 ${dark ? "bg-[#252a3d] border-white/10 text-gray-200" : "bg-white/70 border-gray-200 text-gray-700"}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <CurrencySelector />
              <ThemeToggle />

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={fetchInsights}
                className="h-9 px-4 rounded-full text-sm flex items-center gap-1.5 shadow-lg shadow-violet-500/25 transition-all bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-violet-500/40 hover:scale-105"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI Insights</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setBankImportOpen(true)}
                className={`h-9 px-4 rounded-full border text-sm flex items-center gap-1.5 shadow-sm transition-colors ${t.pillBg} ${t.textMuted} hover:opacity-80`}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={exportCSV}
                className={`h-9 px-4 rounded-full border text-sm flex items-center gap-1.5 shadow-sm transition-colors ${t.pillBg} ${t.textMuted} hover:opacity-80`}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </motion.button>

              <div className="h-9">
                <AuthButtons />
              </div>
            </div>
          </motion.header>

          {/* TWO-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Income",
                    value: fmt(
                      totals.income,
                      selectedCurrency.code,
                      selectedCurrency.locale,
                    ),
                    icon: Wallet,
                    light: "from-indigo-50 to-indigo-100/60",
                    dark: "from-indigo-900/40 to-indigo-800/20",
                    iconColor: "text-indigo-400",
                  },
                  {
                    label: "Expenses",
                    value: fmt(
                      totals.totalExp,
                      selectedCurrency.code,
                      selectedCurrency.locale,
                    ),
                    icon: TrendingUp,
                    light: "from-rose-50 to-rose-100/60",
                    dark: "from-rose-900/40 to-rose-800/20",
                    iconColor: "text-rose-400",
                  },
                  {
                    label: "Remaining",
                    value: fmt(
                      totals.remaining,
                      selectedCurrency.code,
                      selectedCurrency.locale,
                    ),
                    icon: Wallet2,
                    light: "from-cyan-50 to-cyan-100/60",
                    dark: "from-cyan-900/40 to-cyan-800/20",
                    iconColor: "text-cyan-400",
                  },
                  {
                    label: "Budget Used",
                    value: `${totals.util}%`,
                    icon: Target,
                    light: "from-amber-50 to-amber-100/60",
                    dark: "from-amber-900/40 to-amber-800/20",
                    iconColor: "text-amber-400",
                  },
                ].map((card, i) => (
                  <motion.div key={card.label} {...stagger(i + 1)}>
                    <div
                      className={`bg-gradient-to-br rounded-2xl border shadow-md p-4 ${dark ? `${card.dark} border-white/5` : `${card.light} border-white/60`}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p
                          className={`text-xs uppercase tracking-wide font-medium ${t.textFaint}`}
                        >
                          {card.label}
                        </p>
                        <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                      </div>
                      <p className={`text-xl font-bold ${t.text}`}>
                        {card.value}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Progress bar */}
              <motion.div {...stagger(5)}>
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${t.textMuted}`}>
                      Overall budget usage
                    </span>
                    <span className="text-xs font-semibold text-indigo-400">
                      {totals.util}%
                    </span>
                  </div>
                  <div
                    className={`h-2.5 w-full rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-gray-100"}`}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(totals.util, 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-2.5 rounded-full ${totals.util > 100 ? "bg-red-400" : totals.util > 80 ? "bg-orange-400" : "bg-gradient-to-r from-indigo-500 to-cyan-500"}`}
                    />
                  </div>
                  <p className={`mt-1.5 text-xs ${t.textFaint}`}>
                    Total expenses / total income
                  </p>
                </GlassCard>
              </motion.div>

              {/* Income Sources */}
              <motion.div {...stagger(6)}>
                <GlassCard className="p-5">
                  <SectionTitle icon={Wallet2}>Income Sources</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className={`text-xs ${t.textFaint}`}>
                        Source name
                      </label>
                      <ThemedInput
                        placeholder="e.g., Salary, Freelance"
                        value={source.name}
                        error={!!sourceErrors.name}
                        onChange={(e) => {
                          setSource({ ...source, name: e.target.value });
                          if (sourceErrors.name)
                            setSourceErrors((p) => ({ ...p, name: "" }));
                        }}
                      />
                      <FieldError message={sourceErrors.name} />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs ${t.textFaint}`}>
                        Amount ({selectedCurrency.code})
                      </label>
                      <ThemedInput
                        inputMode="numeric"
                        placeholder="e.g., 75000"
                        value={source.amount}
                        error={!!sourceErrors.amount}
                        onChange={(e) => {
                          setSource({
                            ...source,
                            amount: e.target.value.replace(/[^0-9]/g, ""),
                          });
                          if (sourceErrors.amount)
                            setSourceErrors((p) => ({ ...p, amount: "" }));
                        }}
                      />
                      <FieldError message={sourceErrors.amount} />
                    </div>
                  </div>
                  <GradBtn onClick={addIncomeSource} className="w-full mb-4">
                    + Add Source
                  </GradBtn>
                  {incomeSources.length === 0 ? (
                    <p className={`text-xs text-center py-3 ${t.textFaint}`}>
                      No income sources yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      <AnimatePresence>
                        {incomeSources.map((i) => (
                          <motion.li
                            key={i.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm ${t.itemBg}`}
                          >
                            <span className={`font-medium truncate ${t.text}`}>
                              {i.name}
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`font-semibold ${t.text}`}>
                                {fmt(
                                  i.amount,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}
                              </span>
                              <button
                                onClick={() => removeIncomeSource(i.id)}
                                className={`transition-colors ${dark ? "text-gray-600 hover:text-red-400" : "text-gray-300 hover:text-red-400"}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </GlassCard>
              </motion.div>

              {/* Savings Goals */}
              <motion.div {...stagger(7)}>
                <GlassCard className="p-5">
                  <SectionTitle icon={PiggyBank} iconColor="text-green-400">
                    Savings Goals
                  </SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {[
                      {
                        label: "Goal Name",
                        key: "name",
                        placeholder: "e.g., Emergency Fund",
                        type: "text",
                      },
                      {
                        label: `Target (${selectedCurrency.code})`,
                        key: "targetAmount",
                        placeholder: "100000",
                        type: "numeric",
                      },
                      {
                        label: `Current (${selectedCurrency.code})`,
                        key: "currentAmount",
                        placeholder: "25000",
                        type: "numeric",
                      },
                      {
                        label: "Target Date",
                        key: "targetDate",
                        placeholder: "",
                        type: "date",
                      },
                    ].map(({ label, key, placeholder, type }) => (
                      <div key={key} className="space-y-1">
                        <label className={`text-xs ${t.textFaint}`}>
                          {label}
                        </label>
                        <ThemedInput
                          type={type === "date" ? "date" : "text"}
                          inputMode={type === "numeric" ? "numeric" : undefined}
                          placeholder={placeholder}
                          value={newGoal[key]}
                          error={!!goalErrors[key]}
                          onChange={(e) => {
                            setNewGoal({
                              ...newGoal,
                              [key]:
                                type === "numeric"
                                  ? e.target.value.replace(/[^0-9]/g, "")
                                  : e.target.value,
                            });
                            if (goalErrors[key])
                              setGoalErrors((p) => ({ ...p, [key]: "" }));
                          }}
                        />
                        <FieldError message={goalErrors[key]} />
                      </div>
                    ))}
                    <div className="space-y-1">
                      <label className={`text-xs ${t.textFaint}`}>
                        Priority
                      </label>
                      <Select
                        value={newGoal.priority}
                        onValueChange={(v) =>
                          setNewGoal({ ...newGoal, priority: v })
                        }
                      >
                        <SelectTrigger
                          className={`h-[42px] rounded-xl text-sm border ${dark ? "bg-[#252a3d] border-white/10 text-gray-200" : "bg-white/60 border-gray-200"}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          className={`rounded-2xl ${dark ? "bg-[#1e2235] border-white/10" : ""}`}
                        >
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <GradBtn
                        onClick={addSavingsGoal}
                        variant="secondary"
                        className="w-full"
                      >
                        + Add Goal
                      </GradBtn>
                    </div>
                  </div>
                  {savingsGoals.length === 0 ? (
                    <p className={`text-xs text-center py-4 ${t.textFaint}`}>
                      No savings goals yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {savingsGoals.map((goal) => (
                          <SavingsGoalCard
                            key={goal.id}
                            goal={goal}
                            onAddMoney={() => handleGoalAddMoney(goal)}
                            onWithdraw={() => handleGoalWithdraw(goal)}
                            onDelete={() =>
                              removeSavingsGoal(goal.id, goal.name)
                            }
                            selectedCurrency={selectedCurrency}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              {/* Add Expense */}
              <motion.div {...stagger(8)}>
                <GlassCard className="p-5">
                  <SectionTitle icon={Plus}>Add Expense</SectionTitle>

                  <div className="mb-5">
                    <div className="relative">
                      {showAITip && (
                        <AITooltip
                          dark={dark}
                          onDismiss={async () => {
                            if (!showAITip) return;
                            try {
                              await saveUserDoc(user.uid, {
                                onboarding: { aiTipDismissed: true },
                              });
                              setShowAITip(false);
                            } catch (err) {
                              console.error("Failed to dismiss AI tip:", err);
                              setShowAITip(false);
                            }
                          }}
                        />
                      )}
                      <QuickAddBar
                        categories={categories}
                        selectedCurrency={selectedCurrency}
                        onExpenseAdd={handleQuickAddExpense}
                        addToast={addToast}
                        showAITip={showAITip}
                        onAITipDismiss={async () => {
                          if (!showAITip) return;
                          try {
                            await saveUserDoc(user.uid, {
                              onboarding: { aiTipDismissed: true },
                            });
                            setShowAITip(false);
                          } catch (err) {
                            console.error("Failed to dismiss AI tip:", err);
                            setShowAITip(false);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 mb-4 ${dark ? "text-gray-500" : "text-gray-300"}`}
                  >
                    <div className="flex-1 h-px bg-current opacity-30" />
                    <span className="text-xs">or add manually</span>
                    <div className="flex-1 h-px bg-current opacity-30" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-3 sm:items-start">
                    <div className="sm:col-span-2 space-y-1">
                      <label className={`text-xs ${t.textFaint}`}>Date</label>
                      <ThemedInput
                        type="date"
                        value={exp.date}
                        error={!!expErrors.date}
                        onChange={(e) => {
                          setExp({ ...exp, date: e.target.value });
                          if (expErrors.date)
                            setExpErrors((p) => ({ ...p, date: "" }));
                        }}
                      />
                      <FieldError message={expErrors.date} />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className={`text-xs ${t.textFaint}`}>
                        Category
                      </label>
                      <Select
                        value={exp.category}
                        onValueChange={(v) => {
                          setExp({ ...exp, category: v });
                          if (expErrors.category)
                            setExpErrors((p) => ({ ...p, category: "" }));
                        }}
                      >
                        <SelectTrigger
                          className={`h-[42px] rounded-xl text-sm border ${dark ? "bg-[#252a3d] border-white/10 text-gray-200" : "bg-white/60 border-gray-200"} ${expErrors.category ? "border-red-400" : ""}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          className={`rounded-2xl ${dark ? "bg-[#1e2235] border-white/10" : ""}`}
                        >
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError message={expErrors.category} />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className={`text-xs ${t.textFaint}`}>
                        Amount ({selectedCurrency.code})
                      </label>
                      <ThemedInput
                        inputMode="decimal"
                        placeholder="e.g., 1200"
                        value={exp.amount}
                        error={!!expErrors.amount}
                        onChange={(e) => {
                          setExp({
                            ...exp,
                            amount: e.target.value.replace(/[^0-9.]/g, ""),
                          });
                          if (expErrors.amount)
                            setExpErrors((p) => ({ ...p, amount: "" }));
                        }}
                      />
                      <FieldError message={expErrors.amount} />
                    </div>
                    <div className="sm:col-span-5 space-y-1">
                      <label className={`text-xs ${t.textFaint}`}>
                        Description (optional)
                      </label>
                      <ThemedInput
                        placeholder="e.g., BMTC pass, groceries at DMart"
                        value={exp.description}
                        onChange={(e) =>
                          setExp({ ...exp, description: e.target.value })
                        }
                      />
                    </div>

                    {/* Recurring toggle */}
                    <div className="sm:col-span-6 flex items-center gap-4 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() =>
                            setExp((p) => ({
                              ...p,
                              isRecurring: !p.isRecurring,
                            }))
                          }
                          className={`relative w-9 h-5 rounded-full transition-colors ${exp.isRecurring ? "bg-indigo-500" : dark ? "bg-white/20" : "bg-gray-200"}`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${exp.isRecurring ? "translate-x-4" : ""}`}
                          />
                        </div>
                        <span className={`text-xs ${t.textFaint}`}>
                          Recurring expense
                        </span>
                      </label>
                      {exp.isRecurring && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          <span className={`text-xs ${t.textFaint}`}>
                            Frequency:
                          </span>
                          <select
                            value={exp.frequency}
                            onChange={(e) =>
                              setExp((p) => ({
                                ...p,
                                frequency: e.target.value,
                              }))
                            }
                            className={`h-7 px-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${dark ? "bg-[#252a3d] border-white/10 text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </motion.div>
                      )}
                    </div>
                    <div className="sm:col-span-1 flex items-end">
                      <GradBtn onClick={addExpense} className="w-full">
                        + Add
                      </GradBtn>
                    </div>
                  </div>

                  {/* Mobile list */}
                  <div className="mt-4 md:hidden space-y-2">
                    {expenses.length === 0 ? (
                      <p className={`text-center text-xs py-4 ${t.textFaint}`}>
                        No expenses yet.
                      </p>
                    ) : (
                      (() => {
                        const grouped = groupExpensesByDate(expenses);
                        const visibleGroups = showOlderExpenses ? grouped : grouped.slice(0, 5);
                        return (
                          <>
                            {visibleGroups.map((group) => {
                              const isCollapsed = collapsedDates.has(group.dateKey);
                              return (
                                <div key={group.dateKey} className="space-y-2">
                                  <button
                                    onClick={() => {
                                      const next = new Set(collapsedDates);
                                      if (isCollapsed) next.delete(group.dateKey);
                                      else next.add(group.dateKey);
                                      setCollapsedDates(next);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${dark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} transition-colors`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <ChevronDown
                                        className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""} ${t.textMuted}`}
                                      />
                                      <span className={`text-sm font-semibold ${t.text}`}>
                                        {formatDateHeader(group.date)}
                                      </span>
                                      <span className={`text-xs ${t.textFaint}`}>
                                        ({group.items.length})
                                      </span>
                                    </div>
                                    <span className={`text-sm font-semibold ${t.text}`}>
                                      {fmt(group.total, selectedCurrency.code, selectedCurrency.locale)}
                                    </span>
                                  </button>
                                  <AnimatePresence>
                                    {!isCollapsed &&
                                      group.items.map((e) => (
                                        <motion.div
                                          key={e.id}
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className={`flex items-start justify-between gap-3 px-3 py-3 rounded-xl border ${t.itemBg}`}
                                        >
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span
                                                className="h-2 w-2 rounded-full shrink-0"
                                                style={{ background: colorFor(e.category) }}
                                              />
                                              <span className={`text-sm font-medium ${t.text}`}>
                                                {e.category}
                                              </span>
                                            </div>
                                            {e.description && (
                                              <p className={`text-xs mt-0.5 ${t.textMuted}`}>
                                                {e.description}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-sm font-semibold ${t.text}`}>
                                              {fmt(e.amount, selectedCurrency.code, selectedCurrency.locale)}
                                            </span>
                                            <button
                                              onClick={() => setEditingExpense(e)}
                                              className={`transition-colors ${dark ? "text-gray-600 hover:text-indigo-400" : "text-gray-300 hover:text-indigo-400"}`}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              onClick={() => removeExpense(e.id)}
                                              className={`transition-colors ${dark ? "text-gray-600 hover:text-red-400" : "text-gray-300 hover:text-red-400"}`}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </motion.div>
                                      ))}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                            {grouped.length > 5 && (
                              <button
                                onClick={() => setShowOlderExpenses(!showOlderExpenses)}
                                className={`w-full py-2 text-xs font-medium ${t.textMuted} hover:${t.text} transition-colors`}
                              >
                                {showOlderExpenses
                                  ? "Show less"
                                  : `Show ${grouped.length - 5} older ${grouped.length - 5 === 1 ? "day" : "days"}`}
                              </button>
                            )}
                          </>
                        );
                      })()
                    )}
                  </div>

                  {/* Desktop table */}
                  <div className="mt-4 hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className={`text-left text-xs border-b ${t.tableHead}`}
                        >
                          <th className="pb-2 pl-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Category</th>
                          <th className="pb-2 font-medium">Description</th>
                          <th className="pb-2 text-right font-medium">
                            Amount
                          </th>
                          <th className="pb-2 text-right pr-2 font-medium">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className={`py-8 text-center text-xs ${t.textFaint}`}>
                              No expenses yet. Add your first one above.
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            const grouped = groupExpensesByDate(expenses);
                            const visibleGroups = showOlderExpenses ? grouped : grouped.slice(0, 5);
                            return (
                              <>
                                {visibleGroups.map((group) => {
                                  const isCollapsed = collapsedDates.has(group.dateKey);
                                  return (
                                    <React.Fragment key={group.dateKey}>
                                      <tr
                                        className={`cursor-pointer ${dark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} transition-colors`}
                                        onClick={() => {
                                          const next = new Set(collapsedDates);
                                          if (isCollapsed) next.delete(group.dateKey);
                                          else next.add(group.dateKey);
                                          setCollapsedDates(next);
                                        }}
                                      >
                                        <td colSpan={3} className="py-2 pl-2">
                                          <div className="flex items-center gap-2">
                                            <ChevronDown
                                              className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""} ${t.textMuted}`}
                                            />
                                            <span className={`text-sm font-semibold ${t.text}`}>
                                              {formatDateHeader(group.date)}
                                            </span>
                                            <span className={`text-xs ${t.textFaint}`}>
                                              ({group.items.length} {group.items.length === 1 ? "expense" : "expenses"})
                                            </span>
                                          </div>
                                        </td>
                                        <td className={`py-2 text-right font-semibold ${t.text}`}>
                                          {fmt(group.total, selectedCurrency.code, selectedCurrency.locale)}
                                        </td>
                                        <td className="py-2 pr-2"></td>
                                      </tr>
                                      {!isCollapsed &&
                                        group.items.map((e) => (
                                          <motion.tr
                                            key={e.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className={`border-b transition-colors group ${dark ? "border-white/5 hover:bg-white/5" : "border-gray-100/60 hover:bg-white/40"}`}
                                          >
                                            <td className={`py-3 pl-2 ${t.textMuted}`}>
                                              {new Date(e.date).toLocaleDateString()}
                                            </td>
                                            <td className="py-3">
                                              <span className="flex items-center gap-1.5">
                                                <span
                                                  className="h-2 w-2 rounded-full shrink-0"
                                                  style={{ background: colorFor(e.category) }}
                                                />
                                                <span className={t.text}>{e.category}</span>
                                              </span>
                                            </td>
                                            <td className={`py-3 ${t.textMuted}`}>{e.description}</td>
                                            <td className={`py-3 text-right font-semibold ${t.text}`}>
                                              {fmt(e.amount, selectedCurrency.code, selectedCurrency.locale)}
                                            </td>
                                            <td className="py-3 text-right pr-2">
                                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => setEditingExpense(e)}
                                                  className={`transition-colors ${dark ? "text-gray-600 hover:text-indigo-400" : "text-gray-300 hover:text-indigo-400"}`}
                                                >
                                                  <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => removeExpense(e.id)}
                                                  className={`transition-colors ${dark ? "text-gray-600 hover:text-red-400" : "text-gray-300 hover:text-red-400"}`}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </td>
                                          </motion.tr>
                                        ))}
                                    </React.Fragment>
                                  );
                                })}
                                {grouped.length > 5 && (
                                  <tr>
                                    <td colSpan={5} className="py-2 text-center">
                                      <button
                                        onClick={() => setShowOlderExpenses(!showOlderExpenses)}
                                        className={`text-xs font-medium ${t.textMuted} hover:${t.text} transition-colors`}
                                      >
                                        {showOlderExpenses
                                          ? "Show less"
                                          : `Show ${grouped.length - 5} older ${grouped.length - 5 === 1 ? "day" : "days"}`}
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Manage Categories */}
              <motion.div {...stagger(9)}>
                <GlassCard className="p-5">
                  <SectionTitle icon={Target}>Manage Categories</SectionTitle>
                  <div className="flex gap-2 mb-3">
                    <ThemedInput
                      placeholder="New category name"
                      value={newCat}
                      maxLength={MAX_CATEGORY_NAME_LEN}
                      onChange={(e) => {
                        setNewCat(e.target.value);
                        if (catError) setCatError("");
                      }}
                    />
                    <GradBtn onClick={addCategory}>Add</GradBtn>
                  </div>
                  {catError ? (
                    <p className="mb-2 text-xs text-red-400">{catError}</p>
                  ) : (
                    <p className={`mb-3 text-xs ${t.textFaint}`}>
                      Up to {MAX_CATEGORIES} categories.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <motion.span
                        key={c}
                        layout
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border"
                        style={{
                          background: `${colorFor(c)}22`,
                          borderColor: `${colorFor(c)}40`,
                          color: colorFor(c),
                        }}
                      >
                        {c}
                        {c !== "Other" && (
                          <button
                            onClick={() => deleteCategory(c)}
                            className="hover:opacity-60 transition-opacity ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </motion.span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Recurring Expenses */}
              {recurringExpenses.length > 0 && (
                <motion.div {...stagger(10)}>
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-base">🔄</span>
                      <h2
                        className={`font-semibold text-sm ${dark ? "text-gray-200" : "text-gray-700"}`}
                      >
                        Recurring Expenses
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {recurringExpenses.map((r) => (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${dark ? "bg-white/5 border-white/5" : "bg-white/50 border-gray-100"}`}
                        >
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${dark ? "text-gray-200" : "text-gray-700"}`}
                            >
                              {r.description || r.category}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}
                              >
                                {r.category}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full ${dark ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-500"}`}
                              >
                                {r.frequency}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span
                              className={`text-sm font-semibold ${dark ? "text-indigo-300" : "text-indigo-600"}`}
                            >
                              {fmt(
                                r.amount,
                                selectedCurrency.code,
                                selectedCurrency.locale,
                              )}
                            </span>
                            <button
                              onClick={() => removeRecurringExpense(r.id)}
                              className={`transition-colors ${dark ? "text-gray-600 hover:text-red-400" : "text-gray-300 hover:text-red-400"}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              <div className="mt-2">
                <TipsDialog />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Donut chart */}
              <motion.div {...stagger(2)}>
                <GlassCard className="p-5">
                  <SectionTitle icon={TrendingUp}>By Category</SectionTitle>
                  {totals.byCat.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="text-4xl mb-2">📊</div>
                      <p className={`text-xs ${t.textFaint}`}>
                        Add expenses to see breakdown.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={totals.byCat}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={2}
                            >
                              {totals.byCat.map((entry) => (
                                <Cell
                                  key={entry.name}
                                  fill={colorFor(entry.name)}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v) =>
                                fmt(
                                  Number(v),
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )
                              }
                              contentStyle={{
                                borderRadius: 12,
                                border: "none",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                background: dark ? "#1e2235" : "#fff",
                                color: dark ? "#e2e8f0" : "#1f2937",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 space-y-2">
                        {totals.byCat.map((entry) => {
                          const pct =
                            totals.totalExp > 0
                              ? ((entry.value / totals.totalExp) * 100).toFixed(
                                  1,
                                )
                              : "0.0";
                          return (
                            <div
                              key={entry.name}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ background: colorFor(entry.name) }}
                                />
                                <span className={`truncate ${t.textMuted}`}>
                                  {entry.name}
                                </span>
                              </div>
                              <div
                                className={`flex items-center gap-2 shrink-0 ml-2 ${t.textMuted}`}
                              >
                                <span>
                                  {fmt(
                                    entry.value,
                                    selectedCurrency.code,
                                    selectedCurrency.locale,
                                  )}
                                </span>
                                <span
                                  className={`w-10 text-right font-semibold ${t.text}`}
                                >
                                  {pct}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </GlassCard>
              </motion.div>

              {/* Spending Trends */}
              <motion.div {...stagger(3)}>
                <GlassCard className="p-5">
                  <SectionTitle icon={TrendingUp}>Spending Trends</SectionTitle>
                  <p className={`text-xs mb-4 -mt-1 ${t.textFaint}`}>
                    Spending vs income over the last 6 months
                  </p>
                  {trendLoading ? (
                    <div className="flex items-center justify-center h-[220px]">
                      <Loader2
                        className={`h-5 w-5 animate-spin ${dark ? "text-indigo-400" : "text-indigo-500"}`}
                      />
                    </div>
                  ) : trendData.length === 0 ? (
                    <div className="flex items-center justify-center h-[220px]">
                      <p className={`text-xs ${t.textFaint}`}>No trend data yet</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart
                        data={trendData}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={dark ? "#ffffff10" : "#00000010"}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: dark ? "#9ca3af" : "#6b7280", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis hide={true} />
                        <Tooltip
                          formatter={(value, name) => [
                            fmt(Number(value), selectedCurrency.code, selectedCurrency.locale),
                            name === "spending" ? "Spending" : "Income",
                          ]}
                          labelFormatter={(label) => label}
                          labelStyle={{ color: "#a5b4fc", fontWeight: 600 }}
                          contentStyle={{
                            borderRadius: 12,
                            border: "none",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                            background: "#1e2235",
                            color: "#e2e8f0",
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                          formatter={(value) => value === "spending" ? "Spending" : "Income"}
                        />
                        <Line
                          type="monotone"
                          dataKey="spending"
                          stroke="#f87171"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="income"
                          stroke="#34d399"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </GlassCard>
              </motion.div>

              {/* Category Budgets */}
              <motion.div {...stagger(3)}>
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-indigo-400" />
                    <h2 className={`font-semibold text-sm ${t.text}`}>
                      Category Budgets
                    </h2>
                    {anyOverBudget && (
                      <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        Over budget
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mb-4 ${t.textFaint}`}>
                    Set spending limits per category
                  </p>
                  <div className="space-y-5">
                    {categories.map((c) => {
                      const spent =
                        totals.byCat.find((x) => x.name === c)?.value || 0;
                      const bud = Number(catBudgets[c]) || 0;
                      const diff = bud - spent;
                      const isOver = bud > 0 && diff < 0;
                      const pct =
                        bud > 0 ? Math.min((spent / bud) * 100, 100) : 0;
                      return (
                        <div key={c} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: colorFor(c) }}
                              />
                              <span className={`text-xs font-medium ${t.text}`}>
                                {c}
                              </span>
                            </div>
                            {isOver ? (
                              <span className="text-[10px] font-medium text-red-400">
                                {fmt(
                                  Math.abs(diff),
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}{" "}
                                over
                              </span>
                            ) : bud > 0 ? (
                              <span className={`text-[10px] ${t.textFaint}`}>
                                {fmt(
                                  diff,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}{" "}
                                left
                              </span>
                            ) : null}
                          </div>
                          <input
                            inputMode="numeric"
                            placeholder={`Budget (${selectedCurrency.code})`}
                            value={catBudgets[c] ?? ""}
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all
                              ${dark ? `bg-[#252a3d] text-gray-200 placeholder-gray-500 ${isOver ? "border-red-500/40" : "border-white/10"}` : `bg-white/60 text-gray-800 ${isOver ? "border-red-300" : "border-gray-200"}`}`}
                            onChange={(e) =>
                              setBudget(
                                c,
                                e.target.value.replace(/[^0-9]/g, ""),
                              )
                            }
                          />
                          {bud > 0 && (
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex-1 h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-gray-100"}`}
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.6 }}
                                  className={`h-1.5 rounded-full ${isOver ? "bg-red-400" : pct > 80 ? "bg-orange-400" : "bg-gradient-to-r from-indigo-400 to-cyan-400"}`}
                                />
                              </div>
                              <span
                                className={`text-[10px] shrink-0 ${t.textFaint}`}
                              >
                                {fmt(
                                  spent,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}{" "}
                                spent
                              </span>
                            </div>
                          )}
                          {bud === 0 && (
                            <p className={`text-[10px] ${t.textFaint}`}>
                              no budget set
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Goals overview */}
              {savingsGoals.length > 0 && (
                <motion.div {...stagger(4)}>
                  <GlassCard className="p-5">
                    <SectionTitle icon={PiggyBank} iconColor="text-green-400">
                      Goals Overview
                    </SectionTitle>
                    <div className="space-y-3">
                      {savingsGoals.map((goal) => {
                        const pct =
                          (goal.currentAmount / goal.targetAmount) * 100;
                        return (
                          <div key={goal.id}>
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-xs font-medium truncate ${t.text}`}
                              >
                                {goal.name}
                              </span>
                              <span className="text-xs text-indigo-400 font-semibold shrink-0 ml-2">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                            <div
                              className={`h-1.5 w-full rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-gray-100"}`}
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(pct, 100)}%` }}
                                transition={{ duration: 0.6 }}
                                className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-400" : "bg-gradient-to-r from-indigo-400 to-cyan-400"}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

function SavingsGoalCard({
  goal,
  onAddMoney,
  onWithdraw,
  onDelete,
  selectedCurrency,
}) {
  const { dark } = useTheme();
  const t = {
    text: dark ? "text-gray-100" : "text-gray-800",
    textFaint: dark ? "text-gray-500" : "text-gray-400",
    itemBg: dark ? "bg-white/5 border-white/5" : "bg-white/50 border-gray-100",
  };
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const daysRemaining = goal.targetDate
    ? Math.ceil(
        (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24),
      )
    : null;
  const isOverdue = daysRemaining < 0;
  const isCompleted = goal.currentAmount >= goal.targetAmount;
  const priorityStyle =
    {
      high: "text-red-400 bg-red-500/10 border-red-500/20",
      medium: "text-orange-400 bg-orange-500/10 border-orange-500/20",
      low: "text-green-400 bg-green-500/10 border-green-500/20",
    }[goal.priority] || "";
  const statusStyle = isCompleted
    ? "text-green-400 bg-green-500/10 border-green-500/20"
    : isOverdue
      ? "text-red-400 bg-red-500/10 border-red-500/20"
      : daysRemaining <= 7
        ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
        : "text-blue-400 bg-blue-500/10 border-blue-500/20";
  const statusText = isCompleted
    ? "Completed! 🎉"
    : isOverdue
      ? `${Math.abs(daysRemaining)}d overdue`
      : daysRemaining === 0
        ? "Due today!"
        : `${daysRemaining}d left`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`p-4 rounded-2xl border ${t.itemBg} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold truncate mb-1.5 ${t.text}`}>
            {goal.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${priorityStyle}`}
            >
              {goal.priority ? goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1) : "Medium"}
            </span>
            {daysRemaining !== null && (
              <span
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${statusStyle}`}
              >
                {statusText}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className={`transition-colors ml-2 shrink-0 ${dark ? "text-gray-600 hover:text-red-400" : "text-gray-300 hover:text-red-400"}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-3">
        <div className={`flex justify-between text-xs mb-1 ${t.textFaint}`}>
          <span>
            {fmt(
              goal.currentAmount,
              selectedCurrency.code,
              selectedCurrency.locale,
            )}
          </span>
          <span>
            {fmt(
              goal.targetAmount,
              selectedCurrency.code,
              selectedCurrency.locale,
            )}
          </span>
        </div>
        <div
          className={`h-2 w-full rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-gray-100"}`}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.6 }}
            className={`h-2 rounded-full ${isCompleted ? "bg-green-400" : "bg-gradient-to-r from-indigo-400 to-cyan-400"}`}
          />
        </div>
        <p className={`text-[10px] mt-1 ${t.textFaint}`}>
          {progress.toFixed(1)}% complete
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAddMoney}
          disabled={isCompleted}
          className={`flex-1 py-1.5 rounded-xl border text-xs transition-colors disabled:opacity-40 ${dark ? "border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10" : "border-indigo-200 text-indigo-500 hover:bg-indigo-50"}`}
        >
          + Add
        </button>
        <button
          onClick={onWithdraw}
          className={`flex-1 py-1.5 rounded-xl border text-xs transition-colors ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
        >
          − Withdraw
        </button>
      </div>
    </motion.div>
  );
}

function TipsDialog() {
  const { dark } = useTheme();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm shadow-sm transition-colors ${dark ? "bg-[#1e2235]/80 border-white/10 text-gray-400 hover:bg-white/5" : "bg-white/70 border-gray-200/60 text-gray-500 hover:bg-white"}`}
        >
          <HelpCircle className="h-4 w-4" />
          How to use
        </motion.button>
      </DialogTrigger>
      <DialogContent
        className={`rounded-2xl ${dark ? "bg-[#1e2235] border-white/10" : ""}`}
      >
        <DialogHeader>
          <DialogTitle className="text-indigo-400">
            Quick Start Guide
          </DialogTitle>
          <DialogDescription asChild>
            <div
              className={`space-y-3 text-sm mt-2 ${dark ? "text-gray-400" : "text-gray-600"}`}
            >
              <p>
                <strong className={dark ? "text-gray-200" : "text-gray-800"}>
                  ⚡ Quick Add:
                </strong>{" "}
                Type naturally like "500 on groceries, 200 on coffee" — Claude
                parses up to 5 expenses at once. Select which ones to add.
              </p>
              <p>
                <strong className={dark ? "text-gray-200" : "text-gray-800"}>
                  ✨ AI Insights:
                </strong>{" "}
                Click the purple "AI Insights" button for a personalized
                spending summary.
              </p>
              <p>
                <strong className={dark ? "text-gray-200" : "text-gray-800"}>
                  🌍 Currency:
                </strong>{" "}
                Click the currency selector to switch currencies.
              </p>
              <p>
                <strong className={dark ? "text-gray-200" : "text-gray-800"}>
                  📅 Period:
                </strong>{" "}
                Choose a month or "Custom Period" for any date range.
              </p>
              <p>
                <strong className={dark ? "text-gray-200" : "text-gray-800"}>
                  🌙 Dark mode:
                </strong>{" "}
                Toggle the sun/moon icon in the header.
              </p>
              <p>
                <strong className={dark ? "text-gray-200" : "text-gray-800"}>
                  🔴 Budgets:
                </strong>{" "}
                Bars turn orange at 80% and red when over limit.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
