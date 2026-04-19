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
import { getSpendingInsightsFn, parseExpenseFn } from "@/lib/firebase";

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
  LayoutDashboard,
  HelpCircle,
  Sun,
  Moon,
  Sparkles,
  Zap,
  Loader2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
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

function AIInsightsModal({ open, onClose, insights, loading, error }) {
  const { dark } = useTheme();
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
        <div className="mt-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
              <p
                className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}
              >
                Analyzing your spending...
              </p>
            </div>
          )}
          {error && (
            <div className="py-6 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {insights && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className={`p-4 rounded-2xl border mb-4 ${dark ? "bg-violet-500/10 border-violet-500/20" : "bg-violet-50 border-violet-100"}`}
              >
                <p
                  className={`text-sm leading-relaxed whitespace-pre-wrap ${dark ? "text-gray-200" : "text-gray-700"}`}
                >
                  {insights.insights}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Total Spent",
                    value: insights.summary?.totalExpenses?.toLocaleString(),
                  },
                  {
                    label: "Remaining",
                    value: insights.summary?.remaining?.toLocaleString(),
                  },
                  {
                    label: "Savings Rate",
                    value: `${insights.summary?.savingsRate}%`,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`p-3 rounded-xl text-center ${dark ? "bg-white/5 border border-white/5" : "bg-gray-50 border border-gray-100"}`}
                  >
                    <p
                      className={`text-xs mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {s.label}
                    </p>
                    <p
                      className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-800"}`}
                    >
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
              {insights.summary?.topCategory && (
                <p
                  className={`mt-3 text-xs text-center ${dark ? "text-gray-500" : "text-gray-400"}`}
                >
                  Top spending category:{" "}
                  <span className="font-medium text-violet-400">
                    {insights.summary.topCategory}
                  </span>
                </p>
              )}
            </motion.div>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl border text-sm transition-colors ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuickAddBar({ categories, selectedCurrency, onExpenseAdd, addToast }) {
  const { dark } = useTheme();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [selected, setSelected] = useState({});

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
    toAdd.forEach((exp) => onExpenseAdd(exp));
    addToast(
      `${toAdd.length} expense${toAdd.length > 1 ? "s" : ""} added!`,
      "success",
    );
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
      className={`p-4 rounded-2xl border ${
        dark
          ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border-violet-500/30"
          : "bg-gradient-to-r from-violet-500 to-cyan-500 border-transparent"
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

      <div className="flex gap-2">
        <input
          placeholder='e.g. "500 on groceries, 200 on coffee, 1200 for uber yesterday"'
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => setText(e.target.value)}
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

export default function ExpenseTracker() {
  const {
    selectedMonth,
    setSelectedMonth,
    customDateRange,
    setCustomDateRange,
  } = useDateSelection();
  const { selectedCurrency } = useCurrency();
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
  const [insightsData, setInsightsData] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  useEffect(() => {
    const handleAuthError = () =>
      addToast("Sign-in failed. Please try again.", "error");
    window.addEventListener("auth:error", handleAuthError);
    return () => window.removeEventListener("auth:error", handleAuthError);
  }, [addToast]);

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
  } = state;

  const [source, setSource] = useState({ name: "Salary", amount: "" });
  const [exp, setExp] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: categories[0] || "Groceries",
    description: "",
    amount: "",
  });
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
      setInsightsData(result.data);
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
      return;
    }
    setState((s) => ({
      ...s,
      expenses: [
        {
          id: crypto.randomUUID(),
          date: parsed.date,
          category: parsed.category,
          description: parsed.description || "",
          amount: amt,
        },
        ...(s.expenses || []),
      ],
    }));
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
    setState((s) => ({
      ...s,
      expenses: [
        { id: crypto.randomUUID(), ...exp, amount: amt },
        ...(s.expenses || []),
      ],
    }));
    setExp({
      date: new Date().toISOString().slice(0, 10),
      category: exp.category,
      description: "",
      amount: "",
    });
    addToast("Expense added!", "success");
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
        <AIInsightsModal
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          insights={insightsData}
          loading={insightsLoading}
          error={insightsError}
        />

        <div className="relative mx-auto max-w-7xl">
          {/* HEADER */}
          <motion.header
            {...stagger(0)}
            className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold leading-tight ${t.text}`}>
                  Expense Tracker
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
                    <QuickAddBar
                      categories={categories}
                      selectedCurrency={selectedCurrency}
                      onExpenseAdd={handleQuickAddExpense}
                      addToast={addToast}
                    />
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
                      <AnimatePresence>
                        {expenses.map((e) => (
                          <motion.div
                            key={e.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`flex items-start justify-between gap-3 px-3 py-3 rounded-xl border ${t.itemBg}`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ background: colorFor(e.category) }}
                                />
                                <span
                                  className={`text-sm font-medium ${t.text}`}
                                >
                                  {e.category}
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 ${t.textFaint}`}>
                                {new Date(e.date).toLocaleDateString()}
                              </p>
                              {e.description && (
                                <p className={`text-xs mt-0.5 ${t.textMuted}`}>
                                  {e.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-sm font-semibold ${t.text}`}
                              >
                                {fmt(
                                  e.amount,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}
                              </span>
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
                            <td
                              colSpan={5}
                              className={`py-8 text-center text-xs ${t.textFaint}`}
                            >
                              No expenses yet. Add your first one above.
                            </td>
                          </tr>
                        ) : (
                          <AnimatePresence>
                            {expenses.map((e) => (
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
                                      style={{
                                        background: colorFor(e.category),
                                      }}
                                    />
                                    <span className={t.text}>{e.category}</span>
                                  </span>
                                </td>
                                <td className={`py-3 ${t.textMuted}`}>
                                  {e.description}
                                </td>
                                <td
                                  className={`py-3 text-right font-semibold ${t.text}`}
                                >
                                  {fmt(
                                    e.amount,
                                    selectedCurrency.code,
                                    selectedCurrency.locale,
                                  )}
                                </td>
                                <td className="py-3 text-right pr-2">
                                  <button
                                    onClick={() => removeExpense(e.id)}
                                    className={`transition-colors opacity-0 group-hover:opacity-100 ${dark ? "text-gray-600 hover:text-red-400" : "text-gray-300 hover:text-red-400"}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
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
  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24),
  );
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
              {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${statusStyle}`}
            >
              {statusText}
            </span>
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
