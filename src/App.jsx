// src/App.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const hoverFx = {
  whileHover: { y: -3, scale: 1.01 },
  whileTap: { scale: 0.997 },
  transition: { type: "spring", stiffness: 300, damping: 20, mass: 0.5 },
};

function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "error") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
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
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
              t.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
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

function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  confirmClassName = "",
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel?.();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gray-800">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm?.()}
            className={
              confirmClassName ||
              "bg-red-600 hover:bg-red-700 text-white border-transparent"
            }
          >
            {confirmLabel}
          </Button>
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gray-800">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="mt-2 space-y-2">
          <Label htmlFor="amount-input">Amount ({currency?.code})</Label>
          <Input
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
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent hover:opacity-95"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
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
    const handleAuthError = (event) => {
      addToast("Sign-in failed. Please try again.", "error");
      console.error("❌ Auth error:", event.detail);
    };
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
      list.push({ key, label, isCustom: false });
    }
    return list;
  }, []);

  const currentPeriodKey = useMemo(() => {
    if (
      selectedMonth === "custom" &&
      customDateRange.start &&
      customDateRange.end
    ) {
      return periodKey(customDateRange.start, customDateRange.end);
    }
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
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-sky-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  function openConfirm({ title, description, onConfirm }) {
    setConfirmDialog({ open: true, title, description, onConfirm });
  }
  function closeConfirm() {
    setConfirmDialog({
      open: false,
      title: "",
      description: "",
      onConfirm: null,
    });
  }
  function openAmountInput({ title, description, onConfirm }) {
    setAmountDialog({ open: true, title, description, onConfirm });
  }
  function closeAmountInput() {
    setAmountDialog({
      open: false,
      title: "",
      description: "",
      onConfirm: null,
    });
  }

  function addIncomeSource() {
    const errors = {};
    const amt = Number(source.amount);
    if (!source.name.trim()) errors.name = "Please enter a source name.";
    if (isNaN(amt) || amt < 0) errors.amount = "Please enter a valid amount.";
    else if (amt > 10000000)
      errors.amount = "Amount cannot exceed ₹10,000,000.";
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
        addToast("Income source removed.", "success");
        closeConfirm();
      },
    });
  }

  function addExpense() {
    const errors = {};
    const amt = Number(exp.amount);
    if (!exp.date) errors.date = "Please select a date.";
    else if (new Date(exp.date) > new Date())
      errors.date = "Cannot add expenses for future dates.";
    if (!exp.category) errors.category = "Please select a category.";
    if (isNaN(amt) || amt <= 0) errors.amount = "Please enter a valid amount.";
    else if (amt > selectedCurrency.maxAmount)
      errors.amount = `Amount cannot exceed ${fmt(selectedCurrency.maxAmount, selectedCurrency.code, selectedCurrency.locale)}.`;
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
        addToast("Expense deleted.", "success");
        closeConfirm();
      },
    });
  }

  function setBudget(category, value) {
    const amt = Number(value);
    if (amt > selectedCurrency.maxAmount) {
      addToast(
        `Budget cannot exceed ${fmt(selectedCurrency.maxAmount, selectedCurrency.code, selectedCurrency.locale)}.`,
        "error",
      );
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
      return `Keep it under ${MAX_CATEGORY_NAME_LEN} characters.`;
    if (!/^[A-Za-z0-9 ]+$/.test(name))
      return "Use letters, numbers, and spaces only.";
    if ((categories || []).some((c) => c.toLowerCase() === name.toLowerCase()))
      return "That category already exists.";
    if ((categories || []).length >= MAX_CATEGORIES)
      return `You can have up to ${MAX_CATEGORIES} categories.`;
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
      catBudgets: {
        ...(s.catBudgets || {}),
        [name]: s.catBudgets?.[name] ?? 0,
      },
    }));
    setNewCat("");
    setCatError("");
    addToast(`Category "${name}" added!`, "success");
  }

  function deleteCategory(name) {
    if (name === "Other") return;
    openConfirm({
      title: `Delete "${name}"?`,
      description: `All expenses in "${name}" will move to "Other". This cannot be undone.`,
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
        addToast(`Category "${name}" deleted.`, "success");
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
      errors.targetAmount = "Please enter a valid target amount.";
    if (isNaN(currentAmt) || currentAmt < 0)
      errors.currentAmount = "Please enter a valid current amount.";
    else if (currentAmt > targetAmt)
      errors.currentAmount = "Current amount cannot exceed target amount.";
    if (!newGoal.targetDate) errors.targetDate = "Please select a target date.";
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
    addToast("Savings goal added!", "success");
  }

  function updateSavingsGoal(id, updates) {
    setState((s) => ({
      ...s,
      savingsGoals: (s.savingsGoals || []).map((goal) =>
        goal.id === id ? { ...goal, ...updates } : goal,
      ),
    }));
  }

  function removeSavingsGoal(id, goalName) {
    openConfirm({
      title: `Delete "${goalName}"?`,
      description:
        "Your savings goal and all its progress will be permanently deleted.",
      onConfirm: () => {
        setState((s) => ({
          ...s,
          savingsGoals: (s.savingsGoals || []).filter((goal) => goal.id !== id),
        }));
        addToast("Savings goal deleted.", "success");
        closeConfirm();
      },
    });
  }

  function handleGoalAddMoney(goal) {
    openAmountInput({
      title: `Add money to "${goal.name}"`,
      description: `Current: ${fmt(goal.currentAmount, selectedCurrency.code, selectedCurrency.locale)} / Target: ${fmt(goal.targetAmount, selectedCurrency.code, selectedCurrency.locale)}`,
      onConfirm: (amount) => {
        updateSavingsGoal(goal.id, {
          currentAmount: Math.min(
            goal.currentAmount + amount,
            goal.targetAmount,
          ),
        });
        addToast(
          `Added ${fmt(amount, selectedCurrency.code, selectedCurrency.locale)} to "${goal.name}".`,
          "success",
        );
        closeAmountInput();
      },
    });
  }

  function handleGoalWithdraw(goal) {
    openAmountInput({
      title: `Withdraw from "${goal.name}"`,
      description: `Current balance: ${fmt(goal.currentAmount, selectedCurrency.code, selectedCurrency.locale)}`,
      onConfirm: (amount) => {
        updateSavingsGoal(goal.id, {
          currentAmount: Math.max(goal.currentAmount - amount, 0),
        });
        addToast(
          `Withdrew ${fmt(amount, selectedCurrency.code, selectedCurrency.locale)} from "${goal.name}".`,
          "success",
        );
        closeAmountInput();
      },
    });
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-sky-100 p-6">
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

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-indigo-700 flex items-center gap-2">
              Expense Tracker
              <span className="ml-2 align-middle rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-2 py-0.5 text-xs font-medium text-white animate-pulse">
                PWA
              </span>
            </h1>
            <p className="text-sm text-gray-500 italic">
              Powered by{" "}
              <span className="font-semibold text-indigo-700">Ancy</span> — your
              simple way to manage money smartly.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap md:flex-nowrap">
            <div className="flex flex-col gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="min-w-[14rem] w-[14rem] h-10 md:h-9">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
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
                    <Label htmlFor="start-date" className="text-xs">
                      From
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) =>
                        setCustomDateRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="h-8 w-32 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-xs">
                      To
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) =>
                        setCustomDateRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="h-8 w-32 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
            <CurrencySelector />
            <Button
              variant="outline"
              onClick={exportCSV}
              className="gap-2 whitespace-nowrap h-10 md:h-9"
            >
              <Download className="h-4 w-4" />
              Export Expenses
            </Button>
            <div className="h-10 md:h-9">
              <AuthButtons className="h-full" />
            </div>
          </div>
        </header>

        {/* Summary row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            {...hoverFx}
            className="md:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Wallet className="h-5 w-5" />
                  Monthly Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <Stat
                    label="Income"
                    value={fmt(
                      totals.income,
                      selectedCurrency.code,
                      selectedCurrency.locale,
                    )}
                  />
                  <Stat
                    label="Expenses"
                    value={fmt(
                      totals.totalExp,
                      selectedCurrency.code,
                      selectedCurrency.locale,
                    )}
                  />
                  <Stat
                    label="Remaining"
                    value={fmt(
                      totals.remaining,
                      selectedCurrency.code,
                      selectedCurrency.locale,
                    )}
                  />
                  <Stat label="Budget Used" value={`${totals.util}%`} />
                </div>
                {savingsGoals.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">
                      Savings Goals Progress
                    </h4>
                    <div className="space-y-2">
                      {savingsGoals.slice(0, 3).map((goal) => {
                        const progress =
                          (goal.currentAmount / goal.targetAmount) * 100;
                        return (
                          <div
                            key={goal.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-green-700 truncate">
                              {goal.name}
                            </span>
                            <span className="text-green-600 font-medium">
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                      {savingsGoals.length > 3 && (
                        <div className="text-xs text-green-600 text-center pt-1">
                          +{savingsGoals.length - 3} more goals
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <ProgressBar percent={totals.util} />
                  <p className="mt-1 text-xs text-gray-500">
                    Total expenses / total income.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Income Sources */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            {...hoverFx}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Wallet2 className="h-5 w-5" />
                  Income Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="e.g., Salary, Freelance"
                        value={source.name}
                        className={`h-9 w-full ${sourceErrors.name ? "border-red-400" : ""}`}
                        onChange={(e) => {
                          setSource({ ...source, name: e.target.value });
                          if (sourceErrors.name)
                            setSourceErrors((p) => ({ ...p, name: "" }));
                        }}
                      />
                      <FieldError message={sourceErrors.name} />
                    </div>
                    <div>
                      <Label>Amount ({selectedCurrency.code})</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="e.g., 75000"
                        value={source.amount}
                        className={sourceErrors.amount ? "border-red-400" : ""}
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
                  <Button
                    onClick={addIncomeSource}
                    className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent hover:opacity-95"
                  >
                    Add Source
                  </Button>
                  {incomeSources.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No income sources added yet.
                    </p>
                  ) : (
                    <ul className="divide-y rounded-lg border bg-white">
                      {incomeSources.map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <span className="truncate">{i.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{fmt(i.amount)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => removeIncomeSource(i.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Savings Goals */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          {...hoverFx}
          className="mt-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <Target className="h-5 w-5" />
                Savings Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-start">
                  <div>
                    <Label>Goal Name</Label>
                    <Input
                      placeholder="e.g., Emergency Fund"
                      value={newGoal.name}
                      className={`h-9 w-full ${goalErrors.name ? "border-red-400" : ""}`}
                      onChange={(e) => {
                        setNewGoal({ ...newGoal, name: e.target.value });
                        if (goalErrors.name)
                          setGoalErrors((p) => ({ ...p, name: "" }));
                      }}
                    />
                    <FieldError message={goalErrors.name} />
                  </div>
                  <div>
                    <Label>Target ({selectedCurrency.code})</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g., 100000"
                      value={newGoal.targetAmount}
                      className={`h-9 w-full ${goalErrors.targetAmount ? "border-red-400" : ""}`}
                      onChange={(e) => {
                        setNewGoal({
                          ...newGoal,
                          targetAmount: e.target.value.replace(/[^0-9]/g, ""),
                        });
                        if (goalErrors.targetAmount)
                          setGoalErrors((p) => ({ ...p, targetAmount: "" }));
                      }}
                    />
                    <FieldError message={goalErrors.targetAmount} />
                  </div>
                  <div>
                    <Label>Current ({selectedCurrency.code})</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g., 25000"
                      value={newGoal.currentAmount}
                      className={`h-9 w-full ${goalErrors.currentAmount ? "border-red-400" : ""}`}
                      onChange={(e) => {
                        setNewGoal({
                          ...newGoal,
                          currentAmount: e.target.value.replace(/[^0-9]/g, ""),
                        });
                        if (goalErrors.currentAmount)
                          setGoalErrors((p) => ({ ...p, currentAmount: "" }));
                      }}
                    />
                    <FieldError message={goalErrors.currentAmount} />
                  </div>
                  <div>
                    <Label>Target Date</Label>
                    <Input
                      type="date"
                      value={newGoal.targetDate}
                      className={`h-9 w-full ${goalErrors.targetDate ? "border-red-400" : ""}`}
                      onChange={(e) => {
                        setNewGoal({ ...newGoal, targetDate: e.target.value });
                        if (goalErrors.targetDate)
                          setGoalErrors((p) => ({ ...p, targetDate: "" }));
                      }}
                    />
                    <FieldError message={goalErrors.targetDate} />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={newGoal.priority}
                      onValueChange={(value) =>
                        setNewGoal({ ...newGoal, priority: value })
                      }
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={addSavingsGoal}
                      className="w-full h-9 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-transparent hover:opacity-95"
                    >
                      Add Goal
                    </Button>
                  </div>
                </div>
                {savingsGoals.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No savings goals set yet. Start by adding your first goal
                    above!
                  </p>
                ) : (
                  <div className="space-y-3">
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
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Add expense + Chart/Budgets/Manage */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            {...hoverFx}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Plus className="h-5 w-5" />
                  Add Expense
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:items-start">
                  <div className="md:col-span-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      className={`h-10 md:h-9 w-full ${expErrors.date ? "border-red-400" : ""}`}
                      value={exp.date}
                      onChange={(e) => {
                        setExp({ ...exp, date: e.target.value });
                        if (expErrors.date)
                          setExpErrors((p) => ({ ...p, date: "" }));
                      }}
                    />
                    <FieldError message={expErrors.date} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Category</Label>
                    <Select
                      value={exp.category}
                      onValueChange={(v) => {
                        setExp({ ...exp, category: v });
                        if (expErrors.category)
                          setExpErrors((p) => ({ ...p, category: "" }));
                      }}
                    >
                      <SelectTrigger
                        className={`h-10 md:h-9 ${expErrors.category ? "border-red-400" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={expErrors.category} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      inputMode="decimal"
                      className={`h-10 md:h-9 ${expErrors.amount ? "border-red-400" : ""}`}
                      placeholder="e.g., 1200"
                      value={exp.amount}
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
                  <div className="md:col-span-5">
                    <Label htmlFor="desc">Description (optional)</Label>
                    <Input
                      id="desc"
                      className="h-10 md:h-9"
                      placeholder="e.g., BMTC pass, groceries at DMart"
                      value={exp.description}
                      onChange={(e) =>
                        setExp({ ...exp, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      className="w-full h-10 md:h-9 bg-gradient-to-r from-brand-start to-brand-end text-white border-transparent hover:opacity-95"
                      onClick={addExpense}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Mobile list */}
                <div className="mt-6 md:hidden">
                  {expenses.length === 0 ? (
                    <p className="p-4 text-center text-gray-400">
                      No expenses yet. Add your first one above.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {expenses.map((e) => (
                        <li
                          key={e.id}
                          className="rounded-xl border bg-white p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium">
                                {e.category}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(e.date).toLocaleDateString()}
                              </div>
                              {e.description && (
                                <div className="mt-1 text-xs text-gray-600">
                                  {e.description}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">
                                {fmt(e.amount)}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="mt-1"
                                onClick={() => removeExpense(e.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Desktop table */}
                <div className="mt-6 hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-100 text-left text-gray-600">
                        <th className="p-2">Date</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-4 text-center text-gray-400"
                          >
                            No expenses yet. Add your first one above.
                          </td>
                        </tr>
                      ) : (
                        expenses.map((e) => (
                          <tr key={e.id} className="border-b last:border-none">
                            <td className="p-2">
                              {new Date(e.date).toLocaleDateString()}
                            </td>
                            <td className="p-2">{e.category}</td>
                            <td className="p-2">{e.description}</td>
                            <td className="p-2 text-right">{fmt(e.amount)}</td>
                            <td className="p-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExpense(e.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right column */}
          <div className="space-y-6">
            {/* ── By Category with legend ── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              {...hoverFx}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-indigo-700">By Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {totals.byCat.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="text-4xl mb-2">📊</div>
                      <p className="text-sm text-gray-500">
                        Add expenses to see the breakdown.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={totals.byCat}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={52}
                              outerRadius={82}
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
                              contentStyle={{ borderRadius: 12 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legend — only categories with spending */}
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
                                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ background: colorFor(entry.name) }}
                                />
                                <span className="text-gray-700 truncate">
                                  {entry.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2 text-gray-500">
                                <span>
                                  {fmt(
                                    entry.value,
                                    selectedCurrency.code,
                                    selectedCurrency.locale,
                                  )}
                                </span>
                                <span className="w-9 text-right font-medium text-gray-700">
                                  {pct}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Category Budgets with progress bars ── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              {...hoverFx}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-700">
                    <Target className="h-5 w-5" />
                    Category Budgets
                    {categories.some((c) => {
                      const spent =
                        totals.byCat.find((x) => x.name === c)?.value || 0;
                      const bud = Number(catBudgets[c]) || 0;
                      return bud > 0 && spent > bud;
                    }) && (
                      <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                        Over budget
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map((c) => {
                      const spent =
                        totals.byCat.find((x) => x.name === c)?.value || 0;
                      const bud = Number(catBudgets[c]) || 0;
                      const diff = bud - spent;
                      const isOver = bud > 0 && diff < 0;
                      const pct =
                        bud > 0 ? Math.min((spent / bud) * 100, 100) : 0;
                      return (
                        <div key={c} className="space-y-1">
                          {/* Name + status */}
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 rounded-full shrink-0"
                              style={{ background: colorFor(c) }}
                            />
                            <span className="flex-1 text-sm font-medium text-gray-700">
                              {c}
                            </span>
                            {isOver && (
                              <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                                {fmt(
                                  Math.abs(diff),
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}{" "}
                                over
                              </span>
                            )}
                            {!isOver && bud > 0 && (
                              <span className="text-xs text-gray-400">
                                {fmt(
                                  diff,
                                  selectedCurrency.code,
                                  selectedCurrency.locale,
                                )}{" "}
                                left
                              </span>
                            )}
                          </div>
                          {/* Input + spent */}
                          <div className="grid grid-cols-5 items-center gap-2">
                            <div className="col-span-3">
                              <Input
                                inputMode="numeric"
                                placeholder={`Budget (${selectedCurrency.code})`}
                                value={catBudgets[c] ?? ""}
                                onChange={(e) =>
                                  setBudget(
                                    c,
                                    e.target.value.replace(/[^0-9]/g, ""),
                                  )
                                }
                                className={
                                  isOver
                                    ? "border-red-300 focus:border-red-400"
                                    : ""
                                }
                              />
                            </div>
                            <div className="col-span-2 text-xs text-gray-400 text-right">
                              {bud > 0
                                ? `${fmt(spent, selectedCurrency.code, selectedCurrency.locale)} spent`
                                : "no budget set"}
                            </div>
                          </div>
                          {/* Progress bar */}
                          {bud > 0 && (
                            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${isOver ? "bg-red-500" : pct > 80 ? "bg-orange-400" : "bg-indigo-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Manage Categories */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              {...hoverFx}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-indigo-700">
                    Manage Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="New category name"
                      value={newCat}
                      onChange={(e) => {
                        setNewCat(e.target.value);
                        if (catError) setCatError("");
                      }}
                      maxLength={MAX_CATEGORY_NAME_LEN}
                    />
                    <Button
                      onClick={addCategory}
                      className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent hover:opacity-95"
                    >
                      Add
                    </Button>
                  </div>
                  {catError ? (
                    <p className="mt-2 text-xs text-red-600">{catError}</p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      You can have up to {MAX_CATEGORIES} categories.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-slate-700"
                        style={{
                          background: `${colorFor(c)}20`,
                          borderColor: `${colorFor(c)}40`,
                        }}
                      >
                        {c}
                        {c !== "Other" && (
                          <button
                            title="Delete category"
                            onClick={() => deleteCategory(c)}
                            className="ml-1 rounded p-0.5 hover:bg-white/50"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        <div className="mt-6">
          <TipsDialog />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="h-3 w-full rounded-full bg-gray-200">
      <div
        className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function TipsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">How to use</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-indigo-700">Quick Start</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-gray-600">
              <p>
                <strong>🌍 Multi-Currency Support:</strong> Click the globe icon
                to select your preferred currency.
              </p>
              <p>
                <strong>📅 Date Selection:</strong> Choose from preset months or
                select "Custom Period" for any date range. Your selection will
                be remembered.
              </p>
              <p>
                <strong>💰 Getting Started:</strong> 1) Select your currency and
                time period. 2) Add income sources. 3) Set category budgets
                (optional). 4) Add expenses.
              </p>
              <p>
                <strong>🎯 Savings Goals:</strong> Set financial targets with
                target dates and track your progress. Use the Add / Withdraw
                buttons to update amounts.
              </p>
              <p>
                <strong>💾 Data Persistence:</strong> Your data is saved to your
                browser and (if signed in) to your account. Use{" "}
                <strong>Export Expenses</strong> to download a CSV.
              </p>
              <p>
                <strong>💡 Tips:</strong> Budget bars turn orange at 80% and red
                when over limit. Your currency and date preferences are
                automatically saved.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
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
  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24),
  );
  const isOverdue = daysRemaining < 0;
  const isCompleted = goal.currentAmount >= goal.targetAmount;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = () => {
    if (isCompleted) return "text-green-600 bg-green-50 border-green-200";
    if (isOverdue) return "text-red-600 bg-red-50 border-red-200";
    if (daysRemaining <= 7)
      return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getStatusText = () => {
    if (isCompleted) return "Completed! 🎉";
    if (isOverdue) return `${Math.abs(daysRemaining)} days overdue`;
    if (daysRemaining === 0) return "Due today!";
    if (daysRemaining === 1) return "Due tomorrow";
    return `${daysRemaining} days left`;
  };

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{goal.name}</h3>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(goal.priority)}`}
            >
              {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}{" "}
              Priority
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor()}`}
            >
              {getStatusText()}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-gray-400 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
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
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${isCompleted ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {progress.toFixed(1)}% complete
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddMoney}
          className="flex-1 text-xs"
          disabled={isCompleted}
        >
          + Add Money
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onWithdraw}
          className="flex-1 text-xs"
        >
          − Withdraw
        </Button>
      </div>
    </div>
  );
}
