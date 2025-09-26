// src/App.jsx
import React, { useMemo, useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

import useAuth from "@/hooks/useAuth";
import useMonthData from "@/hooks/useMonthData";
import useDateSelection from "@/hooks/useDateSelection";
import { useCurrency } from "@/hooks/useCurrency.jsx";
import { fmt, monthKey, buildCSV, periodKey } from "@/lib/utils";
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
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const hoverFx = {
  whileHover: { y: -3, scale: 1.01 },
  whileTap: { scale: 0.997 },
  transition: { type: "spring", stiffness: 300, damping: 20, mass: 0.5 },
};

/* Stable color per category (chart cells) */
function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function ExpenseTracker() {
  // Use persistent date selection hook
  const {
    selectedMonth,
    setSelectedMonth,
    customDateRange,
    setCustomDateRange,
  } = useDateSelection();

  // Use currency hook
  const { selectedCurrency } = useCurrency();

  // Add new goal form state
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    targetDate: "",
    category: "General",
    priority: "medium",
  });

  const { user, loading } = useAuth();

  // Listen for auth events
  useEffect(() => {
    const handleAuthError = (event) => {
      console.error("❌ Auth error:", event.detail);
      // You can show a toast notification here if needed
    };

    const handleAuthSuccess = () => {
      // You can show a success notification here if needed
    };

    window.addEventListener("auth:error", handleAuthError);
    window.addEventListener("auth:success", handleAuthSuccess);

    return () => {
      window.removeEventListener("auth:error", handleAuthError);
      window.removeEventListener("auth:success", handleAuthSuccess);
    };
  }, []);

  /* --------------- Month options (last 12) + Custom Period --------------- */
  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();

    // Add custom period option at the top
    list.push({ key: "custom", label: "Custom Period", isCustom: true });

    // Add last 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const label = d.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
      list.push({ key, label, isCustom: false });
    }
    return list;
  }, []);

  // Get the actual period key for data storage/retrieval
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

  // Add validation for custom date range
  const isCustomDateRangeValid = useMemo(() => {
    if (selectedMonth !== "custom") return true;

    const start = new Date(customDateRange.start);
    const end = new Date(customDateRange.end);

    return start <= end && start <= new Date();
  }, [selectedMonth, customDateRange]);

  // Add a helper to get the period display name
  const getPeriodDisplayName = useMemo(() => {
    if (
      selectedMonth === "custom" &&
      customDateRange.start &&
      customDateRange.end
    ) {
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);
      return `${start.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })} - ${end.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
    }

    const option = monthOptions.find((m) => m.key === selectedMonth);
    return option ? option.label : "Select Period";
  }, [selectedMonth, customDateRange, monthOptions]);

  // Loads + saves month data automatically (local + cloud if signed in)
  const { state, setState, totals } = useMonthData(user, currentPeriodKey);

  const {
    incomeSources = [],
    expenses = [],
    catBudgets = {},
    categories = DEFAULT_CATEGORIES,
    savingsGoals = [], // Add this line
  } = state;

  // Forms
  const [source, setSource] = useState({ name: "Salary", amount: "" });
  const [exp, setExp] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: categories[0] || "Groceries",
    description: "",
    amount: "",
  });

  // Category manager
  const [newCat, setNewCat] = useState("");
  const [catError, setCatError] = useState("");

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-sky-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication page if user is not logged in
  if (!user) {
    return <AuthPage />;
  }

  /* ---------------- Actions ---------------- */
  function addIncomeSource() {
    const amt = Number(source.amount);
    if (!source.name.trim()) {
      alert("Please enter a source name");
      return;
    }
    if (isNaN(amt) || amt < 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (amt > 10000000) {
      alert("Amount cannot exceed ₹10,000,000");
      return;
    }
    setState((s) => ({
      ...s,
      incomeSources: [
        { id: crypto.randomUUID(), name: source.name, amount: amt },
        ...(s.incomeSources || []),
      ],
    }));
    setSource({ name: "", amount: "" });
  }

  function removeIncomeSource(id) {
    setState((s) => ({
      ...s,
      incomeSources: (s.incomeSources || []).filter((i) => i.id !== id),
    }));
  }

  function addExpense() {
    const amt = Number(exp.amount);
    if (!exp.date) {
      alert("Please select a date");
      return;
    }
    if (!exp.category) {
      alert("Please select a category");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    // Validate amount
    if (amt > selectedCurrency.maxAmount) {
      alert(
        `Amount cannot exceed ${fmt(
          selectedCurrency.maxAmount,
          selectedCurrency.code,
          selectedCurrency.locale
        )}`
      );
      return;
    }

    // Validate date (not in future)
    const today = new Date();
    const expenseDate = new Date(exp.date);
    if (expenseDate > today) {
      alert("Cannot add expenses for future dates");
      return;
    }
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
  }

  function removeExpense(id) {
    setState((s) => ({
      ...s,
      expenses: (s.expenses || []).filter((e) => e.id !== id),
    }));
  }

  function setBudget(category, value) {
    const amt = Number(value);
    if (amt > selectedCurrency.maxAmount) {
      alert(
        `Budget cannot exceed ${fmt(
          selectedCurrency.maxAmount,
          selectedCurrency.code,
          selectedCurrency.locale
        )}`
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
  }

  /* ------------- Category manager helpers ------------- */
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
  }

  function deleteCategory(name) {
    if (name === "Other") return; // keep a fallback
    setState((s) => ({
      ...s,
      expenses: (s.expenses || []).map((e) =>
        e.category === name ? { ...e, category: "Other" } : e
      ),
      catBudgets: Object.fromEntries(
        Object.entries(s.catBudgets || {}).filter(([k]) => k !== name)
      ),
      categories: (s.categories || []).filter((c) => c !== name),
    }));
    setExp((prev) =>
      prev.category === name ? { ...prev, category: "Other" } : prev
    );
  }

  /* ---------------- Actions ---------------- */

  // Add savings goal functions
  function addSavingsGoal() {
    if (!newGoal.name.trim()) {
      alert("Please enter a goal name");
      return;
    }

    const targetAmt = Number(newGoal.targetAmount);
    const currentAmt = Number(newGoal.currentAmount);

    if (isNaN(targetAmt) || targetAmt <= 0) {
      alert("Please enter a valid target amount");
      return;
    }

    if (isNaN(currentAmt) || currentAmt < 0) {
      alert("Please enter a valid current amount");
      return;
    }

    if (currentAmt > targetAmt) {
      alert("Current amount cannot exceed target amount");
      return;
    }

    if (!newGoal.targetDate) {
      alert("Please select a target date");
      return;
    }

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

    // Reset form
    setNewGoal({
      name: "",
      targetAmount: "",
      currentAmount: "",
      targetDate: "",
      category: "General",
      priority: "medium",
    });
  }

  function updateSavingsGoal(id, updates) {
    setState((s) => ({
      ...s,
      savingsGoals: (s.savingsGoals || []).map((goal) =>
        goal.id === id ? { ...goal, ...updates } : goal
      ),
    }));
  }

  function removeSavingsGoal(id) {
    if (confirm("Are you sure you want to delete this savings goal?")) {
      setState((s) => ({
        ...s,
        savingsGoals: (s.savingsGoals || []).filter((goal) => goal.id !== id),
      }));
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-sky-100 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-end sm:justify-between">
          {/* left side: title + blurb */}
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

          {/* right side: controls */}
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap md:flex-nowrap">
            {/* Month/Custom Period select */}
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

              {/* Show custom date range picker when custom is selected */}
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

            {/* Auth buttons already handle their own width; just normalize height */}
            <div className="h-10 md:h-9">
              <AuthButtons className="h-full" />
            </div>
          </div>
        </header>

        {/* Top summary row */}
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
                      selectedCurrency.locale
                    )}
                  />
                  <Stat
                    label="Expenses"
                    value={fmt(
                      totals.totalExp,
                      selectedCurrency.code,
                      selectedCurrency.locale
                    )}
                  />
                  <Stat
                    label="Remaining"
                    value={fmt(
                      totals.remaining,
                      selectedCurrency.code,
                      selectedCurrency.locale
                    )}
                  />
                  <Stat label="Budget Used" value={`${totals.util}%`} />
                </div>

                {/* Add Savings Goals Summary */}
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
                        className="h-9 w-full"
                        onChange={(e) =>
                          setSource({ ...source, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Amount ({selectedCurrency.code})</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="e.g., 75000"
                        value={source.amount}
                        onChange={(e) =>
                          setSource({
                            ...source,
                            amount: e.target.value.replace(/[^0-9]/g, ""),
                          })
                        }
                      />
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

        {/* Savings Goals Section */}
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
                Savings Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {/* Add New Goal Form */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end">
                  <div>
                    <Label>Goal Name</Label>
                    <Input
                      placeholder="e.g., Emergency Fund"
                      value={newGoal.name}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, name: e.target.value })
                      }
                      className="h-9 w-full"
                    />
                  </div>
                  <div>
                    <Label>Target Amount ({selectedCurrency.code})</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g., 100000"
                      value={newGoal.targetAmount}
                      onChange={(e) =>
                        setNewGoal({
                          ...newGoal,
                          targetAmount: e.target.value.replace(/[^0-9]/g, ""),
                        })
                      }
                      className="h-9 w-full"
                    />
                  </div>
                  <div>
                    <Label>Current Amount ({selectedCurrency.code})</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g., 25000"
                      value={newGoal.currentAmount}
                      onChange={(e) =>
                        setNewGoal({
                          ...newGoal,
                          currentAmount: e.target.value.replace(/[^0-9]/g, ""),
                        })
                      }
                      className="h-9 w-full"
                    />
                  </div>
                  <div>
                    <Label>Target Date</Label>
                    <Input
                      type="date"
                      value={newGoal.targetDate}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, targetDate: e.target.value })
                      }
                      className="h-9 w-full"
                    />
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
                  <Button
                    onClick={addSavingsGoal}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white border-transparent hover:opacity-95"
                  >
                    Add Goal
                  </Button>
                </div>

                {/* Goals List */}
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
                        onUpdate={updateSavingsGoal}
                        onDelete={removeSavingsGoal}
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:items-end">
                  {/* Date */}
                  <div className="md:col-span-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      className="h-10 md:h-9 w-full"
                      value={exp.date}
                      onChange={(e) => setExp({ ...exp, date: e.target.value })}
                    />
                  </div>

                  {/* Category */}
                  <div className="md:col-span-2">
                    <Label>Category</Label>
                    <Select
                      value={exp.category}
                      onValueChange={(v) => setExp({ ...exp, category: v })}
                    >
                      <SelectTrigger className="h-10 md:h-9">
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
                  </div>

                  {/* Amount */}
                  <div className="md:col-span-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      inputMode="decimal"
                      className="h-10 md:h-9"
                      placeholder="e.g., 1200"
                      value={exp.amount}
                      onChange={(e) =>
                        setExp({
                          ...exp,
                          amount: e.target.value.replace(/[^0-9.]/g, ""),
                        })
                      }
                    />
                  </div>

                  {/* Description (full width on desktop row 2) */}
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

                  {/* Add button (sticks to baseline on desktop) */}
                  <div className="md:col-span-1">
                    <Button
                      className="w-full h-10 md:h-9 bg-gradient-to-r from-brand-start to-brand-end text-white border-transparent hover:opacity-95"
                      onClick={addExpense}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Mobile list (cards) */}
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
                              {e.description ? (
                                <div className="mt-1 text-xs text-gray-600">
                                  {e.description}
                                </div>
                              ) : null}
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
                    <p className="text-sm text-gray-500">
                      Add expenses to see the breakdown.
                    </p>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={totals.byCat}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={90}
                          >
                            {totals.byCat.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={colorFor(entry.name)}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v) => fmt(Number(v))}
                            contentStyle={{ borderRadius: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

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
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.map((c) => (
                      <div
                        key={c}
                        className="grid grid-cols-5 items-center gap-2"
                      >
                        <div className="col-span-2 text-sm">{c}</div>
                        <div className="col-span-2">
                          <Input
                            inputMode="numeric"
                            placeholder={`Budget (${selectedCurrency.code})`}
                            value={catBudgets[c] ?? ""}
                            onChange={(e) =>
                              setBudget(
                                c,
                                e.target.value.replace(/[^0-9]/g, "")
                              )
                            }
                          />
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {(() => {
                            const spent =
                              totals.byCat.find((x) => x.name === c)?.value ||
                              0;
                            const bud = Number(catBudgets[c]) || 0;
                            const diff = bud - spent;
                            return bud > 0
                              ? diff >= 0
                                ? `${fmt(diff)} left`
                                : `${fmt(Math.abs(diff))} over`
                              : "";
                          })()}
                        </div>
                      </div>
                    ))}
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

/* -----------------------------
   Small components
------------------------------ */
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
        style={{ width: `${percent}%` }}
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
                (🌍) to select your preferred currency. All amounts will
                automatically format in your chosen currency.
              </p>
              <p>
                <strong>📅 Date Selection:</strong> Choose from preset months or
                select "Custom Period" for any date range. Your selection will
                be remembered when you return.
              </p>
              <p>
                <strong>💰 Getting Started:</strong> 1) Select your currency and
                time period. 2) Add income sources (salary, freelance, etc.). 3)
                (Optional) Set category budgets. 4) Add expenses with date,
                category, and amount.
              </p>
              <p>
                <strong>🎯 Savings Goals:</strong> Set financial targets with
                target dates and track your progress. Add or withdraw money to
                stay on track.
              </p>
              <p>
                <strong>💾 Data Persistence:</strong> Your data is saved to your
                browser and (if signed in) to your account. Use{" "}
                <strong>Export Expenses</strong> to download a CSV.
              </p>
              <p>
                <strong>💡 Tips:</strong> Budgets show over/under for each
                category at a glance. Your currency and date preferences are
                automatically saved.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function SavingsGoalCard({ goal, onUpdate, onDelete, selectedCurrency }) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)
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
    if (daysRemaining <= 7) return `${daysRemaining} days left`;
    return `${daysRemaining} days left`;
  };

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{goal.name}</h3>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
                goal.priority
              )}`}
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
          onClick={() => onDelete(goal.id)}
          className="text-gray-400 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>
            {fmt(
              goal.currentAmount,
              selectedCurrency.code,
              selectedCurrency.locale
            )}
          </span>
          <span>
            {fmt(
              goal.targetAmount,
              selectedCurrency.code,
              selectedCurrency.locale
            )}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isCompleted ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {progress.toFixed(1)}% complete
        </div>
      </div>

      {/* Quick Update Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const amount = prompt(
              `How much did you add to "${goal.name}"? (${selectedCurrency.code})`
            );
            if (amount && !isNaN(Number(amount))) {
              onUpdate(goal.id, {
                currentAmount: Math.min(
                  goal.currentAmount + Number(amount),
                  goal.targetAmount
                ),
              });
            }
          }}
          className="flex-1 text-xs"
          disabled={isCompleted}
        >
          + Add Money
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const amount = prompt(
              `How much did you withdraw from "${goal.name}"? (${selectedCurrency.code})`
            );
            if (amount && !isNaN(Number(amount))) {
              onUpdate(goal.id, {
                currentAmount: Math.max(goal.currentAmount - Number(amount), 0),
              });
            }
          }}
          className="flex-1 text-xs"
        >
          - Withdraw
        </Button>
      </div>
    </div>
  );
}
