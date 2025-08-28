// src/App.jsx
import React, { useMemo, useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

import useAuth from "@/hooks/useAuth";
import useMonthData from "@/hooks/useMonthData";
import { fmt, monthKey, buildCSV } from "@/lib/utils";
import {
  DEFAULT_CATEGORIES,
  MAX_CATEGORIES,
  MAX_CATEGORY_NAME_LEN,
  COLORS,
} from "@/lib/constants";

import AuthButtons from "@/components/AuthButtons";
import AuthPage from "@/components/AuthPage";
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
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const { user, loading } = useAuth();

  // Listen for auth events
  React.useEffect(() => {
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

  // Loads + saves month data automatically (local + cloud if signed in)
  const { state, setState, totals } = useMonthData(user, selectedMonth);

  const {
    incomeSources = [],
    expenses = [],
    catBudgets = {},
    categories = DEFAULT_CATEGORIES,
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

  /* --------------- Month options (last 12) --------------- */
  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();
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
      list.push({ key, label });
    }
    return list;
  }, []);

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
    if (amt > 10000000) {
      alert("Amount cannot exceed ₹10,000,000");
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
    if (amt > 10000000) {
      alert("Budget cannot exceed ₹10,000,000");
      return;
    }
    setState((s) => ({
      ...s,
      catBudgets: { ...(s.catBudgets || {}), [category]: isNaN(amt) ? 0 : amt },
    }));
  }

  function exportCSV() {
    const header = ["Date", "Category", "Description", "Amount (INR)"];
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
            {/* Month select */}
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
                  <Stat label="Income" value={fmt(totals.income)} />
                  <Stat label="Expenses" value={fmt(totals.totalExp)} />
                  <Stat label="Remaining" value={fmt(totals.remaining)} />
                  <Stat label="Budget Used" value={`${totals.util}%`} />
                </div>
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
                      <Label>Amount (INR)</Label>
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
                            placeholder="Budget (INR)"
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
                1) Select the month at the top-right. 2) Add income sources
                (salary, freelance, etc.). 3) (Optional) Set category budgets.
                4) Add expenses with date, category, and amount.
              </p>
              <p>
                Your data is saved to your browser and (if signed in) to your
                account. Use <strong>Export Expenses</strong> to download a CSV.
              </p>
              <p>Tip: Budgets show over/under for each category at a glance.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
