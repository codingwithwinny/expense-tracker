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

import AuthButtons from "@/components/AuthButtons";
import AuthPage from "@/components/AuthPage";
import CurrencySelector from "@/components/CurrencySelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

/* ── color helper ── */
function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

/* ── animation presets ── */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" },
};
const stagger = (i) => ({
  ...fadeUp,
  transition: { ...fadeUp.transition, delay: i * 0.07 },
});

/* ─────────────────────────────────────────────
   Toast system
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   Confirm dialog
───────────────────────────────────────────── */
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
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-800">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
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

/* ─────────────────────────────────────────────
   Amount input dialog
───────────────────────────────────────────── */
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
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-800">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="mt-2 space-y-2">
          <Label htmlFor="amount-input" className="text-sm text-gray-600">
            Amount ({currency?.code})
          </Label>
          <input
            id="amount-input"
            autoFocus
            inputMode="numeric"
            placeholder="e.g., 5000"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^0-9.]/g, ""));
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-white/80 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm hover:opacity-90 transition-opacity shadow-md"
          >
            Confirm
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Inline field error ── */
function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

/* ── Gradient button ── */
function GradBtn({
  onClick,
  children,
  className = "",
  disabled = false,
  variant = "primary",
}) {
  const base =
    variant === "primary"
      ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md hover:shadow-lg hover:opacity-90"
      : "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:shadow-lg hover:opacity-90";
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

/* ── Glass card ── */
function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 ${className}`}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
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

  useEffect(() => {
    const handleAuthError = () =>
      addToast("Sign-in failed. Please try again.", "error");
    window.addEventListener("auth:error", handleAuthError);
    return () => window.removeEventListener("auth:error", handleAuthError);
  }, [addToast]);

  const monthOptions = useMemo(() => {
    const list = [{ key: "custom", label: "Custom Period", isCustom: true }];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
      list.push({ key, label });
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

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  /* ── dialog helpers ── */
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

  /* ── income ── */
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
      description: "This will be permanently removed from this period.",
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

  /* ── expenses ── */
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
      description: "This expense will be permanently deleted.",
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

  /* ── categories ── */
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

  /* ── goals ── */
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
        addToast(
          `Added ${fmt(amount, selectedCurrency.code, selectedCurrency.locale)}!`,
          "success",
        );
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
        addToast(
          `Withdrew ${fmt(amount, selectedCurrency.code, selectedCurrency.locale)}.`,
          "success",
        );
        closeAmountInput();
      },
    });
  }

  const anyOverBudget = categories.some((c) => {
    const spent = totals.byCat.find((x) => x.name === c)?.value || 0;
    const bud = Number(catBudgets[c]) || 0;
    return bud > 0 && spent > bud;
  });

  /* ────────────────────── UI ────────────────────── */
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4 md:p-6">
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

      <div className="mx-auto max-w-7xl">
        {/* ── HEADER ── */}
        <motion.header
          {...stagger(0)}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 leading-tight">
                Expense Tracker
              </h1>
              <p className="text-xs text-gray-400">
                Your smart way to manage your money.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period pill selector */}
            <div className="flex flex-col gap-1.5">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 px-4 rounded-full border border-gray-200/60 bg-white/70 backdrop-blur-sm text-sm min-w-[10rem] shadow-sm">
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
                    <p className="text-[10px] text-gray-400 mb-0.5">From</p>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) =>
                        setCustomDateRange((p) => ({
                          ...p,
                          start: e.target.value,
                        }))
                      }
                      className="h-8 px-2 rounded-xl border border-gray-200 bg-white/70 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 w-32"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">To</p>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) =>
                        setCustomDateRange((p) => ({
                          ...p,
                          end: e.target.value,
                        }))
                      }
                      className="h-8 px-2 rounded-xl border border-gray-200 bg-white/70 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 w-32"
                    />
                  </div>
                </div>
              )}
            </div>

            <CurrencySelector />

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={exportCSV}
              className="h-9 px-4 rounded-full border border-gray-200/60 bg-white/70 backdrop-blur-sm text-sm text-gray-600 flex items-center gap-1.5 shadow-sm hover:bg-white transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </motion.button>

            <div className="h-9">
              <AuthButtons />
            </div>
          </div>
        </motion.header>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* ══ LEFT COLUMN ══ */}
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
                  tint: "from-indigo-50 to-indigo-100/60",
                  icon_color: "text-indigo-500",
                },
                {
                  label: "Expenses",
                  value: fmt(
                    totals.totalExp,
                    selectedCurrency.code,
                    selectedCurrency.locale,
                  ),
                  icon: TrendingUp,
                  tint: "from-rose-50 to-rose-100/60",
                  icon_color: "text-rose-500",
                },
                {
                  label: "Remaining",
                  value: fmt(
                    totals.remaining,
                    selectedCurrency.code,
                    selectedCurrency.locale,
                  ),
                  icon: Wallet2,
                  tint: "from-cyan-50 to-cyan-100/60",
                  icon_color: "text-cyan-500",
                },
                {
                  label: "Budget Used",
                  value: `${totals.util}%`,
                  icon: Target,
                  tint: "from-amber-50 to-amber-100/60",
                  icon_color: "text-amber-500",
                },
              ].map((card, i) => (
                <motion.div key={card.label} {...stagger(i + 1)}>
                  <div
                    className={`bg-gradient-to-br ${card.tint} backdrop-blur-sm rounded-2xl border border-white/60 shadow-md p-4`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                        {card.label}
                      </p>
                      <card.icon className={`h-4 w-4 ${card.icon_color}`} />
                    </div>
                    <p className="text-xl font-bold text-gray-800">
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
                  <span className="text-xs text-gray-500">
                    Overall budget usage
                  </span>
                  <span className="text-xs font-semibold text-indigo-600">
                    {totals.util}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(totals.util, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-2.5 rounded-full ${totals.util > 100 ? "bg-red-400" : totals.util > 80 ? "bg-orange-400" : "bg-gradient-to-r from-indigo-500 to-cyan-500"}`}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  Total expenses / total income
                </p>
              </GlassCard>
            </motion.div>

            {/* Income Sources */}
            <motion.div {...stagger(6)}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet2 className="h-4 w-4 text-indigo-500" />
                  <h2 className="font-semibold text-gray-700 text-sm">
                    Income Sources
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs text-gray-400">Source name</label>
                    <input
                      placeholder="e.g., Salary, Freelance"
                      value={source.name}
                      className={`w-full px-3 py-2.5 rounded-xl bg-white/60 border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${sourceErrors.name ? "border-red-300" : "border-gray-200"}`}
                      onChange={(e) => {
                        setSource({ ...source, name: e.target.value });
                        if (sourceErrors.name)
                          setSourceErrors((p) => ({ ...p, name: "" }));
                      }}
                    />
                    <FieldError message={sourceErrors.name} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">
                      Amount ({selectedCurrency.code})
                    </label>
                    <input
                      inputMode="numeric"
                      placeholder="e.g., 75000"
                      value={source.amount}
                      className={`w-full px-3 py-2.5 rounded-xl bg-white/60 border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${sourceErrors.amount ? "border-red-300" : "border-gray-200"}`}
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
                  <p className="text-xs text-gray-400 text-center py-3">
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
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/50 border border-gray-100 text-sm"
                        >
                          <span className="text-gray-700 font-medium truncate">
                            {i.name}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-gray-600 font-semibold">
                              {fmt(
                                i.amount,
                                selectedCurrency.code,
                                selectedCurrency.locale,
                              )}
                            </span>
                            <button
                              onClick={() => removeIncomeSource(i.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors"
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
                <div className="flex items-center gap-2 mb-4">
                  <PiggyBank className="h-4 w-4 text-green-500" />
                  <h2 className="font-semibold text-gray-700 text-sm">
                    Savings Goals
                  </h2>
                </div>

                {/* Add goal form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
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
                      <label className="text-xs text-gray-400">{label}</label>
                      <input
                        type={type === "date" ? "date" : "text"}
                        inputMode={type === "numeric" ? "numeric" : undefined}
                        placeholder={placeholder}
                        value={newGoal[key]}
                        className={`w-full px-3 py-2.5 rounded-xl bg-white/60 border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${goalErrors[key] ? "border-red-300" : "border-gray-200"}`}
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
                    <label className="text-xs text-gray-400">Priority</label>
                    <Select
                      value={newGoal.priority}
                      onValueChange={(v) =>
                        setNewGoal({ ...newGoal, priority: v })
                      }
                    >
                      <SelectTrigger className="h-[42px] rounded-xl bg-white/60 border-gray-200 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
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
                  <p className="text-xs text-gray-400 text-center py-4">
                    No savings goals yet. Add your first one above!
                  </p>
                ) : (
                  <div className="space-y-3 mt-2">
                    <AnimatePresence>
                      {savingsGoals.map((goal) => (
                        <SavingsGoalCard
                          key={goal.id}
                          goal={goal}
                          onAddMoney={() => handleGoalAddMoney(goal)}
                          onWithdraw={() => handleGoalWithdraw(goal)}
                          onDelete={() => removeSavingsGoal(goal.id, goal.name)}
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
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="h-4 w-4 text-indigo-500" />
                  <h2 className="font-semibold text-gray-700 text-sm">
                    Add Expense
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-3 sm:items-start">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs text-gray-400">Date</label>
                    <input
                      type="date"
                      value={exp.date}
                      className={`w-full px-3 py-2.5 rounded-xl bg-white/60 border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${expErrors.date ? "border-red-300" : "border-gray-200"}`}
                      onChange={(e) => {
                        setExp({ ...exp, date: e.target.value });
                        if (expErrors.date)
                          setExpErrors((p) => ({ ...p, date: "" }));
                      }}
                    />
                    <FieldError message={expErrors.date} />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs text-gray-400">Category</label>
                    <Select
                      value={exp.category}
                      onValueChange={(v) => {
                        setExp({ ...exp, category: v });
                        if (expErrors.category)
                          setExpErrors((p) => ({ ...p, category: "" }));
                      }}
                    >
                      <SelectTrigger
                        className={`h-[42px] rounded-xl bg-white/60 text-sm ${expErrors.category ? "border-red-300" : "border-gray-200"}`}
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
                    <label className="text-xs text-gray-400">
                      Amount ({selectedCurrency.code})
                    </label>
                    <input
                      inputMode="decimal"
                      placeholder="e.g., 1200"
                      value={exp.amount}
                      className={`w-full px-3 py-2.5 rounded-xl bg-white/60 border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${expErrors.amount ? "border-red-300" : "border-gray-200"}`}
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
                    <label className="text-xs text-gray-400">
                      Description (optional)
                    </label>
                    <input
                      placeholder="e.g., BMTC pass, groceries at DMart"
                      value={exp.description}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
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

                {/* Mobile cards */}
                <div className="mt-4 md:hidden space-y-2">
                  <AnimatePresence>
                    {expenses.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-4">
                        No expenses yet.
                      </p>
                    ) : (
                      expenses.map((e) => (
                        <motion.div
                          key={e.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-start justify-between gap-3 px-3 py-3 rounded-xl bg-white/50 border border-gray-100"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 rounded-full shrink-0"
                                style={{ background: colorFor(e.category) }}
                              />
                              <span className="text-sm font-medium text-gray-700">
                                {e.category}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(e.date).toLocaleDateString()}
                            </p>
                            {e.description && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {e.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold text-gray-800">
                              {fmt(
                                e.amount,
                                selectedCurrency.code,
                                selectedCurrency.locale,
                              )}
                            </span>
                            <button
                              onClick={() => removeExpense(e.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-200/50">
                        <th className="pb-2 pl-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Category</th>
                        <th className="pb-2 font-medium">Description</th>
                        <th className="pb-2 text-right font-medium">Amount</th>
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
                            className="py-8 text-center text-xs text-gray-400"
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
                              className="border-b border-gray-100/60 hover:bg-white/40 transition-colors rounded-xl group"
                            >
                              <td className="py-3 pl-2 text-gray-500">
                                {new Date(e.date).toLocaleDateString()}
                              </td>
                              <td className="py-3">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="inline-block h-2 w-2 rounded-full shrink-0"
                                    style={{ background: colorFor(e.category) }}
                                  />
                                  <span className="text-gray-700">
                                    {e.category}
                                  </span>
                                </span>
                              </td>
                              <td className="py-3 text-gray-400">
                                {e.description}
                              </td>
                              <td className="py-3 text-right font-semibold text-gray-800">
                                {fmt(
                                  e.amount,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}
                              </td>
                              <td className="py-3 text-right pr-2">
                                <button
                                  onClick={() => removeExpense(e.id)}
                                  className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
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
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-indigo-500" />
                  <h2 className="font-semibold text-gray-700 text-sm">
                    Manage Categories
                  </h2>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    placeholder="New category name"
                    value={newCat}
                    maxLength={MAX_CATEGORY_NAME_LEN}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-white/60 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                    onChange={(e) => {
                      setNewCat(e.target.value);
                      if (catError) setCatError("");
                    }}
                  />
                  <GradBtn onClick={addCategory}>Add</GradBtn>
                </div>
                {catError ? (
                  <p className="mb-2 text-xs text-red-500">{catError}</p>
                ) : (
                  <p className="mb-2 text-xs text-gray-400">
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
                        background: `${colorFor(c)}18`,
                        borderColor: `${colorFor(c)}35`,
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

            {/* How to use */}
            <div className="mt-2">
              <TipsDialog />
            </div>
          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div className="space-y-6">
            {/* Donut chart */}
            <motion.div {...stagger(2)}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  <h2 className="font-semibold text-gray-700 text-sm">
                    By Category
                  </h2>
                </div>
                {totals.byCat.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-xs text-gray-400">
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
                              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-2">
                      {totals.byCat.map((entry) => {
                        const pct =
                          totals.totalExp > 0
                            ? ((entry.value / totals.totalExp) * 100).toFixed(1)
                            : "0.0";
                        return (
                          <div
                            key={entry.name}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ background: colorFor(entry.name) }}
                              />
                              <span className="text-gray-600 truncate">
                                {entry.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-gray-500">
                                {fmt(
                                  entry.value,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}
                              </span>
                              <span className="w-10 text-right font-semibold text-gray-700">
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
                  <Target className="h-4 w-4 text-indigo-500" />
                  <h2 className="font-semibold text-gray-700 text-sm">
                    Category Budgets
                  </h2>
                  {anyOverBudget && (
                    <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-500 border border-red-200">
                      Over budget
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-4">
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
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ background: colorFor(c) }}
                            />
                            <span className="text-xs font-medium text-gray-700">
                              {c}
                            </span>
                          </div>
                          {isOver ? (
                            <span className="text-[10px] font-medium text-red-500">
                              {fmt(
                                Math.abs(diff),
                                selectedCurrency.code,
                                selectedCurrency.locale,
                              )}{" "}
                              over
                            </span>
                          ) : bud > 0 ? (
                            <span className="text-[10px] text-gray-400">
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
                          className={`w-full px-3 py-2 rounded-xl bg-white/60 border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${isOver ? "border-red-200" : "border-gray-200"}`}
                          onChange={(e) =>
                            setBudget(c, e.target.value.replace(/[^0-9]/g, ""))
                          }
                        />
                        {bud > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className={`h-1.5 rounded-full ${isOver ? "bg-red-400" : pct > 80 ? "bg-orange-400" : "bg-gradient-to-r from-indigo-400 to-cyan-400"}`}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0">
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
                          <p className="text-[10px] text-gray-300">
                            no budget set
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>

            {/* Savings Goals summary */}
            {savingsGoals.length > 0 && (
              <motion.div {...stagger(4)}>
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PiggyBank className="h-4 w-4 text-green-500" />
                    <h2 className="font-semibold text-gray-700 text-sm">
                      Goals Overview
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {savingsGoals.map((goal) => {
                      const pct =
                        (goal.currentAmount / goal.targetAmount) * 100;
                      return (
                        <div key={goal.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700 truncate">
                              {goal.name}
                            </span>
                            <span className="text-xs text-indigo-500 font-semibold shrink-0 ml-2">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
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
  );
}

/* ── Savings Goal Card ── */
function SavingsGoalCard({
  goal,
  onAddMoney,
  onWithdraw,
  onDelete,
  selectedCurrency,
}) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24),
  );
  const isOverdue = daysRemaining < 0;
  const isCompleted = goal.currentAmount >= goal.targetAmount;

  const priorityStyle =
    {
      high: "text-red-500 bg-red-50 border-red-200",
      medium: "text-orange-500 bg-orange-50 border-orange-200",
      low: "text-green-500 bg-green-50 border-green-200",
    }[goal.priority] || "";
  const statusStyle = isCompleted
    ? "text-green-500 bg-green-50 border-green-200"
    : isOverdue
      ? "text-red-500 bg-red-50 border-red-200"
      : daysRemaining <= 7
        ? "text-orange-500 bg-orange-50 border-orange-200"
        : "text-blue-500 bg-blue-50 border-blue-200";
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
      className="p-4 rounded-2xl bg-white/50 border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 truncate mb-1.5">
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
          className="text-gray-200 hover:text-red-400 transition-colors ml-2 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
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
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.6 }}
            className={`h-2 rounded-full ${isCompleted ? "bg-green-400" : "bg-gradient-to-r from-indigo-400 to-cyan-400"}`}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          {progress.toFixed(1)}% complete
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onAddMoney}
          disabled={isCompleted}
          className="flex-1 py-1.5 rounded-xl border border-indigo-200 text-xs text-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-40"
        >
          + Add
        </button>
        <button
          onClick={onWithdraw}
          className="flex-1 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          − Withdraw
        </button>
      </div>
    </motion.div>
  );
}

/* ── Tips dialog ── */
function TipsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur-sm text-sm text-gray-500 shadow-sm hover:bg-white transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          How to use
        </motion.button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-indigo-600">
            Quick Start Guide
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-gray-600 text-sm mt-2">
              <p>
                <strong>🌍 Currency:</strong> Click the currency selector in the
                header to switch currencies.
              </p>
              <p>
                <strong>📅 Period:</strong> Choose a month or "Custom Period"
                for any date range.
              </p>
              <p>
                <strong>💰 Getting started:</strong> Add income sources → set
                budgets → log expenses daily.
              </p>
              <p>
                <strong>🎯 Goals:</strong> Track savings targets with progress
                bars. Use Add/Withdraw to update.
              </p>
              <p>
                <strong>📊 Charts:</strong> The donut chart updates as you add
                expenses.
              </p>
              <p>
                <strong>💾 Data:</strong> Saved to your browser and account.
                Export CSV anytime.
              </p>
              <p>
                <strong>🔴 Budgets:</strong> Bars turn orange at 80% and red
                when over limit.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
