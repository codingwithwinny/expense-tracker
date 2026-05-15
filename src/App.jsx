// src/App.jsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import useAuth from "@/hooks/useAuth";
import useMonthData from "@/hooks/useMonthData";
import useDateSelection from "@/hooks/useDateSelection";
import { useCurrency } from "@/hooks/useCurrency.jsx";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useUsageQuota } from "@/hooks/useUsageQuota";
import LimitReachedModal from "@/components/LimitReachedModal";
import {
  fmt,
  buildCSV,
  periodKey,
  functionsErrorMsg,
  firestoreErrorMsg,
} from "@/lib/utils";
import {
  DEFAULT_CATEGORIES,
  MAX_CATEGORIES,
  MAX_CATEGORY_NAME_LEN,
  COLORS,
} from "@/lib/constants";
import {
  getSpendingInsightsFn,
  parseExpenseFn,
  loadUserDoc,
  saveUserDoc,
  loadMonth,
  saveMonth,
  signOutUser,
  wipeUserData,
} from "@/lib/firebase";
import BankImportModal from "@/components/BankImportModal";
import EmptyState from "@/components/EmptyState";
import OfflineCapabilitiesCard from "@/components/OfflineCapabilitiesCard";
import {
  buildExpensesCsv,
  buildFullJsonExport,
  downloadFile,
  todayStamp,
  readAllPeriodsFromStorage,
} from "@/lib/exportData";

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
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
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
  CloudUpload,
  LayoutDashboard,
  Receipt,
  PieChart as PieChartIcon,
  MoreHorizontal,
  Settings,
  User,
  Bell,
  SlidersHorizontal,
  Calendar,
  FileJson,
  FileSpreadsheet,
  Cloud,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

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
            className="pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-xl"
            style={{
              background:
                t.type === "error"
                  ? "linear-gradient(180deg, rgba(251,113,133,0.14) 0%, rgba(251,113,133,0.06) 100%)"
                  : t.type === "info"
                  ? "linear-gradient(180deg, rgba(251,191,36,0.14) 0%, rgba(251,191,36,0.06) 100%)"
                  : "linear-gradient(180deg, rgba(52,211,153,0.14) 0%, rgba(52,211,153,0.06) 100%)",
              border: `1px solid ${t.type === "error" ? "rgba(251,113,133,0.3)" : t.type === "info" ? "rgba(251,191,36,0.3)" : "rgba(52,211,153,0.3)"}`,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "var(--tx)",
            }}
          >
            {t.type === "error" ? (
              <AlertCircle
                className="h-4 w-4 shrink-0"
                style={{ color: "#FB7185" }}
              />
            ) : t.type === "info" ? (
              <CloudUpload
                className="h-4 w-4 shrink-0"
                style={{ color: "#FBBF24" }}
              />
            ) : (
              <CheckCircle2
                className="h-4 w-4 shrink-0"
                style={{ color: "#34D399" }}
              />
            )}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function GlassCard({ children, className = "", style }) {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-white/[0.035] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none ${className}`}
      style={{
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children, iconColor = "text-[#818CF8]" }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <h2
        className="font-medium text-[11px] tracking-[0.08em] uppercase"
        style={{ color: "var(--tm)" }}
      >
        {children}
      </h2>
    </div>
  );
}

function OnboardingFlow({
  dark,
  data,
  setData,
  step,
  setStep,
  onComplete,
  onSkip,
  selectedCurrency,
  setSelectedCurrency,
}) {
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
      setData({
        ...data,
        selectedCategories: current.filter((c) => c !== name),
      });
    } else {
      setData({ ...data, selectedCategories: [...current, name] });
    }
  };

  const canProceedStep3 = data.incomeAmount && Number(data.incomeAmount) > 0;
  const canProceedStep4 = (data.selectedCategories || []).length > 0;

  const textMain = "";
  const textMuted = "";
  const inputBg = "";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: "var(--page-bg)", color: "var(--tx)" }}
    >
      {/* Progress dots */}
      <div className="flex justify-center items-center gap-2 pt-8 pb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i + 1 === step ? 32 : 16,
              background:
                i + 1 === step
                  ? "#818CF8"
                  : i + 1 < step
                    ? "rgba(129,140,248,0.5)"
                    : "var(--c10)",
            }}
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
                <h1 className={`text-3xl font-bold ${textMain}`}>
                  Welcome to Ancy
                </h1>
                <p className={`text-base ${textMuted}`}>
                  Let's set up your money dashboard in 60 seconds.
                </p>
                <div className="pt-4 space-y-3">
                  <button
                    onClick={next}
                    className="w-full py-3 rounded-full font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                    style={{
                      background:
                        "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
                      color: "#07090F",
                      boxShadow: "0 10px 30px -10px rgba(34,211,238,0.55)",
                    }}
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
                  <h2 className={`text-2xl font-bold ${textMain}`}>
                    What currency do you use?
                  </h2>
                  <p className={`text-sm mt-2 ${textMuted}`}>
                    We detected this based on your location — change it if
                    needed.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="px-8 py-5 rounded-2xl text-center"
                    style={{
                      background: "var(--c5)",
                      border: "1px solid var(--bd)",
                    }}
                  >
                    <div className="text-5xl mb-2">{selectedCurrency.flag}</div>
                    <div className={`text-2xl font-bold ${textMain}`}>
                      {selectedCurrency.code}
                    </div>
                    <div className={`text-lg ${textMuted}`}>
                      {selectedCurrency.symbol}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCurrencyGrid((v) => !v)}
                    className={`text-sm font-medium text-indigo-500 hover:text-indigo-400 underline underline-offset-2`}
                  >
                    {showCurrencyGrid
                      ? "Hide options"
                      : "Use a different currency"}
                  </button>
                  {showCurrencyGrid && (
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {CURRENCY_OPTIONS.map((c) => {
                        const isSelected = selectedCurrency.code === c.code;
                        return (
                          <button
                            key={c.code}
                            onClick={() => setSelectedCurrency(c.code)}
                            className="py-3 px-2 rounded-xl border-2 transition-all active:scale-95 text-center"
                            style={{
                              borderColor: isSelected
                                ? "#818CF8"
                                : "var(--c10)",
                              background: isSelected
                                ? "rgba(129,140,248,0.1)"
                                : "transparent",
                            }}
                          >
                            <div className="text-2xl mb-1">{c.flag}</div>
                            <div
                              className={`text-xs font-semibold ${textMain}`}
                            >
                              {c.code}
                            </div>
                            <div className={`text-xs ${textMuted}`}>
                              {c.symbol}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={back}
                    className="flex-1 py-3 rounded-full font-medium transition"
                    style={{
                      border: "1px solid var(--c10)",
                      color: "var(--tx)",
                      background: "var(--c2)",
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={next}
                    className="flex-[2] py-3 rounded-full font-semibold hover:opacity-90 active:scale-[0.98] transition"
                    style={{
                      background:
                        "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
                      color: "#07090F",
                      boxShadow: "0 10px 30px -10px rgba(34,211,238,0.55)",
                    }}
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
                  <h2 className={`text-2xl font-bold ${textMain}`}>
                    What's your monthly income?
                  </h2>
                  <p className={`text-sm mt-2 ${textMuted}`}>
                    We'll use this to track your spending vs earning.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label
                      className={`text-xs font-medium ${textMuted} mb-1 block`}
                    >
                      Source name
                    </label>
                    <input
                      type="text"
                      value={data.incomeName}
                      onChange={(e) =>
                        setData({ ...data, incomeName: e.target.value })
                      }
                      placeholder="Salary"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg}`}
                      style={{ background: "var(--c3)", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label
                      className={`text-xs font-medium ${textMuted} mb-1 block`}
                    >
                      Amount ({selectedCurrency.code})
                    </label>
                    <input
                      type="number"
                      value={data.incomeAmount}
                      onChange={(e) =>
                        setData({ ...data, incomeAmount: e.target.value })
                      }
                      placeholder="50000"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg}`}
                      style={{ background: "var(--c3)", outline: "none" }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={back}
                    className="flex-1 py-3 rounded-full font-medium transition"
                    style={{
                      border: "1px solid var(--c10)",
                      color: "var(--tx)",
                      background: "var(--c2)",
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={next}
                    disabled={!canProceedStep3}
                    className="flex-[2] py-3 rounded-full font-semibold transition"
                    style={{
                      background: canProceedStep3
                        ? "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)"
                        : "var(--bd)",
                      color: canProceedStep3 ? "#07090F" : "var(--tf)",
                      cursor: canProceedStep3 ? "pointer" : "not-allowed",
                      boxShadow: canProceedStep3
                        ? "0 10px 30px -10px rgba(34,211,238,0.55)"
                        : "none",
                    }}
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
                  <h2 className={`text-2xl font-bold ${textMain}`}>
                    What do you spend on?
                  </h2>
                  <p className={`text-sm mt-2 ${textMuted}`}>
                    Tap the ones that apply. You can change these anytime.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {COMMON_CATEGORIES.map((cat) => {
                    const isSelected = (data.selectedCategories || []).includes(
                      cat.name,
                    );
                    return (
                      <button
                        key={cat.name}
                        onClick={() => toggleCategory(cat.name)}
                        className="py-3 px-2 rounded-xl border-2 transition-all active:scale-95"
                        style={{
                          borderColor: isSelected ? "#818CF8" : "var(--c10)",
                          background: isSelected
                            ? "rgba(129,140,248,0.12)"
                            : "var(--c2)",
                        }}
                      >
                        <div className="text-2xl mb-1">{cat.emoji}</div>
                        <div className={`text-xs font-medium ${textMain}`}>
                          {cat.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={back}
                    className="flex-1 py-3 rounded-full font-medium transition"
                    style={{
                      border: "1px solid var(--c10)",
                      color: "var(--tx)",
                      background: "var(--c2)",
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={next}
                    disabled={!canProceedStep4}
                    className="flex-[2] py-3 rounded-full font-semibold transition"
                    style={{
                      background: canProceedStep4
                        ? "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)"
                        : "var(--bd)",
                      color: canProceedStep4 ? "#07090F" : "var(--tf)",
                      cursor: canProceedStep4 ? "pointer" : "not-allowed",
                      boxShadow: canProceedStep4
                        ? "0 10px 30px -10px rgba(34,211,238,0.55)"
                        : "none",
                    }}
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
                  <h2 className={`text-2xl font-bold ${textMain}`}>
                    Any savings goals?
                  </h2>
                  <p className={`text-sm mt-2 ${textMuted}`}>
                    Totally optional — you can add these later.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label
                      className={`text-xs font-medium ${textMuted} mb-1 block`}
                    >
                      Goal name
                    </label>
                    <input
                      type="text"
                      value={data.savingsGoalName}
                      onChange={(e) =>
                        setData({ ...data, savingsGoalName: e.target.value })
                      }
                      placeholder="Emergency fund"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg}`}
                      style={{ background: "var(--c3)", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label
                      className={`text-xs font-medium ${textMuted} mb-1 block`}
                    >
                      Target amount ({selectedCurrency.code})
                    </label>
                    <input
                      type="number"
                      value={data.savingsGoalTarget}
                      onChange={(e) =>
                        setData({ ...data, savingsGoalTarget: e.target.value })
                      }
                      placeholder="100000"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg}`}
                      style={{ background: "var(--c3)", outline: "none" }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={back}
                    className="flex-1 py-3 rounded-full font-medium transition"
                    style={{
                      border: "1px solid var(--c10)",
                      color: "var(--tx)",
                      background: "var(--c2)",
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={next}
                    className="flex-[2] py-3 rounded-full font-semibold hover:opacity-90 active:scale-[0.98] transition"
                    style={{
                      background:
                        "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
                      color: "#07090F",
                      boxShadow: "0 10px 30px -10px rgba(34,211,238,0.55)",
                    }}
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
                <h2 className={`text-3xl font-bold ${textMain}`}>
                  You're all set!
                </h2>
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
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl text-sm transition-all ${className}`}
      style={{
        background: "var(--c3)",
        border: `1px solid ${error ? "rgba(251,113,133,0.5)" : "var(--bd)"}`,
        color: "var(--tx)",
        fontFamily: "inherit",
        outline: "none",
      }}
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
  const gradients = {
    primary: "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
    secondary: "linear-gradient(135deg, #34D399 0%, #22D3EE 100%)",
    ai: "linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)",
  };
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`text-sm font-semibold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 ${className}`}
      style={{
        borderRadius: 999,
        padding: "10px 20px",
        background: gradients[variant] || gradients.primary,
        color: "#07090F",
        boxShadow:
          "0 10px 30px -10px rgba(34,211,238,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </motion.button>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p
      className="mt-1 text-xs flex items-center gap-1"
      style={{ color: "#FB7185" }}
    >
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
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel?.();
      }}
    >
      <DialogContent
        className="max-w-sm rounded-2xl"
        style={{
          background: "var(--modal-bg)",
          border: "1px solid var(--modal-bdr)",
          color: "var(--tx)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--tx)" }}>{title}</DialogTitle>
          <DialogDescription style={{ color: "var(--tm)" }}>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              border: "1px solid var(--bd)",
              color: "var(--tm)",
              background: "var(--c2)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm?.()}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: "linear-gradient(135deg, #FB7185, #F472B6)",
              color: "#07090F",
              border: "none",
            }}
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
        className="max-w-sm rounded-2xl"
        style={{
          background: "var(--modal-bg)",
          border: "1px solid var(--modal-bdr)",
          color: "var(--tx)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--tx)" }}>{title}</DialogTitle>
          {description && (
            <DialogDescription style={{ color: "var(--tm)" }}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="mt-2 space-y-2">
          <label className="text-xs" style={{ color: "var(--tm)" }}>
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
            <p
              className="text-xs flex items-center gap-1"
              style={{ color: "#FB7185" }}
            >
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              border: "1px solid var(--bd)",
              color: "var(--tm)",
              background: "var(--c2)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
              color: "#07090F",
              border: "none",
            }}
          >
            Confirm
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const SIDEBAR_NAV = [
  { icon: Wallet, label: "Dashboard" },
  { icon: TrendingUp, label: "Expenses" },
  { icon: Target, label: "Budgets" },
  { icon: PiggyBank, label: "Savings" },
  { icon: Sparkles, label: "AI Insights", badge: "NEW" },
  { icon: Settings, label: "Settings", desktopOnly: true },
];

function AppSidebar({ user, activeTab, onTabChange }) {
  const { dark } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = React.useRef(null);

  useEffect(() => {
    if (!profileOpen) return;
    function handler(e) {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  const firstName =
    user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const initial = (user?.displayName || user?.email || "A")[0].toUpperCase();

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 bg-white dark:bg-[#141828] border-r border-slate-200 dark:border-white/[0.06]"
      style={{ width: 224 }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-slate-200 dark:border-white/[0.06]">
        <img
          src="/brand/ancy-icon-512.png"
          alt="Ancy"
          className="w-9 h-9 rounded-[10px] shrink-0"
        />
        <div>
          <div
            className="font-bold text-[15px] leading-tight"
            style={{ color: "var(--tx)" }}
          >
            Ancy
          </div>
          <div
            className="text-[10px] leading-tight"
            style={{ color: "var(--tf)" }}
          >
            Money tracker
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {SIDEBAR_NAV.map(({ icon: Icon, label, badge, desktopOnly }) => {
          const isActive = activeTab === label;
          return (
            <button
              key={label}
              onClick={() => onTabChange(label)}
              className={`${desktopOnly ? "hidden lg:flex" : "flex"} w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-500/[0.18] text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/[0.22]"
                  : "text-slate-600 dark:text-[#9098AE] bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
              style={
                isActive && !dark
                  ? {}
                  : isActive
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(129,140,248,0.18) 0%, rgba(34,211,238,0.08) 100%)",
                        boxShadow: "0 4px 16px -8px rgba(129,140,248,0.4)",
                      }
                    : {}
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #818CF8, #22D3EE)",
                    color: "#07090F",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-white/[0.06]">
        {/* Theme row */}
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] text-slate-500 dark:text-[#5E667E]">
            {dark ? "Dark mode" : "Light mode"}
          </span>
          <ThemeToggle />
        </div>

        {/* User profile + sign-out dropdown */}
        {user && (
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all"
              style={{ background: profileOpen ? "var(--c6)" : "transparent" }}
            >
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #818CF8, #22D3EE)",
                  color: "#07090F",
                }}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-8 h-8 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initial
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--tx)" }}
                >
                  {firstName}
                </div>
                <div
                  className="text-[10px] truncate"
                  style={{ color: "var(--tf)" }}
                >
                  {user.email}
                </div>
              </div>
              <MoreHorizontal
                className="h-4 w-4 shrink-0"
                style={{ color: "var(--tf)" }}
              />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.13 }}
                  className="absolute bottom-full left-0 right-0 mb-1 rounded-2xl shadow-2xl overflow-hidden z-50"
                  style={{
                    background: "var(--sheet-bg)",
                    border: "1px solid var(--bd)",
                  }}
                >
                  <button
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-opacity hover:opacity-75"
                    style={{ color: "#FB7185" }}
                    onClick={() => {
                      setProfileOpen(false);
                      signOutUser();
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </aside>
  );
}

const MOBILE_NAV = [
  { icon: LayoutDashboard, label: "Dashboard", tab: "Dashboard" },
  { icon: Receipt, label: "Expenses", tab: "Expenses" },
  { icon: PieChartIcon, label: "Budgets", tab: "Budgets" },
  { icon: Target, label: "Savings", tab: "Savings" },
  { icon: Sparkles, label: "Insights", tab: "AI Insights" },
];

function MobileTabBar({ activeTab, onTabChange }) {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch bg-white dark:bg-[#141828] border-t border-slate-200 dark:border-white/[0.08]"
      style={{
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {MOBILE_NAV.map(({ icon: Icon, label, tab }) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`relative flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] gap-0.5 transition-colors ${isActive ? "text-indigo-500 dark:text-[#818CF8]" : "text-slate-400 dark:text-[#5E667E]"}`}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[9px] font-medium tracking-wide">
              {label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 w-8 h-0.5 rounded-full"
                style={{
                  background: "linear-gradient(90deg, #818CF8, #22D3EE)",
                }}
              />
            )}
          </button>
        );
      })}
    </motion.div>
  );
}

function MobileAvatarMenu({ user, onTabChange }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const { dark, toggle } = useTheme();

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;

  const initial = (user.displayName || user.email || "A")[0].toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-9 rounded-full flex items-center justify-center overflow-hidden shrink-0"
        style={{ background: "linear-gradient(135deg, #818CF8, #22D3EE)" }}
        aria-label="Account menu"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="h-9 w-9 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-sm font-bold" style={{ color: "#07090F" }}>
            {initial}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-11 w-44 rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{
              background: "var(--sheet-bg)",
              border: "1px solid var(--bd)",
            }}
          >
            <div
              className="px-3 pt-3 pb-2"
              style={{ borderBottom: "1px solid var(--bd-soft)" }}
            >
              <p
                className="text-xs font-semibold truncate"
                style={{ color: "var(--tx)" }}
              >
                {user.displayName || "Account"}
              </p>
              <p
                className="text-[10px] truncate mt-0.5"
                style={{ color: "var(--tf)" }}
              >
                {user.email}
              </p>
            </div>
            <div style={{ borderBottom: "1px solid var(--bd-soft)" }}>
              <button
                className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
                style={{ color: "var(--tx)" }}
                onClick={() => {
                  setOpen(false);
                  onTabChange("Settings");
                }}
              >
                <Settings
                  className="h-3.5 w-3.5"
                  style={{ color: "var(--tf)" }}
                />
                Settings
              </button>
              <button
                className="w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
                style={{ color: "var(--tx)" }}
                onClick={toggle}
              >
                <span className="flex items-center gap-2">
                  {dark ? (
                    <Moon
                      className="h-3.5 w-3.5"
                      style={{ color: "#FBBF24" }}
                    />
                  ) : (
                    <Sun className="h-3.5 w-3.5" style={{ color: "#FB923C" }} />
                  )}
                  {dark ? "Dark mode" : "Light mode"}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--c8)", color: "var(--tf)" }}
                >
                  ON
                </span>
              </button>
            </div>
            <button
              className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
              style={{ color: "#FB7185" }}
              onClick={() => {
                setOpen(false);
                signOutUser();
              }}
            >
              <X className="h-3.5 w-3.5" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggle}
      className="h-9 w-9 rounded-full flex items-center justify-center transition-all"
      style={{
        background: "var(--c5)",
        border: "1px solid var(--bd)",
        color: dark ? "#FBBF24" : "var(--tm)",
      }}
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

function QuickAddBar({
  categories,
  selectedCurrency,
  onExpenseAdd,
  addToast,
  showAITip,
  onAITipDismiss,
  isOnline,
  remainingParse = 10,
  parseLimits = 10,
  onLimitReached = () => {},
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Parsing...");
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
    if (!isOnline) {
      addToast("AI features need an internet connection. Try again when you're back online.", "info");
      return;
    }
    if (remainingParse <= 0) {
      onLimitReached();
      return;
    }
    setLoading(true);
    setLoadingMsg("Parsing...");
    setPreviews([]);
    setSelected({});
    const slowTimer = setTimeout(
      () => setLoadingMsg("Still working on it…"),
      10000,
    );
    try {
      const result = await Promise.race([
        parseExpenseFn({ text, categories, currency: selectedCurrency.code }),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(Object.assign(new Error("TIMEOUT"), { code: "TIMEOUT" })),
            30000,
          ),
        ),
      ]);
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
      console.error("[Functions] parseExpense failed:", err);
      if (err.code === "TIMEOUT") {
        addToast(
          "AI is unusually slow right now. Try again in a moment.",
          "error",
        );
      } else if (err.code === "functions/resource-exhausted" && err.details?.limitType) {
        onLimitReached();
      } else {
        addToast(functionsErrorMsg(err), "error");
      }
    } finally {
      clearTimeout(slowTimer);
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
    if (!isOnline) {
      addToast("Saved locally — will sync when you're back online", "info");
    } else {
      const crossKeys = [
        ...new Set(
          results.filter((r) => r.crossMonth).map((r) => r.targetMonthKey),
        ),
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
      className="relative p-5 rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(129,140,248,0.10) 0%, rgba(34,211,238,0.04) 100%)",
        border: "1px solid rgba(129,140,248,0.20)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" style={{ color: "#818CF8" }} />
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--tm)" }}
          >
            Quick Add — type up to {MAX_EXPENSES} expenses naturally
          </span>
        </div>
        {text.length > 0 && (
          <span
            className={`text-xs font-medium ${isAtLimit ? "text-[#FB7185]" : isNearLimit ? "text-[#FBBF24]" : "text-[#818CF8]"}`}
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
          className="flex-1 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{
            background: "var(--c4)",
            border: "1px solid var(--c10)",
            color: "var(--tx)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleParse}
          disabled={loading || !text.trim() || isAtLimit}
          className="px-4 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          style={{
            background: "linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)",
            color: "#07090F",
            border: "none",
            boxShadow: "0 8px 24px -8px rgba(167,139,250,0.5)",
          }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? loadingMsg : "Parse"}
        </motion.button>
      </div>

      {remainingParse < 3 && remainingParse >= 0 && (
        <p className="text-[11px] mt-1" style={{ color: "var(--tf)" }}>
          {remainingParse === 0
            ? "No quick-adds left today — resets at midnight UTC"
            : `${remainingParse} quick-add${remainingParse === 1 ? "" : "s"} left today`}
        </p>
      )}

      {!previews.length && !loading && (
        <p
          className="mt-2 text-[11px]"
          style={{ color: "rgba(129,140,248,0.6)" }}
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
            className="mt-3 p-3 rounded-xl"
            style={{ background: "var(--c4)", border: "1px solid var(--bd)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: "var(--tx)" }}>
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
                  className="text-[11px] underline"
                  style={{ color: "#818CF8" }}
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
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: selected[i]
                      ? "rgba(129,140,248,0.15)"
                      : "var(--c3)",
                    border: `1px solid ${selected[i] ? "rgba(129,140,248,0.35)" : "var(--c6)"}`,
                    opacity: selected[i] ? 1 : 0.55,
                  }}
                >
                  <div
                    className="h-4 w-4 rounded flex items-center justify-center shrink-0"
                    style={{
                      border: selected[i] ? "none" : "1px solid var(--c20)",
                      background: selected[i]
                        ? "linear-gradient(135deg, #818CF8, #22D3EE)"
                        : "transparent",
                    }}
                  >
                    {selected[i] && (
                      <span
                        style={{
                          color: "#07090F",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
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
                          className="text-[10px]"
                          style={{ color: "var(--tf)" }}
                        >
                          {f.label}
                        </p>
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: "var(--tx)" }}
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
                className="flex-1 py-2 rounded-full text-xs font-semibold disabled:opacity-40 transition-opacity"
                style={{
                  background:
                    "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
                  color: "#07090F",
                  border: "none",
                }}
              >
                ✓ Add {selectedCount > 0 ? `${selectedCount} ` : ""}Expense
                {selectedCount !== 1 ? "s" : ""}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-2 rounded-full border text-xs transition-colors"
                style={{
                  border: "1px solid var(--bd)",
                  color: "var(--tm)",
                  background: "var(--c2)",
                }}
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

  const inputStyle = (hasError) => ({
    background: "var(--c3)",
    border: `1px solid ${hasError ? "rgba(251,113,133,0.5)" : "var(--bd)"}`,
    color: "var(--tx)",
    outline: "none",
    fontFamily: "inherit",
    colorScheme: "dark",
  });

  const FormContent = () => (
    <div className="space-y-4">
      {/* Date */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--tm)" }}>
          Date
        </label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => {
            setForm((p) => ({ ...p, date: e.target.value }));
            if (errors.date) setErrors((p) => ({ ...p, date: "" }));
          }}
          className="w-full px-3 py-2.5 rounded-xl text-sm transition-all"
          style={inputStyle(errors.date)}
        />
        {errors.date && (
          <p
            className="text-xs flex items-center gap-1"
            style={{ color: "#FB7185" }}
          >
            <AlertCircle className="h-3 w-3" />
            {errors.date}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--tm)" }}>
          Category
        </label>
        <select
          value={form.category}
          onChange={(e) => {
            setForm((p) => ({ ...p, category: e.target.value }));
            if (errors.category) setErrors((p) => ({ ...p, category: "" }));
          }}
          className="w-full px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ ...inputStyle(errors.category), background: "var(--c5)" }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.category && (
          <p
            className="text-xs flex items-center gap-1"
            style={{ color: "#FB7185" }}
          >
            <AlertCircle className="h-3 w-3" />
            {errors.category}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--tm)" }}>
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
          className="w-full px-3 py-2.5 rounded-xl text-sm transition-all"
          style={inputStyle(errors.amount)}
        />
        {errors.amount && (
          <p
            className="text-xs flex items-center gap-1"
            style={{ color: "#FB7185" }}
          >
            <AlertCircle className="h-3 w-3" />
            {errors.amount}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--tm)" }}>
          Description (optional)
        </label>
        <input
          placeholder="e.g., Coffee at Starbucks"
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
          className="w-full px-3 py-2.5 rounded-xl text-sm transition-all"
          style={inputStyle(false)}
        />
      </div>

      {/* Recurring toggle */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() =>
              setForm((p) => ({ ...p, isRecurring: !p.isRecurring }))
            }
            className="relative w-9 h-5 rounded-full transition-colors"
            style={{ background: form.isRecurring ? "#818CF8" : "var(--c15)" }}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isRecurring ? "translate-x-4" : ""}`}
            />
          </div>
          <span className="text-xs" style={{ color: "var(--tm)" }}>
            Save as recurring
          </span>
        </label>
        {form.isRecurring && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--tm)" }}>
              Frequency:
            </span>
            <select
              value={form.frequency}
              onChange={(e) =>
                setForm((p) => ({ ...p, frequency: e.target.value }))
              }
              className="h-7 px-2 rounded-lg text-xs"
              style={{
                background: "var(--c5)",
                border: "1px solid var(--c10)",
                color: "var(--tx)",
                outline: "none",
                colorScheme: "dark",
              }}
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
          className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
          style={{
            border: "1px solid var(--c10)",
            color: "var(--tm)",
            background: "transparent",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
            color: "#07090F",
            border: "none",
          }}
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
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto"
              style={{
                background: "var(--sheet-bg)",
                borderTop: "1px solid var(--bd)",
              }}
            >
              <div
                className="w-10 h-1 rounded-full mx-auto mb-4"
                style={{ background: "var(--c20)" }}
              />
              <p
                className="text-base font-semibold mb-4"
                style={{ color: "var(--tx)" }}
              >
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
        className="max-w-md rounded-2xl"
        style={{
          background: "var(--modal-bg)",
          border: "1px solid var(--modal-bdr)",
          color: "var(--tx)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{ color: "var(--tx)" }}
          >
            <Pencil className="h-4 w-4 text-indigo-400" />
            Edit Expense
          </DialogTitle>
          <DialogDescription style={{ color: "var(--tm)" }}>
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

  const Content = () => (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--tm)" }}>
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
        className="text-xs underline"
        style={{ color: "#818CF8" }}
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
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
            style={{
              background: selectedRecurring[i]
                ? "rgba(129,140,248,0.15)"
                : "var(--c4)",
              border: `1px solid ${selectedRecurring[i] ? "rgba(129,140,248,0.35)" : "var(--c6)"}`,
            }}
          >
            {/* Checkbox */}
            <div
              className="h-4 w-4 rounded flex items-center justify-center shrink-0"
              style={{
                background: selectedRecurring[i]
                  ? "linear-gradient(135deg, #818CF8, #22D3EE)"
                  : "transparent",
                border: selectedRecurring[i] ? "none" : "1px solid var(--c20)",
              }}
            >
              {selectedRecurring[i] && (
                <span
                  style={{ color: "#07090F", fontSize: 10, fontWeight: 700 }}
                >
                  ✓
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--tx)" }}
                >
                  {r.description || r.category}
                </span>
                <span
                  className="text-sm font-semibold shrink-0 ml-2"
                  style={{ color: "#818CF8" }}
                >
                  {fmt(
                    r.amount,
                    selectedCurrency.code,
                    selectedCurrency.locale,
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs" style={{ color: "var(--tm)" }}>
                  {r.category}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--bd)", color: "var(--tm)" }}
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
          className="p-3 rounded-xl"
          style={{
            background: "rgba(129,140,248,0.10)",
            border: "1px solid rgba(129,140,248,0.20)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#818CF8" }}>
              {selectedCount} expense{selectedCount > 1 ? "s" : ""} selected
            </span>
            <span className="text-sm font-bold" style={{ color: "#818CF8" }}>
              {fmt(totalAmount, selectedCurrency.code, selectedCurrency.locale)}
            </span>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
          style={{
            border: "1px solid var(--c10)",
            color: "var(--tm)",
            background: "transparent",
          }}
        >
          Skip
        </button>
        <button
          onClick={onConfirm}
          disabled={selectedCount === 0}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
            color: "#07090F",
            border: "none",
          }}
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
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
              style={{
                background: "var(--sheet-bg)",
                borderTop: "1px solid var(--bd)",
              }}
            >
              <div
                className="w-10 h-1 rounded-full mx-auto mb-4"
                style={{ background: "var(--c20)" }}
              />
              <p
                className="text-base font-semibold mb-4"
                style={{ color: "var(--tx)" }}
              >
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
        className="max-w-md rounded-2xl"
        style={{
          background: "var(--modal-bg)",
          border: "1px solid var(--modal-bdr)",
          color: "var(--tx)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{ color: "var(--tx)" }}
          >
            🔄 Recurring Expenses
          </DialogTitle>
          <DialogDescription style={{ color: "var(--tm)" }}>
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
  const isOnline = useNetworkStatus();
  const wasOffline = useRef(false);
  const { usage: usageQuota, remaining: quotaRemaining, limits: quotaLimits, costToday, costMonth, monthlyUsage } = useUsageQuota(user?.uid);
  const [limitModal, setLimitModal] = useState({ open: false, feature: "", source: "" });
  const [pendingIds, setPendingIds] = useState(() => new Set());

  // Reconnection toast + clear pending sync indicators
  useEffect(() => {
    if (isOnline && wasOffline.current) {
      addToast("Back online — syncing your changes...", "success");
      const timer = setTimeout(() => setPendingIds(new Set()), 3000);
      wasOffline.current = false;
      return () => clearTimeout(timer);
    }
    if (!isOnline) wasOffline.current = true;
  }, [isOnline, addToast]);

  // Saves with offline-aware toast. type only used when online.
  const toastSaved = useCallback((msg, type = "success") => {
    if (isOnline) {
      addToast(msg, type);
    } else {
      addToast("Saved locally — will sync when you're back online", "info");
    }
  }, [isOnline, addToast]);

  // Track items added/edited while offline so we can show a sync indicator
  const markPending = useCallback((id) => {
    if (!isOnline) setPendingIds((prev) => new Set([...prev, id]));
  }, [isOnline]);

  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("ancy-theme") === "dark";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add("ancy-dark", "dark");
      html.classList.remove("ancy-light");
    } else {
      html.classList.add("ancy-light");
      html.classList.remove("ancy-dark", "dark");
    }
  }, [dark]);
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
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("ancy-default-view") || "Dashboard",
  );
  const [activeSettingsSection, setActiveSettingsSection] = useState("profile");
  const [defaultView, setDefaultView] = useState(
    () => localStorage.getItem("ancy-default-view") || "Dashboard",
  );
  const [bankImportOpen, setBankImportOpen] = useState(false);
  const [insightsCache, setInsightsCache] = useState({});
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsLoadingMsg, setInsightsLoadingMsg] = useState(
    "Analysing your spending…",
  );
  const [insightsError, setInsightsError] = useState("");
  const [insightsPeriod, setInsightsPeriod] = useState("Month");
  const [windowExpenses, setWindowExpenses] = useState(null);
  const [windowIncome, setWindowIncome] = useState(null);
  const [windowLoading, setWindowLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
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
        console.log(
          "[AITip Debug] onboarded:",
          onboarded,
          "tipDismissed:",
          tipDismissed,
        );
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
      localStorage.getItem(
        `ancy-recurring-applied-${user.uid}:${currentPeriodKey}`,
      ) === "true";
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
              const income =
                (data.incomeSources || []).reduce(
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
          [...results]
            .reverse()
            .map((r) => {
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
            })
            .filter((r) => r.spending > 0 || r.income > 0),
        );
      } catch {
        // silent
      } finally {
        setTrendLoading(false);
      }
    })();
  }, [user?.uid, totals.totalExp]);

  // Reset window state when the main period changes; AI cache is kept per period key
  useEffect(() => {
    setInsightsError("");
    setInsightsPeriod("Month");
    setWindowExpenses(null);
    setWindowIncome(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriodKey]);

  // Auto-fetch when the tab opens, the period changes, or expenses first load
  useEffect(() => {
    if (
      activeTab === "AI Insights" &&
      !insightsCache[currentPeriodKey] &&
      !insightsLoading &&
      !insightsError &&
      expenses.length > 0
    ) {
      fetchInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPeriodKey, expenses.length]);

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

  // Count all expenses across all stored periods (for export section)
  const totalExpenseCount = useMemo(() => {
    if (!user?.uid) return 0;
    const allData = readAllPeriodsFromStorage(user.uid);
    return Object.values(allData).reduce(
      (sum, d) => sum + (d?.expenses?.length || 0),
      0,
    );
  }, [user?.uid]);

  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: "var(--page-bg, #06080F)" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-sm" style={{ color: "var(--tm)" }}>
            Loading your dashboard...
          </p>
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

  async function fetchInsights(force = false) {
    if (insightsLoading) return;
    if (!force && insightsCache[currentPeriodKey]) return;
    if (!isOnline) {
      addToast("AI features need an internet connection. Try again when you're back online.", "info");
      return;
    }
    if (quotaRemaining.insights <= 0) {
      setLimitModal({ open: true, feature: "AI Insights", source: "insights" });
      return;
    }
    if (expenses.length < 5) {
      setInsightsError("no_data_for_period");
      return;
    }
    setInsightsLoading(true);
    setInsightsLoadingMsg("Analysing your spending…");
    setInsightsError("");
    const periodLabel =
      monthOptions.find((m) => m.key === selectedMonth)?.label || "this month";
    const slowTimer = setTimeout(
      () => setInsightsLoadingMsg("Still working on it…"),
      10000,
    );
    try {
      const result = await Promise.race([
        getSpendingInsightsFn({
          expenses,
          income: totals.income,
          categories,
          currency: selectedCurrency.code,
          period: periodLabel,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(Object.assign(new Error("TIMEOUT"), { code: "TIMEOUT" })),
            30000,
          ),
        ),
      ]);
      setInsightsCache((prev) => ({
        ...prev,
        [currentPeriodKey]: result.data.insights,
      }));
    } catch (err) {
      console.error("[Functions] fetchInsights failed:", err);
      if (err.code === "TIMEOUT") {
        setInsightsError(
          "AI is unusually slow right now. Try again in a moment.",
        );
      } else if (err.code === "functions/resource-exhausted" && err.details?.limitType) {
        setLimitModal({ open: true, feature: "AI Insights", source: "insights" });
      } else {
        setInsightsError(functionsErrorMsg(err));
      }
    } finally {
      clearTimeout(slowTimer);
      setInsightsLoading(false);
    }
  }

  async function switchInsightsWindow(p) {
    if (p === insightsPeriod || windowLoading) return;
    setInsightsPeriod(p);
    if (p === "Week" || p === "Month") {
      setWindowExpenses(null);
      setWindowIncome(null);
      return;
    }
    setWindowLoading(true);
    try {
      const count = p === "Quarter" ? 3 : 12;
      const monthKeys = Array.from({ length: count }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      });
      const allExp = [];
      let allIncome = 0;
      for (const key of monthKeys) {
        const data = await loadMonth(user.uid, key);
        allExp.push(...(data.expenses || []));
        allIncome += (data.incomeSources || []).reduce(
          (s, src) => s + Number(src.amount || 0),
          0,
        );
      }
      setWindowExpenses(allExp.length > 0 ? allExp : null);
      setWindowIncome(allIncome > 0 ? allIncome : null);
    } catch (err) {
      console.error("[Firestore] switchInsightsWindow failed:", err);
      addToast(firestoreErrorMsg(err), "error");
      setWindowExpenses(null);
      setWindowIncome(null);
    } finally {
      setWindowLoading(false);
    }
  }

  async function resetAllData() {
    if (!user) return;
    setResetLoading(true);
    try {
      await wipeUserData(user.uid);
      // Clear all period localStorage keys for this user
      const keysToRemove = Object.keys(localStorage).filter((k) =>
        k.startsWith(`expense-tracker:${user.uid}:`),
      );
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      // Reset in-memory state
      setState({
        incomeSources: [],
        expenses: [],
        catBudgets: {},
        categories: [],
        savingsGoals: [],
      });
      setInsightsCache({});
      setResetDialogOpen(false);
      setResetConfirmText("");
      setActiveTab("Dashboard");
      addToast("All data has been deleted.", "success");
    } catch (err) {
      addToast("Failed to reset data. Please try again.", "error");
      console.error("resetAllData error:", err);
    } finally {
      setResetLoading(false);
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
        } catch {
          /* ignore malformed cached data */
        }
      }
      targetData = {
        ...targetData,
        expenses: [newExpense, ...(targetData.expenses || [])],
      };
      localStorage.setItem(localKey, JSON.stringify(targetData));
      saveMonth(user.uid, targetMonthKey, targetData).catch((err) =>
        console.error("[Firestore] background saveMonth failed:", err),
      );

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
    toastSaved("Income source added!");
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
        toastSaved("Removed.");
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
        } catch {
          /* ignore malformed cached data */
        }
      }
      targetData = {
        ...targetData,
        expenses: [newExpenseObj, ...(targetData.expenses || [])],
      };
      localStorage.setItem(localKey, JSON.stringify(targetData));
      saveMonth(user.uid, targetMonthKey, targetData).catch((err) =>
        console.error("[Firestore] background saveMonth failed:", err),
      );

      // For custom-range views, append to display state if the date is in range
      if (currentPeriodKey.startsWith("custom-")) {
        const suffix = currentPeriodKey.slice(7);
        const rangeStart = suffix.slice(0, 10);
        const rangeEnd = suffix.slice(11);
        if (
          newExpenseObj.date >= rangeStart &&
          newExpenseObj.date <= rangeEnd
        ) {
          setState((s) => ({
            ...s,
            expenses: [newExpenseObj, ...(s.expenses || [])],
          }));
        }
      }
    }

    markPending(newExpenseObj.id);

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
      toastSaved(
        sameMonth
          ? `Expense added + saved as ${exp.frequency} recurring!`
          : `Expense added to ${targetMonthKey} + saved as ${exp.frequency} recurring!`,
        sameMonth ? "success" : "info",
      );
    } else {
      toastSaved(
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
        toastSaved("Deleted.");
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
    markPending(updated.id);
    setEditingExpense(null);
    toastSaved(
      updated.isRecurring
        ? "Expense updated + saved as recurring!"
        : "Expense updated!",
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
        toastSaved("Recurring expense removed.");
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
        } catch {
          /* ignore malformed cached data */
        }
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
      saveMonth(user.uid, targetMonthKey, targetData).catch((err) =>
        console.error("[Firestore] background saveMonth failed:", err),
      );
      const msg =
        skipped > 0
          ? `${newItems.length} added to ${targetMonthKey}, ${skipped} already existed`
          : `${newItems.length} expense${newItems.length !== 1 ? "s" : ""} added to ${targetMonthKey}`;
      addToast(msg, "info");
    }

    setRecurringReviewOpen(false);
    setRecurringBanner(false);
    localStorage.setItem(
      `ancy-recurring-applied-${user.uid}:${currentPeriodKey}`,
      "true",
    );
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
    toastSaved(`"${name}" added!`);
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
        toastSaved(`"${name}" deleted.`);
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
    markPending(goal.id);
    toastSaved("Goal added!");
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
        toastSaved("Goal deleted.");
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
        toastSaved("Added!");
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
        toastSaved("Withdrawn.");
        closeAmountInput();
      },
    });
  }

  const anyOverBudget = categories.some((c) => {
    const spent = totals.byCat.find((x) => x.name === c)?.value || 0;
    const bud = Number(catBudgets[c]) || 0;
    return bud > 0 && spent > bud;
  });

  function handleExportCsv() {
    try {
      const allData = readAllPeriodsFromStorage(user.uid);
      const csv = buildExpensesCsv(allData);
      downloadFile(
        csv,
        `ancy-expenses-${todayStamp()}.csv`,
        "text/csv;charset=utf-8",
      );
      addToast("CSV downloaded", "success");
    } catch (err) {
      console.error("[Export] CSV failed:", err);
      addToast("Couldn't export. Try again.", "error");
    }
  }

  function handleExportJson() {
    try {
      const allData = readAllPeriodsFromStorage(user.uid);
      const json = buildFullJsonExport({
        allMonthsData: allData,
        catBudgets,
        incomeSources,
        savingsGoals,
        categories,
        user,
        currency: selectedCurrency.code,
      });
      downloadFile(
        JSON.stringify(json, null, 2),
        `ancy-export-${todayStamp()}.json`,
        "application/json",
      );
      addToast("Backup downloaded", "success");
    } catch (err) {
      console.error("[Export] JSON failed:", err);
      addToast("Couldn't export. Try again.", "error");
    }
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle: toggleTheme }}>
      {!isOnline && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "var(--c6, rgba(99,102,241,0.08))",
            borderBottom: "1px solid var(--bd)",
            color: "var(--tm)",
            fontSize: 12,
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontWeight: 500,
          }}
        >
          <Cloud style={{ width: 13, height: 13, flexShrink: 0 }} />
          You're offline. Changes will sync when you reconnect.
        </div>
      )}
      <div
        className="min-h-screen w-full flex bg-slate-50 dark:bg-[#06080F]"
        style={{
          color: "var(--tx)",
          transition: "background 0.3s ease, color 0.25s ease",
          paddingTop: isOnline ? 0 : 31,
        }}
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

                  if (
                    onboardingData.incomeAmount &&
                    Number(onboardingData.incomeAmount) > 0
                  ) {
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
                      new Set([
                        ...(s.categories || []),
                        ...onboardingData.selectedCategories,
                      ]),
                    );
                  }

                  if (
                    onboardingData.savingsGoalName &&
                    onboardingData.savingsGoalTarget
                  ) {
                    const defaultTargetDate = new Date();
                    defaultTargetDate.setMonth(
                      defaultTargetDate.getMonth() + 3,
                    );
                    next.savingsGoals = [
                      ...(s.savingsGoals || []),
                      {
                        id: crypto.randomUUID(),
                        name: onboardingData.savingsGoalName,
                        targetAmount: Number(onboardingData.savingsGoalTarget),
                        currentAmount: 0,
                        targetDate: defaultTargetDate
                          .toISOString()
                          .split("T")[0],
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
          <div
            className="fixed inset-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <div
              style={{
                position: "absolute",
                top: "-15%",
                right: "-10%",
                width: 600,
                height: 600,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(129,140,248,0.18) 0%, transparent 65%)",
                filter: "blur(60px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-10%",
                left: "-10%",
                width: 500,
                height: 500,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 65%)",
                filter: "blur(60px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "40%",
                left: "30%",
                width: 400,
                height: 400,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 65%)",
                filter: "blur(80px)",
              }}
            />
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
          isOnline={isOnline}
          remainingStatements={quotaRemaining.statement}
          onLimitReached={() => setLimitModal({ open: true, feature: "Statement Import", source: "statement" })}
        />

        <LimitReachedModal
          isOpen={limitModal.open}
          onClose={() => setLimitModal((prev) => ({ ...prev, open: false }))}
          featureName={limitModal.feature}
          source={limitModal.source}
          userId={user?.uid}
        />

        {/* ── SIDEBAR ───────────────────────────────────────── */}
        <AppSidebar
          user={user}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* ── MOBILE BOTTOM TAB BAR ─────────────────────────── */}
        <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ── MOBILE FAB ────────────────────────────────────── */}
        <motion.button
          className="lg:hidden fixed z-50 flex items-center justify-center rounded-full shadow-2xl"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
            right: 16,
            width: 52,
            height: 52,
            background: "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
            boxShadow: "0 8px 24px -6px rgba(129,140,248,0.7)",
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => setActiveTab("Expenses")}
          aria-label="Add expense"
        >
          <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
        </motion.button>

        {/* ── MAIN CONTENT ──────────────────────────────────── */}
        <div className="flex-1 min-h-screen flex flex-col lg:ml-56">
          {/* Mobile top bar — only visible below lg */}
          <div
            className="lg:hidden sticky top-0 z-30 bg-white dark:bg-[#141828] border-b border-slate-200 dark:border-white/[0.06]"
            style={{
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* Row 1: Logo + Avatar */}
            <div className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center gap-2.5">
                <img
                  src="/brand/ancy-icon-512.png"
                  alt="Ancy"
                  className="w-7 h-7 rounded-xl"
                />
                <span
                  className="font-bold text-sm"
                  style={{ color: "var(--tx)" }}
                >
                  Ancy
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <MobileAvatarMenu user={user} onTabChange={setActiveTab} />
              </div>
            </div>
            {/* Row 2: Controls */}
            <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 px-2.5 rounded-xl border text-xs shrink-0 min-w-[9rem]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {monthOptions.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="shrink-0">
                <CurrencySelector />
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("AI Insights")}
                className="h-8 px-3 rounded-xl text-xs flex items-center gap-1.5 text-white font-medium shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)",
                }}
              >
                <Sparkles className="h-3 w-3" />
                AI
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setBankImportOpen(true)}
                className="h-8 px-3 rounded-xl text-xs flex items-center gap-1.5 shrink-0"
                style={{
                  background: "var(--c5)",
                  border: "1px solid var(--c10)",
                  color: "var(--tm)",
                }}
              >
                <Upload className="h-3 w-3" />
                Import
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={exportCSV}
                className="h-8 px-3 rounded-xl text-xs flex items-center gap-1.5 shrink-0"
                style={{
                  background: "var(--c5)",
                  border: "1px solid var(--c10)",
                  color: "var(--tm)",
                }}
              >
                <Download className="h-3 w-3" />
                Export
              </motion.button>
            </div>
          </div>

          {/* Scrollable main area */}
          <div className="flex-1 p-4 lg:px-6 lg:pt-7 w-full pb-24 md:pb-8">
            {/* Recurring banner */}
            <AnimatePresence>
              {recurringBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-5 p-4 rounded-2xl flex items-center justify-between gap-4"
                  style={{
                    background: "rgba(129,140,248,0.10)",
                    border: "1px solid rgba(129,140,248,0.25)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔄</span>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "#818CF8" }}
                      >
                        You have {recurringExpenses.length} recurring expense
                        {recurringExpenses.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs" style={{ color: "var(--tm)" }}>
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
                      onClick={() => setRecurringReviewOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90"
                      style={{
                        background:
                          "linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)",
                        color: "#07090F",
                        border: "none",
                      }}
                    >
                      Review & Add
                    </button>
                    <button
                      onClick={() => setRecurringBanner(false)}
                      className="p-1.5 rounded-xl transition-colors"
                      style={{ color: "var(--tm)" }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── GREETING + ACTION BAR ─────────────────────── */}
            {(() => {
              const hour = new Date().getHours();
              const greeting =
                hour < 12
                  ? "Good morning"
                  : hour < 17
                    ? "Good afternoon"
                    : "Good evening";
              const name =
                user?.displayName?.split(" ")[0] ||
                user?.email?.split("@")[0] ||
                "there";
              return (
                <motion.div
                  {...stagger(0)}
                  className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
                >
                  <div>
                    <p
                      className="text-[11px] font-semibold tracking-[0.12em] uppercase"
                      style={{ color: "var(--tf)" }}
                    >
                      {greeting}, {name}
                    </p>
                    <h1
                      className="text-[24px] font-bold mt-0.5 tracking-tight leading-tight"
                      style={{ color: "var(--tx)" }}
                    >
                      Here&apos;s where your money stands.
                    </h1>
                  </div>
                  <div className="hidden lg:flex flex-wrap items-center gap-2">
                    {/* Period selector */}
                    <div className="flex flex-col gap-1.5">
                      <Select
                        value={selectedMonth}
                        onValueChange={setSelectedMonth}
                      >
                        <SelectTrigger className="h-9 px-3 rounded-xl border text-sm min-w-[9rem]">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
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
                            <p
                              className="text-[10px] mb-0.5"
                              style={{ color: "var(--tf)" }}
                            >
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
                              className="h-8 px-2 rounded-xl text-xs w-32"
                              style={{
                                background: "var(--c5)",
                                border: "1px solid var(--c10)",
                                color: "var(--tx)",
                                outline: "none",
                                colorScheme: dark ? "dark" : "light",
                              }}
                            />
                          </div>
                          <div>
                            <p
                              className="text-[10px] mb-0.5"
                              style={{ color: "var(--tf)" }}
                            >
                              To
                            </p>
                            <input
                              type="date"
                              value={customDateRange.end}
                              onChange={(e) =>
                                setCustomDateRange((p) => ({
                                  ...p,
                                  end: e.target.value,
                                }))
                              }
                              className="h-8 px-2 rounded-xl text-xs w-32"
                              style={{
                                background: "var(--c5)",
                                border: "1px solid var(--c10)",
                                color: "var(--tx)",
                                outline: "none",
                                colorScheme: dark ? "dark" : "light",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <CurrencySelector />

                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveTab("AI Insights")}
                      className="h-9 px-4 rounded-xl text-sm flex items-center gap-1.5 text-white font-medium"
                      style={{
                        background:
                          "linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)",
                        boxShadow: "0 6px 20px -6px rgba(167,139,250,0.55)",
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">AI Insights</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setBankImportOpen(true)}
                      className="h-9 px-3 rounded-xl text-sm flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      style={{
                        background: "var(--c5)",
                        border: "1px solid var(--c10)",
                        color: "var(--tm)",
                      }}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">Import</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={exportCSV}
                      className="h-9 px-3 rounded-xl text-sm flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      style={{
                        background: "var(--c5)",
                        border: "1px solid var(--c10)",
                        color: "var(--tm)",
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">Export</span>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })()}

            {/* ── TAB VIEWS ─────────────────────────────────── */}

            {/* ── DASHBOARD ── */}
            {activeTab === "Dashboard" && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                {/* Left */}
                <div className="space-y-6">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Income",
                        value: fmt(
                          totals.income,
                          selectedCurrency.code,
                          selectedCurrency.locale,
                        ),
                        icon: Wallet,
                        glow: "rgba(129,140,248,0.12)",
                        iconColor: "#818CF8",
                      },
                      {
                        label: "Expenses",
                        value: fmt(
                          totals.totalExp,
                          selectedCurrency.code,
                          selectedCurrency.locale,
                        ),
                        icon: TrendingUp,
                        glow: "rgba(251,113,133,0.12)",
                        iconColor: "#FB7185",
                      },
                      {
                        label: "Remaining",
                        value: fmt(
                          totals.remaining,
                          selectedCurrency.code,
                          selectedCurrency.locale,
                        ),
                        icon: Wallet2,
                        glow:
                          totals.remaining < 0
                            ? "rgba(251,113,133,0.12)"
                            : "rgba(52,211,153,0.12)",
                        iconColor: totals.remaining < 0 ? "#FB7185" : "#34D399",
                      },
                      {
                        label: "Saved",
                        value: fmt(
                          totals.saved,
                          selectedCurrency.code,
                          selectedCurrency.locale,
                        ),
                        icon: PiggyBank,
                        glow: "rgba(251,191,36,0.12)",
                        iconColor: "#FBBF24",
                      },
                    ].map((card, i) => (
                      <motion.div key={card.label} {...stagger(i + 1)}>
                        <div
                          className="rounded-2xl p-4 bg-white dark:bg-white/[0.035] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none"
                          style={{
                            backdropFilter: "blur(20px) saturate(160%)",
                            WebkitBackdropFilter: "blur(20px) saturate(160%)",
                            boxShadow: dark
                              ? `0 0 40px -20px ${card.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
                              : undefined,
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p
                              className="text-[9px] uppercase tracking-[0.14em] font-semibold"
                              style={{ color: "var(--tf)" }}
                            >
                              {card.label}
                            </p>
                            <div
                              className="w-7 h-7 rounded-xl flex items-center justify-center"
                              style={{
                                background: `${card.glow}`,
                                border: `1px solid ${card.iconColor}25`,
                              }}
                            >
                              <card.icon
                                className="h-3.5 w-3.5"
                                style={{ color: card.iconColor }}
                              />
                            </div>
                          </div>
                          <p
                            className="text-xl xl:text-2xl font-bold leading-none tracking-tight tabular-nums whitespace-nowrap overflow-hidden text-ellipsis"
                            style={{ color: "var(--tx)" }}
                          >
                            {card.value}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Budget usage bar */}
                  <motion.div {...stagger(5)}>
                    <GlassCard className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-xs"
                          style={{ color: "var(--tm)" }}
                        >
                          Overall budget usage
                        </span>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "#818CF8" }}
                        >
                          {totals.util}%
                        </span>
                      </div>
                      <div
                        className="h-2.5 w-full rounded-full overflow-hidden"
                        style={{ background: "var(--bd)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(totals.util, 100)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-2.5 rounded-full"
                          style={{
                            background:
                              totals.util > 100
                                ? "#FB7185"
                                : totals.util > 80
                                  ? "#FB923C"
                                  : "linear-gradient(90deg, #818CF8, #22D3EE)",
                          }}
                        />
                      </div>
                      <p
                        className="mt-1.5 text-xs"
                        style={{ color: "var(--tf)" }}
                      >
                        Total expenses / total income
                      </p>
                    </GlassCard>
                  </motion.div>

                  {/* Integration 1: Dashboard empty state */}
                  {expenses.length === 0 && selectedMonth !== "custom" && (
                    <motion.div {...stagger(6)}>
                      <GlassCard className="p-5">
                        <EmptyState
                          icon={Receipt}
                          heading="Let's get the first one in"
                          subtext="Add an expense — even a small one. Ancy figures out the rest."
                          ctaLabel="+ Add expense"
                          onCta={() => setActiveTab("Expenses")}
                        />
                      </GlassCard>
                    </motion.div>
                  )}

                  {/* Income vs Spending area chart */}
                  <motion.div {...stagger(7)}>
                    <GlassCard className="p-5">
                      <SectionTitle icon={TrendingUp}>
                        Income vs Spending
                      </SectionTitle>
                      <p
                        className="text-xs -mt-2 mb-4"
                        style={{ color: "var(--tf)" }}
                      >
                        6-month overview
                      </p>
                      {trendLoading ? (
                        <div className="flex items-center justify-center h-[200px]">
                          <Loader2
                            className="h-5 w-5 animate-spin"
                            style={{ color: "#818CF8" }}
                          />
                        </div>
                      ) : trendData.length < 2 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] gap-2">
                          <TrendingUp
                            className="h-8 w-8 opacity-20"
                            style={{ color: "#818CF8" }}
                          />
                          <p className="text-xs" style={{ color: "var(--tf)" }}>
                            Add expenses across at least two months to see trends
                          </p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart
                            data={trendData}
                            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="gradIncome"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#34d399"
                                  stopOpacity={0.25}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#34d399"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                              <linearGradient
                                id="gradSpending"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#f87171"
                                  stopOpacity={0.25}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#f87171"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--c6)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="month"
                              tick={{ fill: "var(--tm)", fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip
                              formatter={(v, name) => [
                                fmt(
                                  Number(v),
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                ),
                                name === "spending" ? "Spending" : "Income",
                              ]}
                              labelFormatter={(l) => l}
                              labelStyle={{ color: "#a5b4fc", fontWeight: 600 }}
                              contentStyle={{
                                borderRadius: 12,
                                border: "1px solid var(--bd)",
                                background: "var(--sheet-bg)",
                                color: "var(--tx)",
                              }}
                            />
                            <Legend
                              verticalAlign="top"
                              align="right"
                              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                              formatter={(v) =>
                                v === "spending" ? "Spending" : "Income"
                              }
                            />
                            <Area
                              type="monotone"
                              dataKey="income"
                              stroke="#34d399"
                              strokeWidth={2}
                              fill="url(#gradIncome)"
                              dot={false}
                            />
                            <Area
                              type="monotone"
                              dataKey="spending"
                              stroke="#f87171"
                              strokeWidth={2}
                              fill="url(#gradSpending)"
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </GlassCard>
                  </motion.div>

                  {/* Recent Activity */}
                  <motion.div {...stagger(8)}>
                    <GlassCard className="p-5">
                      <SectionTitle icon={Zap}>Recent Activity</SectionTitle>
                      {(() => {
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - 7);
                        const recent = [...expenses]
                          .filter((e) => new Date(e.date) >= cutoff)
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .slice(0, 10);
                        if (recent.length === 0)
                          return (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                              <Zap
                                className="h-7 w-7 opacity-20"
                                style={{ color: "#818CF8" }}
                              />
                              <p
                                className="text-xs"
                                style={{ color: "var(--tf)" }}
                              >
                                No activity in the last 7 days
                              </p>
                            </div>
                          );
                        return (
                          <div
                            className="divide-y"
                            style={{ borderColor: "var(--bd-soft)" }}
                          >
                            {recent.map((e) => {
                              const cat = e.category || "Other";
                              const color = colorFor(cat);
                              return (
                                <div
                                  key={e.id}
                                  className="flex items-center gap-3 py-3 first:pt-1 last:pb-0"
                                >
                                  <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                                    style={{
                                      background: `${color}20`,
                                      border: `1px solid ${color}35`,
                                      color,
                                    }}
                                  >
                                    {cat[0].toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className="text-sm font-medium truncate"
                                      style={{ color: "var(--tx)" }}
                                    >
                                      {e.description || cat}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span
                                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                        style={{
                                          background: `${color}18`,
                                          color,
                                          border: `1px solid ${color}30`,
                                        }}
                                      >
                                        {cat}
                                      </span>
                                      <span
                                        className="text-[11px]"
                                        style={{ color: "var(--tf)" }}
                                      >
                                        {formatDateHeader(new Date(e.date))}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className="text-sm font-bold tabular-nums shrink-0"
                                    style={{ color: "#FB7185" }}
                                  >
                                    -
                                    {fmt(
                                      e.amount,
                                      selectedCurrency.code,
                                      selectedCurrency.locale,
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </GlassCard>
                  </motion.div>
                </div>

                {/* Right — donut + savings preview */}
                <div className="space-y-6">
                  {totals.byCat.length > 0 && (
                  <motion.div {...stagger(2)}>
                    <GlassCard className="p-5">
                      <SectionTitle icon={TrendingUp}>By Category</SectionTitle>
                      <>
                          <div className="h-48 relative">
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
                                    border: "1px solid var(--c10)",
                                    background: "var(--sheet-bg)",
                                    color: "var(--tx)",
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span
                                className="text-[9px] uppercase tracking-[0.14em] font-semibold"
                                style={{ color: "var(--tf)" }}
                              >
                                Total
                              </span>
                              <span
                                className="text-base font-bold leading-tight mt-0.5"
                                style={{ color: "var(--tx)" }}
                              >
                                {fmt(
                                  totals.totalExp,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {totals.byCat.map((entry) => {
                              const pct =
                                totals.totalExp > 0
                                  ? (
                                      (entry.value / totals.totalExp) *
                                      100
                                    ).toFixed(1)
                                  : "0.0";
                              return (
                                <div
                                  key={entry.name}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full shrink-0"
                                      style={{
                                        background: colorFor(entry.name),
                                      }}
                                    />
                                    <span
                                      className="truncate"
                                      style={{ color: "var(--tm)" }}
                                    >
                                      {entry.name}
                                    </span>
                                  </div>
                                  <div
                                    className="flex items-center gap-2 shrink-0 ml-2"
                                    style={{ color: "var(--tm)" }}
                                  >
                                    <span>
                                      {fmt(
                                        entry.value,
                                        selectedCurrency.code,
                                        selectedCurrency.locale,
                                      )}
                                    </span>
                                    <span
                                      className="w-10 text-right font-semibold"
                                      style={{ color: "var(--tx)" }}
                                    >
                                      {pct}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                      </>
                    </GlassCard>
                  </motion.div>
                  )}

                  {/* Savings Goals preview */}
                  {savingsGoals.length > 0 && (
                    <motion.div {...stagger(3)}>
                      <GlassCard className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <SectionTitle icon={PiggyBank}>
                            Savings Goals
                          </SectionTitle>
                          <button
                            onClick={() => setActiveTab("Savings")}
                            className="text-[11px] font-semibold hover:opacity-75 transition-opacity"
                            style={{ color: "#818CF8" }}
                          >
                            View all →
                          </button>
                        </div>
                        <div className="space-y-4">
                          {savingsGoals.slice(0, 3).map((goal) => {
                            const pct =
                              Math.min(
                                100,
                                Math.round(
                                  (goal.currentAmount / goal.targetAmount) *
                                    100,
                                ),
                              ) || 0;
                            const done = pct >= 100;
                            return (
                              <div key={goal.id} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span
                                    className="text-xs font-medium truncate max-w-[65%]"
                                    style={{ color: "var(--tx)" }}
                                  >
                                    {goal.name}
                                  </span>
                                  <span
                                    className="text-xs font-bold tabular-nums"
                                    style={{
                                      color: done ? "#34D399" : "#818CF8",
                                    }}
                                  >
                                    {pct}%
                                  </span>
                                </div>
                                <div
                                  className="h-1.5 w-full rounded-full overflow-hidden"
                                  style={{ background: "var(--bd)" }}
                                >
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{
                                      duration: 0.7,
                                      ease: "easeOut",
                                    }}
                                    className="h-1.5 rounded-full"
                                    style={{
                                      background: done
                                        ? "#34D399"
                                        : "linear-gradient(90deg, #818CF8, #22D3EE)",
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span
                                    className="text-[10px]"
                                    style={{ color: "var(--tf)" }}
                                  >
                                    {fmt(
                                      goal.currentAmount,
                                      selectedCurrency.code,
                                      selectedCurrency.locale,
                                    )}{" "}
                                    saved
                                  </span>
                                  <span
                                    className="text-[10px]"
                                    style={{ color: "var(--tf)" }}
                                  >
                                    {fmt(
                                      goal.targetAmount,
                                      selectedCurrency.code,
                                      selectedCurrency.locale,
                                    )}
                                  </span>
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
            )}

            {/* ── EXPENSES ── */}
            {activeTab === "Expenses" && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                <div className="space-y-6">
                  {/* Add Expense */}
                  <motion.div {...stagger(1)}>
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
                                  console.error(
                                    "Failed to dismiss AI tip:",
                                    err,
                                  );
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
                            isOnline={isOnline}
                            remainingParse={quotaRemaining.parse}
                            parseLimits={quotaLimits.parse}
                            onLimitReached={() => setLimitModal({ open: true, feature: "Quick Add", source: "parse" })}
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
                        className="flex items-center gap-3 mb-4"
                        style={{ color: "var(--tf)" }}
                      >
                        <div className="flex-1 h-px bg-current opacity-30" />
                        <span className="text-xs">or add manually</span>
                        <div className="flex-1 h-px bg-current opacity-30" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-3 sm:items-start">
                        <div className="sm:col-span-2 space-y-1">
                          <label
                            className="text-xs"
                            style={{ color: "var(--tf)" }}
                          >
                            Date
                          </label>
                          <ThemedInput
                            id="add-expense-date"
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
                          <label
                            className="text-xs"
                            style={{ color: "var(--tf)" }}
                          >
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
                              className={`h-[42px] rounded-xl text-sm ${expErrors.category ? "border-red-400/50" : ""}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
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
                          <label
                            className="text-xs"
                            style={{ color: "var(--tf)" }}
                          >
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
                          <label
                            className="text-xs"
                            style={{ color: "var(--tf)" }}
                          >
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
                        <div className="sm:col-span-6 flex items-center gap-4 flex-wrap">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div
                              onClick={() =>
                                setExp((p) => ({
                                  ...p,
                                  isRecurring: !p.isRecurring,
                                }))
                              }
                              className="relative w-9 h-5 rounded-full transition-colors"
                              style={{
                                background: exp.isRecurring
                                  ? "#818CF8"
                                  : "var(--c15)",
                              }}
                            >
                              <div
                                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${exp.isRecurring ? "translate-x-4" : ""}`}
                              />
                            </div>
                            <span
                              className="text-xs"
                              style={{ color: "var(--tf)" }}
                            >
                              Recurring expense
                            </span>
                          </label>
                          {exp.isRecurring && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-2"
                            >
                              <span
                                className="text-xs"
                                style={{ color: "var(--tf)" }}
                              >
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
                                className="h-7 px-2 rounded-lg text-xs"
                                style={{
                                  background: "var(--c5)",
                                  border: "1px solid var(--c10)",
                                  color: "var(--tx)",
                                  outline: "none",
                                }}
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
                      <div className="mt-4 lg:hidden space-y-2">
                        {expenses.length === 0 ? (
                          selectedMonth === "custom" ? (
                            <EmptyState
                              icon={Calendar}
                              heading="Nothing here for these dates"
                              subtext={`No expenses logged between ${customDateRange.start ? new Date(customDateRange.start + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "start"} and ${customDateRange.end ? new Date(customDateRange.end + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "end"}.`}
                              ctaLabel="Change dates"
                              onCta={() => setActiveTab("Dashboard")}
                              secondaryLabel="Reset to this month"
                              onSecondary={() => setSelectedMonth(monthOptions[1]?.key)}
                              className="py-8 min-h-0"
                            />
                          ) : (
                            <EmptyState
                              icon={Receipt}
                              heading="No expenses yet"
                              subtext="Tap the + button or use Quick Add to log one."
                              ctaLabel="+ Add expense"
                              onCta={() => document.getElementById("add-expense-date")?.focus()}
                              className="py-8 min-h-0"
                            />
                          )
                        ) : (
                          (() => {
                            const grouped = groupExpensesByDate(expenses);
                            const visibleGroups = showOlderExpenses
                              ? grouped
                              : grouped.slice(0, 5);
                            return (
                              <>
                                {visibleGroups.map((group) => {
                                  const isCollapsed = collapsedDates.has(
                                    group.dateKey,
                                  );
                                  return (
                                    <React.Fragment key={group.dateKey}>
                                      <div
                                        className="flex items-center gap-2 px-1 py-1.5 cursor-pointer"
                                        onClick={() => {
                                          const next = new Set(collapsedDates);
                                          if (isCollapsed)
                                            next.delete(group.dateKey);
                                          else next.add(group.dateKey);
                                          setCollapsedDates(next);
                                        }}
                                      >
                                        <ChevronDown
                                          className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                                          style={{ color: "var(--tm)" }}
                                        />
                                        <span
                                          className="text-xs font-semibold"
                                          style={{ color: "var(--tx)" }}
                                        >
                                          {formatDateHeader(group.date)}
                                        </span>
                                        <span
                                          className="text-xs ml-auto font-semibold"
                                          style={{ color: "var(--tx)" }}
                                        >
                                          {fmt(
                                            group.total,
                                            selectedCurrency.code,
                                            selectedCurrency.locale,
                                          )}
                                        </span>
                                      </div>
                                      {!isCollapsed &&
                                        group.items.map((e) => (
                                          <motion.div
                                            key={e.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm group"
                                            style={{
                                              background: "var(--c4)",
                                              border: "1px solid var(--c6)",
                                            }}
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <span
                                                className="h-2 w-2 rounded-full shrink-0"
                                                style={{
                                                  background: colorFor(
                                                    e.category,
                                                  ),
                                                }}
                                              />
                                              <div className="min-w-0">
                                                <p
                                                  className="font-medium truncate"
                                                  style={{ color: "var(--tx)" }}
                                                >
                                                  {e.description || e.category}
                                                </p>
                                                <p
                                                  className="text-[11px]"
                                                  style={{ color: "var(--tf)" }}
                                                >
                                                  {e.category} ·{" "}
                                                  {new Date(
                                                    e.date,
                                                  ).toLocaleDateString()}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              {pendingIds.has(e.id) && (
                                                <span
                                                  title="Waiting to sync — will upload when you're back online"
                                                  className="inline-flex items-center"
                                                  aria-label="Waiting to sync"
                                                >
                                                  <CloudUpload
                                                    className="h-3 w-3 shrink-0"
                                                    style={{ color: "var(--tf)" }}
                                                  />
                                                </span>
                                              )}
                                              <span
                                                className="font-semibold"
                                                style={{ color: "var(--tx)" }}
                                              >
                                                {fmt(
                                                  e.amount,
                                                  selectedCurrency.code,
                                                  selectedCurrency.locale,
                                                )}
                                              </span>
                                              <button
                                                onClick={() =>
                                                  setEditingExpense(e)
                                                }
                                                className="transition-colors hover:text-[#818CF8] opacity-0 group-hover:opacity-100"
                                                style={{ color: "var(--tf)" }}
                                              >
                                                <Pencil className="h-3.5 w-3.5" />
                                              </button>
                                              <button
                                                onClick={() =>
                                                  removeExpense(e.id)
                                                }
                                                className="transition-colors hover:text-[#FB7185] opacity-0 group-hover:opacity-100"
                                                style={{ color: "var(--tf)" }}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </motion.div>
                                        ))}
                                    </React.Fragment>
                                  );
                                })}
                                {grouped.length > 5 && (
                                  <button
                                    onClick={() =>
                                      setShowOlderExpenses(!showOlderExpenses)
                                    }
                                    className="w-full py-2 text-xs font-medium transition-colors"
                                    style={{ color: "var(--tm)" }}
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
                      <div className="mt-4 hidden lg:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr
                              className="text-left text-xs border-b"
                              style={{
                                color: "var(--tf)",
                                borderColor: "var(--c6)",
                              }}
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
                                <td colSpan={5}>
                                  {selectedMonth === "custom" ? (
                                    <EmptyState
                                      icon={Calendar}
                                      heading="Nothing here for these dates"
                                      subtext={`No expenses logged between ${customDateRange.start ? new Date(customDateRange.start + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "start"} and ${customDateRange.end ? new Date(customDateRange.end + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "end"}.`}
                                      ctaLabel="Change dates"
                                      onCta={() => setActiveTab("Dashboard")}
                                      secondaryLabel="Reset to this month"
                                      onSecondary={() => setSelectedMonth(monthOptions[1]?.key)}
                                      className="py-8 min-h-0"
                                    />
                                  ) : (
                                    <EmptyState
                                      icon={Receipt}
                                      heading="No expenses yet"
                                      subtext="Tap the + button or use Quick Add to log one."
                                      ctaLabel="+ Add expense"
                                      onCta={() => document.getElementById("add-expense-date")?.focus()}
                                      className="py-8 min-h-0"
                                    />
                                  )}
                                </td>
                              </tr>
                            ) : (
                              (() => {
                                const grouped = groupExpensesByDate(expenses);
                                const visibleGroups = showOlderExpenses
                                  ? grouped
                                  : grouped.slice(0, 5);
                                return (
                                  <>
                                    {visibleGroups.map((group) => {
                                      const isCollapsed = collapsedDates.has(
                                        group.dateKey,
                                      );
                                      return (
                                        <React.Fragment key={group.dateKey}>
                                          <tr
                                            className="cursor-pointer transition-colors hover:bg-white/10"
                                            style={{ background: "var(--c4)" }}
                                            onClick={() => {
                                              const next = new Set(
                                                collapsedDates,
                                              );
                                              if (isCollapsed)
                                                next.delete(group.dateKey);
                                              else next.add(group.dateKey);
                                              setCollapsedDates(next);
                                            }}
                                          >
                                            <td
                                              colSpan={3}
                                              className="py-2 pl-2"
                                            >
                                              <div className="flex items-center gap-2">
                                                <ChevronDown
                                                  className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                                                  style={{ color: "var(--tm)" }}
                                                />
                                                <span
                                                  className="text-sm font-semibold"
                                                  style={{ color: "var(--tx)" }}
                                                >
                                                  {formatDateHeader(group.date)}
                                                </span>
                                                <span
                                                  className="text-xs"
                                                  style={{ color: "var(--tf)" }}
                                                >
                                                  ({group.items.length}{" "}
                                                  {group.items.length === 1
                                                    ? "expense"
                                                    : "expenses"}
                                                  )
                                                </span>
                                              </div>
                                            </td>
                                            <td
                                              className="py-2 text-right font-semibold"
                                              style={{ color: "var(--tx)" }}
                                            >
                                              {fmt(
                                                group.total,
                                                selectedCurrency.code,
                                                selectedCurrency.locale,
                                              )}
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
                                                className="border-b transition-colors group hover:bg-white/5"
                                                style={{
                                                  borderColor: "var(--c5)",
                                                }}
                                              >
                                                <td
                                                  className="py-3 pl-2"
                                                  style={{ color: "var(--tm)" }}
                                                >
                                                  {new Date(
                                                    e.date,
                                                  ).toLocaleDateString()}
                                                </td>
                                                <td className="py-3">
                                                  <span className="flex items-center gap-1.5">
                                                    <span
                                                      className="h-2 w-2 rounded-full shrink-0"
                                                      style={{
                                                        background: colorFor(
                                                          e.category,
                                                        ),
                                                      }}
                                                    />
                                                    <span
                                                      style={{
                                                        color: "var(--tx)",
                                                      }}
                                                    >
                                                      {e.category}
                                                    </span>
                                                  </span>
                                                </td>
                                                <td
                                                  className="py-3"
                                                  style={{ color: "var(--tm)" }}
                                                >
                                                  {e.description}
                                                </td>
                                                <td
                                                  className="py-3 text-right font-semibold"
                                                  style={{ color: "var(--tx)" }}
                                                >
                                                  <span className="flex items-center justify-end gap-1.5">
                                                    {pendingIds.has(e.id) && (
                                                      <span
                                                        title="Waiting to sync — will upload when you're back online"
                                                        className="inline-flex items-center"
                                                        aria-label="Waiting to sync"
                                                      >
                                                        <CloudUpload
                                                          className="h-3 w-3"
                                                          style={{ color: "var(--tf)" }}
                                                        />
                                                      </span>
                                                    )}
                                                    {fmt(
                                                      e.amount,
                                                      selectedCurrency.code,
                                                      selectedCurrency.locale,
                                                    )}
                                                  </span>
                                                </td>
                                                <td className="py-3 text-right pr-2">
                                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                      onClick={() =>
                                                        setEditingExpense(e)
                                                      }
                                                      className="transition-colors hover:text-[#818CF8]"
                                                      style={{
                                                        color: "var(--tf)",
                                                      }}
                                                    >
                                                      <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                      onClick={() =>
                                                        removeExpense(e.id)
                                                      }
                                                      className="transition-colors hover:text-[#FB7185]"
                                                      style={{
                                                        color: "var(--tf)",
                                                      }}
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
                                        <td
                                          colSpan={5}
                                          className="py-2 text-center"
                                        >
                                          <button
                                            onClick={() =>
                                              setShowOlderExpenses(
                                                !showOlderExpenses,
                                              )
                                            }
                                            className="text-xs font-medium transition-colors"
                                            style={{ color: "var(--tm)" }}
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
                </div>

                {/* Right sidebar for Expenses tab */}
                <div className="space-y-6">
                  {/* Recurring Expenses */}
                  {recurringExpenses.length > 0 && (
                    <motion.div {...stagger(1)}>
                      <GlassCard className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-base">🔄</span>
                          <h2
                            className="font-semibold text-sm"
                            style={{ color: "var(--tx)" }}
                          >
                            Recurring
                          </h2>
                        </div>
                        <div className="space-y-2">
                          {recurringExpenses.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between p-3 rounded-xl"
                              style={{
                                background: "var(--c4)",
                                border: "1px solid var(--c6)",
                              }}
                            >
                              <div className="min-w-0">
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{ color: "var(--tx)" }}
                                >
                                  {r.description || r.category}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span
                                    className="text-xs"
                                    style={{ color: "var(--tm)" }}
                                  >
                                    {r.category}
                                  </span>
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{
                                      background: "var(--bd)",
                                      color: "var(--tm)",
                                    }}
                                  >
                                    {r.frequency}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <span
                                  className="text-sm font-semibold"
                                  style={{ color: "#818CF8" }}
                                >
                                  {fmt(
                                    r.amount,
                                    selectedCurrency.code,
                                    selectedCurrency.locale,
                                  )}
                                </span>
                                <button
                                  onClick={() => removeRecurringExpense(r.id)}
                                  className="transition-colors hover:text-[#FB7185]"
                                  style={{ color: "var(--tf)" }}
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

                  {/* Income context */}
                  <motion.div {...stagger(2)}>
                    <GlassCard className="p-5">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--tm)" }}
                        >
                          Total Income
                        </span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: "#34D399" }}
                        >
                          {fmt(
                            totals.income,
                            selectedCurrency.code,
                            selectedCurrency.locale,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--tm)" }}
                        >
                          Total Expenses
                        </span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: "#FB7185" }}
                        >
                          {fmt(
                            totals.totalExp,
                            selectedCurrency.code,
                            selectedCurrency.locale,
                          )}
                        </span>
                      </div>
                      <div
                        className="mt-3 h-2 w-full rounded-full overflow-hidden"
                        style={{ background: "var(--bd)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(totals.util, 100)}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-2 rounded-full"
                          style={{
                            background:
                              totals.util > 100
                                ? "#FB7185"
                                : "linear-gradient(90deg, #818CF8, #22D3EE)",
                          }}
                        />
                      </div>
                      <p
                        className="mt-1 text-[10px]"
                        style={{ color: "var(--tf)" }}
                      >
                        {totals.util}% of income spent
                      </p>
                    </GlassCard>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ── BUDGETS ── */}
            {activeTab === "Budgets" && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                <motion.div {...stagger(1)}>
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Target
                        className="h-4 w-4"
                        style={{ color: "#818CF8" }}
                      />
                      <h2
                        className="font-semibold text-sm"
                        style={{ color: "var(--tx)" }}
                      >
                        Category Budgets
                      </h2>
                      {anyOverBudget && (
                        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                          Over budget
                        </span>
                      )}
                    </div>
                    <p className="text-xs mb-4" style={{ color: "var(--tf)" }}>
                      Set spending limits per category
                    </p>
                    {/* Integration 5: Budgets empty state */}
                    {Object.values(catBudgets).every(v => !v || Number(v) === 0) && (
                      <EmptyState
                        icon={Wallet}
                        heading="Set a budget when you're ready"
                        subtext="Budgets help you spot drift early. They're optional — Ancy works without them."
                        ctaLabel="Set budgets"
                        onCta={() => document.querySelector("[data-first-budget]")?.focus()}
                        className="py-6 min-h-0"
                      />
                    )}
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
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: "var(--tx)" }}
                                >
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
                                <span
                                  className="text-[10px]"
                                  style={{ color: "var(--tf)" }}
                                >
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
                              data-first-budget={c === categories[0] ? "" : undefined}
                              className="w-full px-3 py-2 rounded-xl text-xs transition-all"
                              style={{
                                background: "var(--c4)",
                                border: `1px solid ${isOver ? "rgba(251,113,133,0.4)" : "var(--c10)"}`,
                                color: "var(--tx)",
                                outline: "none",
                                fontFamily: "inherit",
                              }}
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
                                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                                  style={{ background: "var(--bd)" }}
                                >
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.6 }}
                                    className="h-1.5 rounded-full"
                                    style={{
                                      background: isOver
                                        ? "#FB7185"
                                        : pct > 80
                                          ? "#FB923C"
                                          : "linear-gradient(90deg, #818CF8, #22D3EE)",
                                    }}
                                  />
                                </div>
                                <span
                                  className="text-[10px] shrink-0"
                                  style={{ color: "var(--tf)" }}
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
                              <p
                                className="text-[10px]"
                                style={{ color: "var(--tf)" }}
                              >
                                no budget set
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Right: Goals overview */}
                <div className="space-y-6">
                  {savingsGoals.length > 0 && (
                    <motion.div {...stagger(2)}>
                      <GlassCard className="p-5">
                        <SectionTitle
                          icon={PiggyBank}
                          iconColor="text-green-400"
                        >
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
                                    className="text-xs font-medium truncate"
                                    style={{ color: "var(--tx)" }}
                                  >
                                    {goal.name}
                                  </span>
                                  <span
                                    className="text-xs font-semibold shrink-0 ml-2"
                                    style={{ color: "#818CF8" }}
                                  >
                                    {pct.toFixed(0)}%
                                  </span>
                                </div>
                                <div
                                  className="h-1.5 w-full rounded-full overflow-hidden"
                                  style={{ background: "var(--bd)" }}
                                >
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${Math.min(pct, 100)}%`,
                                    }}
                                    transition={{ duration: 0.6 }}
                                    className="h-1.5 rounded-full"
                                    style={{
                                      background:
                                        pct >= 100
                                          ? "#34D399"
                                          : "linear-gradient(90deg, #818CF8, #22D3EE)",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </GlassCard>
                    </motion.div>
                  )}
                  {/* Overall budget summary */}
                  <motion.div {...stagger(3)}>
                    <GlassCard className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-xs"
                          style={{ color: "var(--tm)" }}
                        >
                          Overall budget usage
                        </span>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "#818CF8" }}
                        >
                          {totals.util}%
                        </span>
                      </div>
                      <div
                        className="h-2.5 w-full rounded-full overflow-hidden"
                        style={{ background: "var(--bd)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(totals.util, 100)}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-2.5 rounded-full"
                          style={{
                            background:
                              totals.util > 100
                                ? "#FB7185"
                                : totals.util > 80
                                  ? "#FB923C"
                                  : "linear-gradient(90deg, #818CF8, #22D3EE)",
                          }}
                        />
                      </div>
                    </GlassCard>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ── SAVINGS ── */}
            {activeTab === "Savings" && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                <div className="space-y-6">
                  {/* Progress list */}
                  <motion.div {...stagger(1)}>
                    <GlassCard className="p-5">
                      <SectionTitle icon={PiggyBank} iconColor="text-green-400">
                        Savings Goals
                      </SectionTitle>
                      {savingsGoals.length === 0 ? (
                        <p
                          className="text-xs text-center py-4"
                          style={{ color: "var(--tf)" }}
                        >
                          No savings goals yet. Add one below.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {savingsGoals.map((goal) => {
                            const pct =
                              Math.min(
                                100,
                                Math.round(
                                  (goal.currentAmount / goal.targetAmount) *
                                    100,
                                ),
                              ) || 0;
                            const remaining = Math.max(
                              0,
                              goal.targetAmount - goal.currentAmount,
                            );
                            const done = pct >= 100;
                            return (
                              <div key={goal.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="text-sm font-semibold truncate"
                                      style={{ color: "var(--tx)" }}
                                    >
                                      {goal.name}
                                    </span>
                                    {goal.priority && (
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${goal.priority === "high" ? "text-red-400 bg-red-500/10 border-red-500/20" : goal.priority === "medium" ? "text-orange-400 bg-orange-500/10 border-orange-500/20" : "text-green-400 bg-green-500/10 border-green-500/20"}`}
                                      >
                                        {goal.priority}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <span
                                      className="text-sm font-bold tabular-nums"
                                      style={{
                                        color: done ? "#34D399" : "var(--tx)",
                                      }}
                                    >
                                      {pct}%
                                    </span>
                                    <button
                                      onClick={() => handleGoalAddMoney(goal)}
                                      className="text-[10px] px-2 py-1 rounded-lg font-medium"
                                      style={{
                                        background: "rgba(52,211,153,0.12)",
                                        color: "#34D399",
                                        border:
                                          "1px solid rgba(52,211,153,0.25)",
                                      }}
                                    >
                                      + Add
                                    </button>
                                    <button
                                      onClick={() => handleGoalWithdraw(goal)}
                                      className="text-[10px] px-2 py-1 rounded-lg font-medium"
                                      style={{
                                        background: "var(--c4)",
                                        color: "var(--tm)",
                                        border: "1px solid var(--c6)",
                                      }}
                                    >
                                      Withdraw
                                    </button>
                                    <button
                                      onClick={() =>
                                        removeSavingsGoal(goal.id, goal.name)
                                      }
                                      className="transition-colors hover:text-[#FB7185]"
                                      style={{ color: "var(--tf)" }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div
                                  className="h-2 w-full rounded-full overflow-hidden"
                                  style={{ background: "var(--bd)" }}
                                >
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{
                                      duration: 0.7,
                                      ease: "easeOut",
                                    }}
                                    className="h-2 rounded-full"
                                    style={{
                                      background: done
                                        ? "#34D399"
                                        : "linear-gradient(90deg, #818CF8, #22D3EE)",
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span
                                    className="text-[11px]"
                                    style={{ color: "var(--tf)" }}
                                  >
                                    {fmt(
                                      goal.currentAmount,
                                      selectedCurrency.code,
                                      selectedCurrency.locale,
                                    )}{" "}
                                    saved
                                  </span>
                                  <span
                                    className="text-[11px]"
                                    style={{ color: "var(--tf)" }}
                                  >
                                    {done
                                      ? "Goal reached! 🎉"
                                      : `${fmt(remaining, selectedCurrency.code, selectedCurrency.locale)} to go`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                </div>

                {/* Add Goal form */}
                <motion.div {...stagger(2)}>
                  <GlassCard className="p-5">
                    <SectionTitle icon={Plus}>New Goal</SectionTitle>
                    <div className="space-y-3">
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
                          <label
                            className="text-xs"
                            style={{ color: "var(--tf)" }}
                          >
                            {label}
                          </label>
                          <ThemedInput
                            type={type === "date" ? "date" : "text"}
                            inputMode={
                              type === "numeric" ? "numeric" : undefined
                            }
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
                        <label
                          className="text-xs"
                          style={{ color: "var(--tf)" }}
                        >
                          Priority
                        </label>
                        <Select
                          value={newGoal.priority}
                          onValueChange={(v) =>
                            setNewGoal({ ...newGoal, priority: v })
                          }
                        >
                          <SelectTrigger className="h-[42px] rounded-xl text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <GradBtn
                        onClick={addSavingsGoal}
                        variant="secondary"
                        className="w-full"
                      >
                        + Add Goal
                      </GradBtn>
                    </div>
                  </GlassCard>
                </motion.div>
              </div>
            )}

            {/* ── AI INSIGHTS ── */}
            {activeTab === "AI Insights" &&
              (() => {
                const periodLabel =
                  monthOptions.find((m) => m.key === selectedMonth)?.label ||
                  "This month";
                const cachedInsights = insightsCache[currentPeriodKey] || null;

                // Active window expenses: Quarter/Year loaded from Firestore, Week filtered locally
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 7);
                const activeWindowExpenses =
                  windowExpenses ??
                  (insightsPeriod === "Week"
                    ? expenses.filter((e) => new Date(e.date) >= cutoff)
                    : expenses);
                const activeIncome = windowIncome ?? totals.income;

                // Weekly pattern from active window
                const weeklyAcc = {
                  Mon: 0,
                  Tue: 0,
                  Wed: 0,
                  Thu: 0,
                  Fri: 0,
                  Sat: 0,
                  Sun: 0,
                };
                activeWindowExpenses.forEach((e) => {
                  const label = [
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                  ][new Date(e.date).getDay()];
                  weeklyAcc[label] += Number(e.amount) || 0;
                });
                const weeklyData = [
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                  "Sun",
                ].map((d) => ({ day: d, amount: Math.round(weeklyAcc[d]) }));
                const peakDay = weeklyData.reduce(
                  (a, b) => (b.amount > a.amount ? b : a),
                  weeklyData[0],
                );

                // Category totals from active window
                const catTotals = {};
                activeWindowExpenses.forEach((e) => {
                  catTotals[e.category] =
                    (catTotals[e.category] || 0) + Number(e.amount || 0);
                });
                const catEntries = Object.entries(catTotals)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 7)
                  .map(([cat, spent]) => ({
                    cat,
                    spent,
                    budget: catBudgets?.[cat] || 0,
                  }));
                const maxCatSpend = catEntries.reduce(
                  (m, c) => Math.max(m, c.spent),
                  1,
                );
                const topCategory = catEntries[0]?.cat || "—";
                const topCategoryAmount = catEntries[0]?.spent || 0;

                // Aggregate stats
                const totalWindowExpenses = activeWindowExpenses.reduce(
                  (sum, e) => sum + Number(e.amount || 0),
                  0,
                );
                const netSavings = activeIncome - totalWindowExpenses;
                const savingsRate =
                  activeIncome > 0
                    ? Math.round((netSavings / activeIncome) * 100)
                    : 0;
                const windowDays =
                  insightsPeriod === "Week"
                    ? 7
                    : insightsPeriod === "Quarter"
                      ? 90
                      : insightsPeriod === "Year"
                        ? 365
                        : Math.max(1, new Date().getDate());
                const dailyVelocity = Math.round(
                  totalWindowExpenses / windowDays,
                );

                // AI narrative cards — static per period, not affected by window toggle
                const watchOut =
                  cachedInsights?.anomalies?.find(
                    (a) => a.severity === "high" || a.severity === "medium",
                  ) || cachedInsights?.anomalies?.[0];
                const win =
                  cachedInsights?.anomalies?.find(
                    (a) => a.severity === "low" && a !== watchOut,
                  ) || cachedInsights?.anomalies?.find((a) => a !== watchOut);

                return (
                  <div className="space-y-5 max-w-5xl">
                    {/* ─ Persistent header with period toggle ─ */}
                    {expenses.length > 0 && (
                      <motion.div {...stagger(1)}>
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <div>
                            <p
                              className="text-[11px] font-bold tracking-[0.14em] uppercase mb-1.5 flex items-center gap-2"
                              style={{ color: "#A78BFA" }}
                            >
                              AI Insights · {periodLabel}
                              <span
                                className="font-medium normal-case tracking-normal"
                                style={{ color: "var(--tf)", fontSize: 10 }}
                              >
                                {quotaRemaining.insights}/{quotaLimits.insights} today
                              </span>
                            </p>
                            {cachedInsights && !insightsLoading && (
                              <h1
                                className="text-xl font-bold leading-snug max-w-lg"
                                style={{ color: "var(--tx)" }}
                              >
                                {cachedInsights.personality?.tagline ||
                                  "Your spending summary is ready."}
                              </h1>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className="flex rounded-xl p-0.5"
                              style={{
                                background: "var(--c6)",
                                border: "1px solid var(--bd)",
                              }}
                            >
                              {["Week", "Month", "Quarter", "Year"].map((p) => (
                                <button
                                  key={p}
                                  disabled={windowLoading || insightsLoading}
                                  onClick={() => switchInsightsWindow(p)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                                  style={
                                    p === insightsPeriod
                                      ? {
                                          background:
                                            "linear-gradient(135deg,#A78BFA,#818CF8)",
                                          color: "#fff",
                                        }
                                      : { color: "var(--tm)" }
                                  }
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                            {!insightsLoading && (
                              <button
                                onClick={() => fetchInsights(true)}
                                className="h-8 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-opacity hover:opacity-70"
                                style={{
                                  background: "var(--c6)",
                                  border: "1px solid var(--bd)",
                                  color: "var(--tm)",
                                }}
                                title="Force a fresh AI analysis"
                              >
                                ↻ Refresh
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Loading AI */}
                    {insightsLoading && (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div
                          className="relative w-16 h-16 flex items-center justify-center rounded-3xl"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(167,139,250,0.2), rgba(129,140,248,0.1))",
                            border: "1px solid rgba(129,140,248,0.3)",
                          }}
                        >
                          <Loader2
                            className="h-7 w-7 animate-spin"
                            style={{ color: "#A78BFA" }}
                          />
                        </div>
                        <div className="text-center">
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--tx)" }}
                          >
                            {insightsLoadingMsg}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{ color: "var(--tf)" }}
                          >
                            Claude is reading {periodLabel}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Integration 4: Not enough data for insights */}
                    {insightsError === "no_data_for_period" &&
                      !insightsLoading && (
                        <EmptyState
                          icon={Sparkles}
                          heading="Need a bit more to work with"
                          subtext={`Insights kick in after about 5 expenses. You have ${expenses.length}.`}
                          ctaLabel="+ Add expense"
                          onCta={() => setActiveTab("Expenses")}
                        />
                      )}

                    {/* API error */}
                    {insightsError &&
                      insightsError !== "no_data_for_period" &&
                      !insightsLoading && (
                        <GlassCard className="p-8 flex flex-col items-center gap-4 text-center">
                          <AlertCircle
                            className="h-10 w-10"
                            style={{ color: "#FB7185" }}
                          />
                          <div>
                            <p
                              className="font-semibold"
                              style={{ color: "var(--tx)" }}
                            >
                              Could not load insights
                            </p>
                            <p
                              className="text-sm mt-1"
                              style={{ color: "var(--tm)" }}
                            >
                              {insightsError}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setInsightsError("");
                              fetchInsights();
                            }}
                            className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                            style={{
                              background:
                                "linear-gradient(135deg, #A78BFA, #818CF8)",
                            }}
                          >
                            Try again
                          </button>
                        </GlassCard>
                      )}

                    {/* Integration 4: Zero expenses, insights never attempted */}
                    {!insightsLoading &&
                      !insightsError &&
                      expenses.length === 0 && (
                        <EmptyState
                          icon={Sparkles}
                          heading="Need a bit more to work with"
                          subtext="Insights kick in after about 5 expenses."
                          ctaLabel="+ Add expense"
                          onCta={() => setActiveTab("Expenses")}
                        />
                      )}

                    {/* Main content — shown once AI has loaded and we have expenses */}
                    {!insightsLoading &&
                      !insightsError &&
                      expenses.length > 0 && (
                        <>
                          {/* Window loading indicator for Quarter / Year Firestore fetch */}
                          {windowLoading && (
                            <div className="flex items-center gap-2 px-1">
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin shrink-0"
                                style={{ color: "#A78BFA" }}
                              />
                              <span
                                className="text-xs"
                                style={{ color: "var(--tm)" }}
                              >
                                Loading {insightsPeriod} data…
                              </span>
                            </div>
                          )}

                          {/* ─ Stat Cards (computed locally from the active window) ─ */}
                          <motion.div
                            {...stagger(2)}
                            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
                          >
                            {[
                              {
                                label: "Net Savings",
                                value: fmt(
                                  netSavings,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                ),
                                sub: `${savingsRate}% savings rate`,
                                icon:
                                  netSavings >= 0 ? TrendingUp : TrendingDown,
                                color: netSavings >= 0 ? "#34D399" : "#FB7185",
                              },
                              {
                                label: "Daily Spend",
                                value: fmt(
                                  dailyVelocity,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                ),
                                sub: "per day this period",
                                icon: Zap,
                                color: "#818CF8",
                              },
                              {
                                label: "Top Category",
                                value: topCategory,
                                sub: fmt(
                                  topCategoryAmount,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                ),
                                icon: PiggyBank,
                                color: "#FBBF24",
                              },
                              {
                                label: "Total Spent",
                                value: fmt(
                                  totalWindowExpenses,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                ),
                                sub: `${activeWindowExpenses.length} transactions`,
                                icon: Receipt,
                                color: "#22D3EE",
                              },
                            ].map(
                              ({ label, value, sub, icon: Icon, color }) => (
                                <GlassCard key={label} className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span
                                      className="text-[10px] font-semibold uppercase tracking-wider"
                                      style={{ color: "var(--tf)" }}
                                    >
                                      {label}
                                    </span>
                                    <div
                                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                                      style={{ background: `${color}18` }}
                                    >
                                      <Icon
                                        className="h-3.5 w-3.5"
                                        style={{ color }}
                                      />
                                    </div>
                                  </div>
                                  <p
                                    className="text-base font-bold leading-tight truncate"
                                    style={{ color }}
                                  >
                                    {value}
                                  </p>
                                  <p
                                    className="text-[11px] mt-1"
                                    style={{ color: "var(--tf)" }}
                                  >
                                    {sub}
                                  </p>
                                </GlassCard>
                              ),
                            )}
                          </motion.div>

                          {/* ─ Watch Out + Win cards (from cached AI, static per period) ─ */}
                          {cachedInsights?.anomalies?.length > 0 && (
                            <motion.div
                              {...stagger(3)}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              {watchOut && (
                                <GlassCard
                                  className="p-5"
                                  style={{
                                    borderColor: "rgba(251,113,133,0.3)",
                                    boxShadow:
                                      "0 0 32px -16px rgba(251,113,133,0.3)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <div
                                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                      style={{
                                        background: "rgba(251,113,133,0.15)",
                                      }}
                                    >
                                      <AlertTriangle
                                        className="h-3.5 w-3.5"
                                        style={{ color: "#FB7185" }}
                                      />
                                    </div>
                                    <span
                                      className="text-[10px] font-bold uppercase tracking-widest"
                                      style={{ color: "#FB7185" }}
                                    >
                                      Watch Out
                                    </span>
                                    <span
                                      className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                                      style={{
                                        background: "rgba(251,113,133,0.1)",
                                        color: "#FB7185",
                                        border:
                                          "1px solid rgba(251,113,133,0.2)",
                                      }}
                                    >
                                      {watchOut.severity}
                                    </span>
                                  </div>
                                  <p
                                    className="text-sm font-semibold mb-1.5"
                                    style={{ color: "var(--tx)" }}
                                  >
                                    {watchOut.title}
                                  </p>
                                  <p
                                    className="text-xs leading-relaxed mb-3"
                                    style={{ color: "var(--tm)" }}
                                  >
                                    {watchOut.description}
                                  </p>
                                  {watchOut.comparedTo && (
                                    <p
                                      className="text-[11px] mb-3"
                                      style={{ color: "#FB7185" }}
                                    >
                                      vs {watchOut.comparedTo}
                                    </p>
                                  )}
                                  <button
                                    onClick={() =>
                                      setActiveTab(
                                        watchOut.category
                                          ? "Budgets"
                                          : "Expenses",
                                      )
                                    }
                                    className="w-full py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                                    style={{
                                      background: "rgba(251,113,133,0.1)",
                                      color: "#FB7185",
                                      border: "1px solid rgba(251,113,133,0.2)",
                                    }}
                                  >
                                    View {watchOut.category || "Expenses"} →
                                  </button>
                                </GlassCard>
                              )}

                              {win ? (
                                <GlassCard
                                  className="p-5"
                                  style={{
                                    borderColor: "rgba(52,211,153,0.3)",
                                    boxShadow:
                                      "0 0 32px -16px rgba(52,211,153,0.25)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <div
                                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                      style={{
                                        background: "rgba(52,211,153,0.15)",
                                      }}
                                    >
                                      <CheckCircle2
                                        className="h-3.5 w-3.5"
                                        style={{ color: "#34D399" }}
                                      />
                                    </div>
                                    <span
                                      className="text-[10px] font-bold uppercase tracking-widest"
                                      style={{ color: "#34D399" }}
                                    >
                                      Win
                                    </span>
                                  </div>
                                  <p
                                    className="text-sm font-semibold mb-1.5"
                                    style={{ color: "var(--tx)" }}
                                  >
                                    {win.title}
                                  </p>
                                  <p
                                    className="text-xs leading-relaxed mb-3"
                                    style={{ color: "var(--tm)" }}
                                  >
                                    {win.description}
                                  </p>
                                  {win.comparedTo && (
                                    <p
                                      className="text-[11px] mb-3"
                                      style={{ color: "#34D399" }}
                                    >
                                      vs {win.comparedTo}
                                    </p>
                                  )}
                                  <button
                                    onClick={() => setActiveTab("Dashboard")}
                                    className="w-full py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                                    style={{
                                      background: "rgba(52,211,153,0.1)",
                                      color: "#34D399",
                                      border: "1px solid rgba(52,211,153,0.2)",
                                    }}
                                  >
                                    Keep it up →
                                  </button>
                                </GlassCard>
                              ) : (
                                cachedInsights?.personality && (
                                  <GlassCard
                                    className="p-5"
                                    style={{
                                      borderColor: "rgba(129,140,248,0.25)",
                                      boxShadow:
                                        "0 0 32px -16px rgba(129,140,248,0.2)",
                                    }}
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                        style={{
                                          background: "rgba(129,140,248,0.15)",
                                        }}
                                      >
                                        <Sparkles
                                          className="h-3.5 w-3.5"
                                          style={{ color: "#818CF8" }}
                                        />
                                      </div>
                                      <span
                                        className="text-[10px] font-bold uppercase tracking-widest"
                                        style={{ color: "#818CF8" }}
                                      >
                                        Your Style
                                      </span>
                                    </div>
                                    <p
                                      className="text-sm font-semibold mb-1.5"
                                      style={{ color: "var(--tx)" }}
                                    >
                                      {cachedInsights.personality.archetype}
                                    </p>
                                    <p
                                      className="text-xs leading-relaxed"
                                      style={{ color: "var(--tm)" }}
                                    >
                                      {cachedInsights.personality.summary}
                                    </p>
                                  </GlassCard>
                                )
                              )}
                            </motion.div>
                          )}

                          {/* ─ Weekly Pattern bar chart (from active window) ─ */}
                          {weeklyData.some((d) => d.amount > 0) && (
                            <motion.div {...stagger(4)}>
                              <GlassCard className="p-5">
                                <div className="flex items-center justify-between mb-1">
                                  <SectionTitle icon={Zap}>
                                    Weekly Pattern
                                  </SectionTitle>
                                  {peakDay?.amount > 0 && (
                                    <span
                                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full mb-4"
                                      style={{
                                        background: "rgba(251,191,36,0.12)",
                                        color: "#FBBF24",
                                        border:
                                          "1px solid rgba(251,191,36,0.2)",
                                      }}
                                    >
                                      {peakDay.day} is peak
                                    </span>
                                  )}
                                </div>
                                <ResponsiveContainer width="100%" height={150}>
                                  <BarChart
                                    data={weeklyData}
                                    barCategoryGap="32%"
                                  >
                                    <XAxis
                                      dataKey="day"
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{ fontSize: 11, fill: "var(--tf)" }}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                      cursor={{ fill: "var(--c4)" }}
                                      contentStyle={{
                                        background: "var(--sheet-bg)",
                                        border: "1px solid var(--bd)",
                                        borderRadius: 10,
                                        fontSize: 12,
                                        color: "var(--tx)",
                                        padding: "6px 10px",
                                      }}
                                      formatter={(v) => [
                                        fmt(
                                          v,
                                          selectedCurrency.code,
                                          selectedCurrency.locale,
                                        ),
                                        "Spent",
                                      ]}
                                      labelStyle={{
                                        color: "var(--tm)",
                                        marginBottom: 2,
                                      }}
                                    />
                                    <Bar dataKey="amount" radius={[5, 5, 0, 0]}>
                                      {weeklyData.map((entry) => (
                                        <Cell
                                          key={entry.day}
                                          fill={
                                            entry.day === peakDay?.day
                                              ? "#818CF8"
                                              : "var(--c15)"
                                          }
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </GlassCard>
                            </motion.div>
                          )}

                          {/* ─ Category Breakdown (from active window) ─ */}
                          {catEntries.length > 0 && (
                            <motion.div {...stagger(5)}>
                              <GlassCard className="p-5">
                                <SectionTitle icon={TrendingUp}>
                                  Category Breakdown
                                </SectionTitle>
                                <div className="space-y-3.5">
                                  {catEntries.map(({ cat, spent, budget }) => {
                                    const color = colorFor(cat);
                                    const isOver = budget > 0 && spent > budget;
                                    const barPct = (spent / maxCatSpend) * 100;
                                    return (
                                      <div
                                        key={cat}
                                        className="flex items-center gap-3"
                                      >
                                        <div
                                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold"
                                          style={{
                                            background: `${color}1a`,
                                            color,
                                          }}
                                        >
                                          {cat[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <span
                                              className="text-xs font-medium truncate"
                                              style={{ color: "var(--tx)" }}
                                            >
                                              {cat}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                              <span
                                                className="text-xs font-semibold tabular-nums"
                                                style={{
                                                  color: isOver
                                                    ? "#FB7185"
                                                    : "#34D399",
                                                }}
                                              >
                                                {fmt(
                                                  spent,
                                                  selectedCurrency.code,
                                                  selectedCurrency.locale,
                                                )}
                                              </span>
                                              {budget > 0 && (
                                                <span
                                                  className="text-[10px]"
                                                  style={{ color: "var(--tf)" }}
                                                >
                                                  /{" "}
                                                  {fmt(
                                                    budget,
                                                    selectedCurrency.code,
                                                    selectedCurrency.locale,
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div
                                            className="h-1.5 rounded-full overflow-hidden"
                                            style={{ background: "var(--c8)" }}
                                          >
                                            <motion.div
                                              className="h-full rounded-full"
                                              initial={{ width: 0 }}
                                              animate={{ width: `${barPct}%` }}
                                              transition={{
                                                duration: 0.6,
                                                ease: "easeOut",
                                              }}
                                              style={{
                                                background: isOver
                                                  ? "#FB7185"
                                                  : color,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </GlassCard>
                            </motion.div>
                          )}

                          {/* ─ Personality Card (from cached AI) ─ */}
                          {cachedInsights?.personality && (
                            <motion.div {...stagger(6)}>
                              <GlassCard
                                className="p-5"
                                style={{
                                  background:
                                    "linear-gradient(135deg, rgba(167,139,250,0.07) 0%, rgba(129,140,248,0.03) 100%)",
                                  borderColor: "rgba(129,140,248,0.2)",
                                }}
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div
                                    className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(129,140,248,0.2))",
                                      border: "1px solid rgba(129,140,248,0.3)",
                                    }}
                                  >
                                    <Sparkles
                                      className="h-4 w-4"
                                      style={{ color: "#A78BFA" }}
                                    />
                                  </div>
                                  <div>
                                    <p
                                      className="text-[10px] font-bold uppercase tracking-widest"
                                      style={{ color: "#A78BFA" }}
                                    >
                                      Spender Personality
                                    </p>
                                    <p
                                      className="text-sm font-bold mt-0.5"
                                      style={{ color: "var(--tx)" }}
                                    >
                                      {cachedInsights.personality.archetype}
                                    </p>
                                  </div>
                                </div>
                                <p
                                  className="text-xs leading-relaxed mb-3"
                                  style={{ color: "var(--tm)" }}
                                >
                                  {cachedInsights.personality.summary}
                                </p>
                                {cachedInsights.personality.traits?.length >
                                  0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {cachedInsights.personality.traits.map(
                                      (t, i) => (
                                        <span
                                          key={i}
                                          className="text-[11px] px-2.5 py-1 rounded-full"
                                          style={{
                                            background: "rgba(129,140,248,0.1)",
                                            color: "#818CF8",
                                            border:
                                              "1px solid rgba(129,140,248,0.2)",
                                          }}
                                        >
                                          {t.label}: <strong>{t.value}</strong>
                                        </span>
                                      ),
                                    )}
                                  </div>
                                )}
                              </GlassCard>
                            </motion.div>
                          )}

                          {/* ─ All anomalies 3+ (from cached AI) ─ */}
                          {cachedInsights?.anomalies?.length > 2 && (
                            <motion.div {...stagger(7)}>
                              <GlassCard className="p-5">
                                <SectionTitle icon={AlertCircle}>
                                  All Observations
                                </SectionTitle>
                                <div className="space-y-0">
                                  {cachedInsights.anomalies.map((a, i) => {
                                    const sevColor =
                                      a.severity === "high"
                                        ? "#FB7185"
                                        : a.severity === "medium"
                                          ? "#FBBF24"
                                          : "#34D399";
                                    return (
                                      <div
                                        key={a.id || i}
                                        className="flex items-start gap-3 py-3 border-b last:border-0"
                                        style={{
                                          borderColor: "var(--bd-soft)",
                                        }}
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                                          style={{ background: sevColor }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className="text-sm font-medium"
                                            style={{ color: "var(--tx)" }}
                                          >
                                            {a.title}
                                          </p>
                                          <p
                                            className="text-xs mt-0.5"
                                            style={{ color: "var(--tm)" }}
                                          >
                                            {a.description}
                                          </p>
                                        </div>
                                        <span
                                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize"
                                          style={{
                                            background: `${sevColor}15`,
                                            color: sevColor,
                                            border: `1px solid ${sevColor}30`,
                                          }}
                                        >
                                          {a.severity}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </GlassCard>
                            </motion.div>
                          )}

                          {/* Footer */}
                          <motion.div {...stagger(8)}>
                            <p
                              className="text-center text-[11px] pb-2"
                              style={{ color: "var(--tf)" }}
                            >
                              Powered by Claude AI · {expenses.length}{" "}
                              transactions in {periodLabel}
                            </p>
                          </motion.div>
                        </>
                      )}
                  </div>
                );
              })()}

            {/* ── SETTINGS ── */}
            {activeTab === "Settings" &&
              (() => {
                const settingsSections = [
                  { id: "profile", label: "Profile", icon: User },
                  { id: "income", label: "Income Sources", icon: Wallet2 },
                  { id: "categories", label: "Categories", icon: Target },
                  {
                    id: "preferences",
                    label: "Preferences",
                    icon: SlidersHorizontal,
                  },
                  { id: "notifications", label: "Notifications", icon: Bell },
                  { id: "offline", label: "Works offline", icon: Cloud },
                  { id: "data", label: "Your data", icon: Download },
                  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
                  ...(import.meta.env.DEV
                    ? [{ id: "usage", label: "Usage (dev)", icon: Zap }]
                    : []),
                ];
                return (
                  <div className="flex flex-col md:flex-row gap-0 md:gap-6 w-full max-w-4xl">
                    {/* Mobile: horizontal scroll tab bar */}
                    <div
                      className="flex md:hidden overflow-x-auto pb-2 mb-4 gap-1"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {settingsSections.map(({ id, label, icon: Icon }) => {
                        const isActive = activeSettingsSection === id;
                        const isDanger = id === "danger";
                        return (
                          <button
                            key={id}
                            onClick={() => setActiveSettingsSection(id)}
                            className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0"
                            style={{
                              background: isActive
                                ? isDanger
                                  ? "rgba(239,68,68,0.15)"
                                  : "rgba(99,102,241,0.2)"
                                : "transparent",
                              color: isActive
                                ? isDanger
                                  ? "#F87171"
                                  : "#818CF8"
                                : isDanger
                                  ? "rgba(239,68,68,0.55)"
                                  : "var(--tm)",
                            }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Desktop: vertical sidebar */}
                    <div className="hidden md:flex flex-col gap-1 w-56 shrink-0">
                      {settingsSections.map(({ id, label, icon: Icon }) => {
                        const isActive = activeSettingsSection === id;
                        const isDanger = id === "danger";
                        return (
                          <button
                            key={id}
                            onClick={() => setActiveSettingsSection(id)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full"
                            style={{
                              background: isActive
                                ? isDanger
                                  ? "rgba(239,68,68,0.15)"
                                  : "rgba(99,102,241,0.2)"
                                : "transparent",
                              color: isActive
                                ? isDanger
                                  ? "#F87171"
                                  : "#818CF8"
                                : isDanger
                                  ? "rgba(239,68,68,0.55)"
                                  : "var(--tm)",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive)
                                e.currentTarget.style.background = isDanger
                                  ? "rgba(239,68,68,0.08)"
                                  : "rgba(255,255,255,0.05)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive)
                                e.currentTarget.style.background =
                                  "transparent";
                            }}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Content pane */}
                    <div className="flex-1 min-w-0">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeSettingsSection}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18 }}
                        >
                          {/* ── PROFILE ── */}
                          {activeSettingsSection === "profile" && (
                            <GlassCard className="p-6">
                              <h2
                                className="text-xl font-semibold mb-1"
                                style={{ color: "var(--tx)" }}
                              >
                                Profile
                              </h2>
                              <p
                                className="text-sm mb-6"
                                style={{ color: "var(--tf)" }}
                              >
                                Your account information.
                              </p>
                              <div
                                className="flex items-center gap-4 mb-6 p-4 rounded-2xl"
                                style={{
                                  background: "var(--c4)",
                                  border: "1px solid var(--bd)",
                                }}
                              >
                                <div
                                  className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-xl font-bold"
                                  style={{
                                    background:
                                      "linear-gradient(135deg,#6366F1,#06B6D4)",
                                    color: "#fff",
                                  }}
                                >
                                  {user?.photoURL ? (
                                    <img
                                      src={user.photoURL}
                                      alt=""
                                      className="w-14 h-14 object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    (user?.displayName ||
                                      user?.email ||
                                      "A")[0].toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className="font-semibold truncate"
                                    style={{ color: "var(--tx)" }}
                                  >
                                    {user?.displayName || "No display name"}
                                  </p>
                                  <p
                                    className="text-sm truncate mt-0.5"
                                    style={{ color: "var(--tf)" }}
                                  >
                                    {user?.email}
                                  </p>
                                  <span
                                    className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                    style={{
                                      background: "rgba(99,102,241,0.15)",
                                      color: "#818CF8",
                                    }}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />{" "}
                                    Verified
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {[
                                  {
                                    label: "DISPLAY NAME",
                                    value: user?.displayName || "—",
                                  },
                                  { label: "EMAIL", value: user?.email || "—" },
                                  {
                                    label: "SIGN-IN METHOD",
                                    value:
                                      user?.providerData?.[0]?.providerId ===
                                      "google.com"
                                        ? "Google"
                                        : "Email / Password",
                                  },
                                ].map(({ label, value }) => (
                                  <div
                                    key={label}
                                    className="rounded-xl px-4 py-3"
                                    style={{
                                      background: "var(--c4)",
                                      border: "1px solid var(--bd)",
                                    }}
                                  >
                                    <p
                                      className="text-[11px] font-medium tracking-wide mb-0.5"
                                      style={{ color: "var(--tf)" }}
                                    >
                                      {label}
                                    </p>
                                    <p
                                      className="text-sm truncate"
                                      style={{ color: "var(--tx)" }}
                                    >
                                      {value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </GlassCard>
                          )}

                          {/* ── INCOME SOURCES ── */}
                          {activeSettingsSection === "income" && (
                            <GlassCard className="p-6">
                              <h2
                                className="text-xl font-semibold mb-1"
                                style={{ color: "var(--tx)" }}
                              >
                                Income Sources
                              </h2>
                              <p
                                className="text-sm mb-6"
                                style={{ color: "var(--tf)" }}
                              >
                                Manage where your money comes from each period.
                              </p>
                              <div className="space-y-2 mb-4">
                                <div className="flex gap-2">
                                  <ThemedInput
                                    placeholder="Source name (e.g. Salary)"
                                    value={source.name}
                                    onChange={(e) => {
                                      setSource((p) => ({
                                        ...p,
                                        name: e.target.value,
                                      }));
                                      if (sourceErrors.name)
                                        setSourceErrors((p) => ({
                                          ...p,
                                          name: "",
                                        }));
                                    }}
                                    error={!!sourceErrors.name}
                                  />
                                </div>
                                {sourceErrors.name && (
                                  <p className="text-xs text-red-400">
                                    {sourceErrors.name}
                                  </p>
                                )}
                                <div className="flex gap-2">
                                  <ThemedInput
                                    placeholder={`Amount (${selectedCurrency.code})`}
                                    inputMode="numeric"
                                    value={source.amount}
                                    onChange={(e) => {
                                      setSource((p) => ({
                                        ...p,
                                        amount: e.target.value.replace(
                                          /[^0-9.]/g,
                                          "",
                                        ),
                                      }));
                                      if (sourceErrors.amount)
                                        setSourceErrors((p) => ({
                                          ...p,
                                          amount: "",
                                        }));
                                    }}
                                    error={!!sourceErrors.amount}
                                  />
                                  <GradBtn
                                    onClick={addIncomeSource}
                                    variant="secondary"
                                  >
                                    Add
                                  </GradBtn>
                                </div>
                                {sourceErrors.amount && (
                                  <p className="text-xs text-red-400">
                                    {sourceErrors.amount}
                                  </p>
                                )}
                              </div>
                              {incomeSources.length === 0 ? (
                                <p
                                  className="text-xs text-center py-6"
                                  style={{ color: "var(--tf)" }}
                                >
                                  No income sources yet. Add one above.
                                </p>
                              ) : (
                                <ul className="space-y-2">
                                  {incomeSources.map((src) => (
                                    <li
                                      key={src.id}
                                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm"
                                      style={{
                                        background: "var(--c4)",
                                        border: "1px solid var(--c6)",
                                      }}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                          style={{
                                            background: "rgba(52,211,153,0.15)",
                                          }}
                                        >
                                          <Wallet2
                                            className="h-3 w-3"
                                            style={{ color: "#34D399" }}
                                          />
                                        </div>
                                        <span
                                          className="font-medium truncate"
                                          style={{ color: "var(--tx)" }}
                                        >
                                          {src.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0">
                                        <span
                                          className="font-semibold tabular-nums"
                                          style={{ color: "#34D399" }}
                                        >
                                          {fmt(
                                            src.amount,
                                            selectedCurrency.code,
                                            selectedCurrency.locale,
                                          )}
                                        </span>
                                        <button
                                          onClick={() =>
                                            removeIncomeSource(src.id)
                                          }
                                          className="transition-colors hover:text-[#FB7185]"
                                          style={{ color: "var(--tf)" }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </GlassCard>
                          )}

                          {/* ── CATEGORIES ── */}
                          {activeSettingsSection === "categories" && (
                            <GlassCard className="p-6">
                              <h2
                                className="text-xl font-semibold mb-1"
                                style={{ color: "var(--tx)" }}
                              >
                                Categories
                              </h2>
                              <p
                                className="text-sm mb-6"
                                style={{ color: "var(--tf)" }}
                              >
                                Customise how you tag your spending.
                              </p>
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
                                <p className="mb-3 text-xs text-red-400">
                                  {catError}
                                </p>
                              ) : (
                                <p
                                  className="mb-4 text-xs"
                                  style={{ color: "var(--tf)" }}
                                >
                                  Up to {MAX_CATEGORIES} categories. "Other"
                                  cannot be deleted.
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
                          )}

                          {/* ── PREFERENCES ── */}
                          {activeSettingsSection === "preferences" && (
                            <GlassCard className="p-6">
                              <h2
                                className="text-xl font-semibold mb-1"
                                style={{ color: "var(--tx)" }}
                              >
                                Preferences
                              </h2>
                              <p
                                className="text-sm mb-6"
                                style={{ color: "var(--tf)" }}
                              >
                                Personalise how Ancy looks and behaves.
                              </p>
                              <div
                                className="divide-y"
                                style={{ borderColor: "var(--bd)" }}
                              >
                                <div className="flex items-center justify-between py-4">
                                  <div>
                                    <p
                                      className="text-sm font-medium"
                                      style={{ color: "var(--tx)" }}
                                    >
                                      Currency
                                    </p>
                                    <p
                                      className="text-xs mt-0.5"
                                      style={{ color: "var(--tf)" }}
                                    >
                                      Used for all amounts and formatting
                                    </p>
                                  </div>
                                  <CurrencySelector />
                                </div>
                                <div className="flex items-center justify-between py-4">
                                  <div>
                                    <p
                                      className="text-sm font-medium"
                                      style={{ color: "var(--tx)" }}
                                    >
                                      Appearance
                                    </p>
                                    <p
                                      className="text-xs mt-0.5"
                                      style={{ color: "var(--tf)" }}
                                    >
                                      {dark
                                        ? "Dark mode active"
                                        : "Light mode active"}
                                    </p>
                                  </div>
                                  <button
                                    onClick={toggleTheme}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                                    style={{
                                      background: "var(--c4)",
                                      border: "1px solid var(--bd)",
                                      color: "var(--tm)",
                                    }}
                                  >
                                    {dark ? (
                                      <Sun className="h-4 w-4 text-yellow-400" />
                                    ) : (
                                      <Moon className="h-4 w-4" />
                                    )}
                                    {dark ? "Light mode" : "Dark mode"}
                                  </button>
                                </div>
                                <div className="flex items-center justify-between py-4">
                                  <div>
                                    <p
                                      className="text-sm font-medium"
                                      style={{ color: "var(--tx)" }}
                                    >
                                      Default View
                                    </p>
                                    <p
                                      className="text-xs mt-0.5"
                                      style={{ color: "var(--tf)" }}
                                    >
                                      Tab shown when you open the app
                                    </p>
                                  </div>
                                  <select
                                    value={defaultView}
                                    onChange={(e) => {
                                      setDefaultView(e.target.value);
                                      localStorage.setItem(
                                        "ancy-default-view",
                                        e.target.value,
                                      );
                                      addToast("Default view saved", "success");
                                    }}
                                    className="px-3 py-2 rounded-xl text-sm border outline-none"
                                    style={{
                                      background: "var(--c4)",
                                      border: "1px solid var(--bd)",
                                      color: "var(--tx)",
                                      colorScheme: dark ? "dark" : "light",
                                    }}
                                  >
                                    {[
                                      "Dashboard",
                                      "Expenses",
                                      "Savings",
                                      "AI Insights",
                                    ].map((v) => (
                                      <option key={v} value={v}>
                                        {v}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </GlassCard>
                          )}

                          {/* ── NOTIFICATIONS ── */}
                          {activeSettingsSection === "notifications" && (
                            <GlassCard className="p-6">
                              <h2
                                className="text-xl font-semibold mb-1"
                                style={{ color: "var(--tx)" }}
                              >
                                Notifications
                              </h2>
                              <p
                                className="text-sm mb-6"
                                style={{ color: "var(--tf)" }}
                              >
                                Stay informed about your spending.
                              </p>
                              <div className="flex flex-col items-center justify-center py-14 text-center">
                                <div
                                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                                  style={{ background: "rgba(99,102,241,0.1)" }}
                                >
                                  <Bell
                                    className="h-6 w-6"
                                    style={{ color: "var(--tf)" }}
                                  />
                                </div>
                                <p
                                  className="font-semibold mb-2"
                                  style={{ color: "var(--tx)" }}
                                >
                                  Coming Soon
                                </p>
                                <p
                                  className="text-sm max-w-xs"
                                  style={{ color: "var(--tf)" }}
                                >
                                  Get monthly summaries and budget alerts
                                  delivered to your device.
                                </p>
                              </div>
                            </GlassCard>
                          )}

                          {/* ── WORKS OFFLINE ── */}
                          {activeSettingsSection === "offline" && (
                            <GlassCard className="p-6">
                              <OfflineCapabilitiesCard />
                            </GlassCard>
                          )}

                          {/* ── YOUR DATA ── */}
                          {activeSettingsSection === "data" && (
                            <GlassCard className="p-6">
                              <div className="flex items-center gap-2 mb-1">
                                <Download
                                  className="h-4 w-4"
                                  style={{ color: "#818CF8" }}
                                />
                                <h2
                                  className="text-xl font-semibold"
                                  style={{ color: "var(--tx)" }}
                                >
                                  Your data
                                </h2>
                              </div>
                              <p
                                className="text-sm mb-6"
                                style={{ color: "var(--tf)" }}
                              >
                                Download everything you've logged in Ancy. Yours to keep.
                              </p>

                              {totalExpenseCount === 0 ? (
                                <p
                                  className="text-sm italic"
                                  style={{ color: "var(--tf)" }}
                                >
                                  Add some expenses first — there's nothing to export yet.
                                </p>
                              ) : (
                                <div className="flex flex-col gap-3">
                                  <button
                                    onClick={handleExportCsv}
                                    className="flex items-center justify-between rounded-2xl px-4 py-3.5 transition-colors"
                                    style={{
                                      background: "var(--c4)",
                                      border: "1px solid var(--bd)",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c5)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c4)")}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: "rgba(52,211,153,0.12)" }}
                                      >
                                        <FileSpreadsheet
                                          className="h-4.5 w-4.5"
                                          style={{ color: "#34D399" }}
                                        />
                                      </div>
                                      <div className="text-left">
                                        <p
                                          className="text-sm font-medium"
                                          style={{ color: "var(--tx)" }}
                                        >
                                          Export as CSV
                                        </p>
                                        <p
                                          className="text-xs"
                                          style={{ color: "var(--tf)" }}
                                        >
                                          Opens in Excel, Sheets, Numbers. {totalExpenseCount} expense{totalExpenseCount === 1 ? "" : "s"}.
                                        </p>
                                      </div>
                                    </div>
                                    <Download
                                      className="h-4 w-4 shrink-0"
                                      style={{ color: "var(--tf)" }}
                                    />
                                  </button>

                                  <button
                                    onClick={handleExportJson}
                                    className="flex items-center justify-between rounded-2xl px-4 py-3.5 transition-colors"
                                    style={{
                                      background: "var(--c4)",
                                      border: "1px solid var(--bd)",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c5)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c4)")}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: "rgba(129,140,248,0.12)" }}
                                      >
                                        <FileJson
                                          className="h-4.5 w-4.5"
                                          style={{ color: "#818CF8" }}
                                        />
                                      </div>
                                      <div className="text-left">
                                        <p
                                          className="text-sm font-medium"
                                          style={{ color: "var(--tx)" }}
                                        >
                                          Export as JSON
                                        </p>
                                        <p
                                          className="text-xs"
                                          style={{ color: "var(--tf)" }}
                                        >
                                          Full backup including budgets, income, and savings goals.
                                        </p>
                                      </div>
                                    </div>
                                    <Download
                                      className="h-4 w-4 shrink-0"
                                      style={{ color: "var(--tf)" }}
                                    />
                                  </button>
                                </div>
                              )}
                            </GlassCard>
                          )}

                          {/* ── DANGER ZONE ── */}
                          {activeSettingsSection === "danger" && (
                            <GlassCard className="p-6">
                              <h2 className="text-xl font-semibold mb-1 text-red-400">
                                Danger Zone
                              </h2>
                              <p
                                className="text-sm mb-6"
                                style={{ color: "var(--tf)" }}
                              >
                                Irreversible actions — proceed with caution.
                              </p>
                              <div
                                className="rounded-2xl p-5 border-2 border-red-500/40"
                                style={{ background: "rgba(239,68,68,0.04)" }}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-red-400 text-sm mb-1">
                                      Reset All Data
                                    </p>
                                    <p
                                      className="text-xs"
                                      style={{ color: "var(--tf)" }}
                                    >
                                      Permanently delete all expenses, income
                                      sources, budgets, savings goals, and
                                      categories. This cannot be undone.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setResetConfirmText("");
                                      setResetDialogOpen(true);
                                    }}
                                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Reset
                                  </button>
                                </div>
                              </div>
                            </GlassCard>
                          )}

                          {/* ── USAGE (DEV ONLY) ── */}
                          {activeSettingsSection === "usage" && import.meta.env.DEV && (
                            <GlassCard className="p-6">
                              <h2
                                className="text-xl font-semibold mb-1"
                                style={{ color: "var(--tx)" }}
                              >
                                Usage
                              </h2>
                              <p
                                className="text-sm mb-6"
                                style={{ color: "var(--tf)" }}
                              >
                                Dev-only — not visible in production.
                              </p>
                              <div className="flex flex-col gap-4">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--tf)" }}>
                                    Today's calls
                                  </p>
                                  <div className="flex flex-col gap-2">
                                    {[
                                      { label: "AI Insights", key: "insights" },
                                      { label: "Quick Add", key: "parse" },
                                      { label: "Statement Import", key: "statement" },
                                    ].map(({ label, key }) => (
                                      <div key={key} className="flex items-center justify-between text-sm">
                                        <span style={{ color: "var(--tm)" }}>{label}</span>
                                        <span style={{ color: "var(--tx)" }}>
                                          {usageQuota[key]} / {quotaLimits[key]}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--tf)" }}>
                                    Today's cost
                                  </p>
                                  <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                                    ${costToday.toFixed(5)} USD
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--tf)" }}>
                                    This month
                                  </p>
                                  <div className="flex flex-col gap-2">
                                    {[
                                      { label: "AI Insights", key: "insights" },
                                      { label: "Quick Add", key: "parse" },
                                      { label: "Statement Import", key: "statement" },
                                    ].map(({ label, key }) => (
                                      <div key={key} className="flex items-center justify-between text-sm">
                                        <span style={{ color: "var(--tm)" }}>{label}</span>
                                        <span style={{ color: "var(--tx)" }}>{monthlyUsage[key]}</span>
                                      </div>
                                    ))}
                                    <div className="flex items-center justify-between text-sm border-t pt-2 mt-1" style={{ borderColor: "var(--bd)" }}>
                                      <span style={{ color: "var(--tm)" }}>Total cost</span>
                                      <span className="font-semibold" style={{ color: "var(--tx)" }}>
                                        ${costMonth.toFixed(5)} USD
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </GlassCard>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>

      {/* Reset All Data confirmation dialog */}
      {resetDialogOpen &&
        (() => {
          const expenseCount = expenses.length;
          const incomeCount = incomeSources.length;
          const goalCount = (state.savingsGoals || []).length;
          const periodCount = Object.keys(localStorage).filter((k) =>
            k.startsWith(`expense-tracker:${user?.uid}:`),
          ).length;
          const canConfirm = resetConfirmText === "DELETE";
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md rounded-2xl p-6 shadow-2xl border border-red-500/30"
                style={{ background: "var(--c2)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-red-400">
                      Reset All Data
                    </h2>
                    <p className="text-xs" style={{ color: "var(--tf)" }}>
                      This action is permanent and irreversible.
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-xl p-3 mb-4 text-xs space-y-1 border border-red-500/20"
                  style={{ background: "rgba(239,68,68,0.06)" }}
                >
                  <p style={{ color: "var(--tm)" }}>
                    The following will be permanently deleted:
                  </p>
                  <ul
                    className="mt-1.5 space-y-0.5 pl-2"
                    style={{ color: "var(--tf)" }}
                  >
                    <li>
                      • {expenseCount} expense{expenseCount !== 1 ? "s" : ""}
                    </li>
                    <li>
                      • {incomeCount} income source
                      {incomeCount !== 1 ? "s" : ""}
                    </li>
                    <li>
                      • {goalCount} savings goal{goalCount !== 1 ? "s" : ""}
                    </li>
                    <li>
                      • {periodCount} period{periodCount !== 1 ? "s" : ""} of
                      data from cloud + local storage
                    </li>
                  </ul>
                </div>

                <p className="text-xs mb-2" style={{ color: "var(--tm)" }}>
                  Type{" "}
                  <span className="font-mono font-bold text-red-400">
                    DELETE
                  </span>{" "}
                  to confirm:
                </p>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none mb-4 font-mono"
                  style={{
                    background: "var(--c4)",
                    border:
                      resetConfirmText && !canConfirm
                        ? "1px solid rgba(239,68,68,0.6)"
                        : "1px solid var(--bd)",
                    color: "var(--tx)",
                  }}
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setResetDialogOpen(false);
                      setResetConfirmText("");
                    }}
                    disabled={resetLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:opacity-80"
                    style={{
                      border: "1px solid var(--bd)",
                      color: "var(--tm)",
                      background: "var(--c4)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={resetAllData}
                    disabled={!canConfirm || resetLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background:
                        canConfirm && !resetLoading
                          ? "linear-gradient(135deg,#EF4444,#DC2626)"
                          : "rgba(239,68,68,0.2)",
                      color:
                        canConfirm && !resetLoading
                          ? "#fff"
                          : "rgba(239,68,68,0.5)",
                      cursor:
                        canConfirm && !resetLoading ? "pointer" : "not-allowed",
                    }}
                  >
                    {resetLoading ? "Deleting…" : "Delete Everything"}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
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
      className="p-4 rounded-2xl hover:shadow-md transition-shadow"
      style={{ background: "var(--c4)", border: "1px solid var(--c6)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold truncate mb-1.5"
            style={{ color: "var(--tx)" }}
          >
            {goal.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${priorityStyle}`}
            >
              {goal.priority
                ? goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)
                : "Medium"}
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
          className="transition-colors ml-2 shrink-0 hover:text-[#FB7185]"
          style={{ color: "var(--tf)" }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-3">
        <div
          className="flex justify-between text-xs mb-1"
          style={{ color: "var(--tm)" }}
        >
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
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ background: "var(--bd)" }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.6 }}
            className="h-2 rounded-full"
            style={{
              background: isCompleted
                ? "#34D399"
                : "linear-gradient(90deg, #818CF8, #22D3EE)",
            }}
          />
        </div>
        <p className="text-[10px] mt-1" style={{ color: "var(--tm)" }}>
          {progress.toFixed(1)}% complete
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAddMoney}
          disabled={isCompleted}
          className="flex-1 py-1.5 rounded-xl text-xs transition-colors disabled:opacity-40 hover:bg-indigo-500/10"
          style={{
            border: "1px solid rgba(129,140,248,0.30)",
            color: "#818CF8",
          }}
        >
          + Add
        </button>
        <button
          onClick={onWithdraw}
          className="flex-1 py-1.5 rounded-xl text-xs transition-colors hover:bg-white/5"
          style={{ border: "1px solid var(--c10)", color: "var(--tm)" }}
        >
          − Withdraw
        </button>
      </div>
    </motion.div>
  );
}

function TipsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-colors hover:bg-white/5"
          style={{
            background: "var(--c4)",
            border: "1px solid var(--bd)",
            color: "var(--tm)",
          }}
        >
          <HelpCircle className="h-4 w-4" />
          How to use
        </motion.button>
      </DialogTrigger>
      <DialogContent
        className="rounded-2xl"
        style={{
          background: "var(--modal-bg)",
          border: "1px solid var(--modal-bdr)",
          color: "var(--tx)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "#818CF8" }}>
            Quick Start Guide
          </DialogTitle>
          <DialogDescription asChild>
            <div
              className="space-y-3 text-sm mt-2"
              style={{ color: "var(--tm)" }}
            >
              <p>
                <strong style={{ color: "var(--tx)" }}>⚡ Quick Add:</strong>{" "}
                Type naturally like "500 on groceries, 200 on coffee" — Claude
                parses up to 5 expenses at once. Select which ones to add.
              </p>
              <p>
                <strong style={{ color: "var(--tx)" }}>✨ AI Insights:</strong>{" "}
                Click the purple "AI Insights" button for a personalized
                spending summary.
              </p>
              <p>
                <strong style={{ color: "var(--tx)" }}>🌍 Currency:</strong>{" "}
                Click the currency selector to switch currencies.
              </p>
              <p>
                <strong style={{ color: "var(--tx)" }}>📅 Period:</strong>{" "}
                Choose a month or "Custom Period" for any date range.
              </p>
              <p>
                <strong style={{ color: "var(--tx)" }}>🌙 Dark mode:</strong>{" "}
                Toggle the sun/moon icon in the header.
              </p>
              <p>
                <strong style={{ color: "var(--tx)" }}>🔴 Budgets:</strong> Bars
                turn orange at 80% and red when over limit.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
