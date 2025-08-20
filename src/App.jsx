import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Download, Wallet, CalendarClock, Wallet2, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// --- Helpers ---
const fmt = (n) =>
  isNaN(n) ? "₹0" : Number(n).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const monthKey = (d) => {
  const dt = d ? new Date(d) : new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

const CATEGORIES = [
  "Rent",
  "Groceries",
  "Transport",
  "Utilities",
  "Eating Out",
  "Shopping",
  "Fitness",
  "Entertainment",
  "Education",
  "Medical",
  "Other",
];

const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#84CC16", "#F97316", "#14B8A6", "#E11D48", "#64748B"]; // Tailwind-ish palette

// Build CSV string from array-of-arrays, joined by commas and newlines
function buildCSV(table) {
  return table.map((row) => row.map((cell) => String(cell)).join(",")).join("\n");
}

export default function ExpenseTracker() {
  const [selectedMonth, setSelectedMonth] = useState(monthKey());

  // Persisted state per month
  const [incomeSources, setIncomeSources] = useState([]); // [{id, name, amount}]
  const [expenses, setExpenses] = useState([]);
  const [catBudgets, setCatBudgets] = useState({}); // {category: number}

  // Form state
  const [source, setSource] = useState({ name: "Salary", amount: "" });
  const [exp, setExp] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Groceries",
    description: "",
    amount: "",
  });

  // Load & save
  useEffect(() => {
    const raw = localStorage.getItem(`expense-tracker:${selectedMonth}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      setIncomeSources(parsed.incomeSources || []);
      setExpenses(parsed.expenses || []);
      setCatBudgets(parsed.catBudgets || {});
    } else {
      setIncomeSources([]);
      setExpenses([]);
      setCatBudgets({});
    }
  }, [selectedMonth]);

  useEffect(() => {
    const payload = JSON.stringify({ incomeSources, expenses, catBudgets });
    localStorage.setItem(`expense-tracker:${selectedMonth}`, payload);
  }, [incomeSources, expenses, catBudgets, selectedMonth]);

  // Dev-only self tests to catch common regressions
  useEffect(() => {
    if (typeof window !== "undefined" && import.meta?.env?.DEV) {
      runSelfTests();
    }
  }, []);

  const totals = useMemo(() => {
    const income = incomeSources.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const remaining = income - totalExp;
    const util = income > 0 ? Math.min(100, Math.round((totalExp / income) * 100)) : 0;

    // category split
    const byCatMap = expenses.reduce((acc, e) => {
      const k = e.category || "Other";
      acc[k] = (acc[k] || 0) + (Number(e.amount) || 0);
      return acc;
    }, {});
    const byCat = Object.entries(byCatMap)
      .map(([name, value]) => ({ name, value, budget: Number(catBudgets[name]) || 0 }))
      .sort((a, b) => b.value - a.value);

    // over/under per category
    const overUnder = byCat.map((c) => ({
      category: c.name,
      spent: c.value,
      budget: c.budget,
      diff: (c.budget || 0) - c.value,
    }));

    return { income, totalExp, remaining, util, byCat, overUnder };
  }, [incomeSources, expenses, catBudgets]);

  function addIncomeSource() {
    const amt = Number(source.amount);
    if (!source.name || isNaN(amt) || amt < 0) return;
    setIncomeSources((prev) => [{ id: crypto.randomUUID(), name: source.name, amount: amt }, ...prev]);
    setSource({ name: "", amount: "" });
  }

  function removeIncomeSource(id) {
    setIncomeSources((prev) => prev.filter((i) => i.id !== id));
  }

  function addExpense() {
    const amt = Number(exp.amount);
    if (!exp.date || !exp.category || isNaN(amt) || amt <= 0) return;
    setExpenses((prev) => [{ id: crypto.randomUUID(), ...exp, amount: amt }, ...prev]);
    setExp({ date: new Date().toISOString().slice(0, 10), category: exp.category, description: "", amount: "" });
  }

  function removeExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function setBudget(category, value) {
    const amt = Number(value);
    setCatBudgets((prev) => ({ ...prev, [category]: isNaN(amt) ? 0 : amt }));
  }

  function exportCSV() {
    const header = ["Date", "Category", "Description", "Amount (INR)"];
    const rows = expenses
      .slice()
      .reverse()
      .map((e) => [e.date, e.category, (e.description || "").replaceAll(",", ";"), e.amount]);

    // Ensure newline between rows ("\n") to avoid unterminated string issues
    const csv = buildCSV([header, ...rows]);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Generate a list of last 12 months for quick switcher
  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      list.push({ key, label });
    }
    return list;
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Expense Tracker</h1>
            <p className="text-sm text-slate-500">
              Track monthly income (multiple sources), budgets per category, and expenses. All data is saved locally.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-56">
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
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export Expenses
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Summary */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                <p className="mt-1 text-xs text-slate-500">Total expenses / total income.</p>
              </div>
            </CardContent>
          </Card>

          {/* Income Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                      onChange={(e) => setSource({ ...source, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Amount (INR)</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g., 75000"
                      value={source.amount}
                      onChange={(e) => setSource({ ...source, amount: e.target.value.replace(/[^0-9]/g, "") })}
                    />
                  </div>
                </div>
                <Button onClick={addIncomeSource} className="w-full">
                  Add Source
                </Button>

                {incomeSources.length === 0 ? (
                  <p className="text-xs text-slate-500">No income sources added yet.</p>
                ) : (
                  <ul className="divide-y rounded-lg border bg-white">
                    {incomeSources.map((i) => (
                      <li key={i.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="truncate">{i.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{fmt(i.amount)}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeIncomeSource(i.id)}>
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
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Add expense */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={exp.date} onChange={(e) => setExp({ ...exp, date: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Category</Label>
                  <Select value={exp.category} onValueChange={(v) => setExp({ ...exp, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="e.g., 1200"
                    value={exp.amount}
                    onChange={(e) => setExp({ ...exp, amount: e.target.value.replace(/[^0-9.]/g, "") })}
                  />
                </div>
                <div className="sm:col-span-5">
                  <Label htmlFor="desc">Description (optional)</Label>
                  <Input
                    id="desc"
                    placeholder="e.g., BMTC pass, groceries at DMart"
                    value={exp.description}
                    onChange={(e) => setExp({ ...exp, description: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <Button className="w-full" onClick={addExpense}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-100 text-left text-slate-600">
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
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          No expenses yet. Add your first one above.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((e) => (
                        <tr key={e.id} className="border-b last:border-none">
                          <td className="p-2">{new Date(e.date).toLocaleDateString()}</td>
                          <td className="p-2">{e.category}</td>
                          <td className="p-2">{e.description}</td>
                          <td className="p-2 text-right">{fmt(e.amount)}</td>
                          <td className="p-2 text-right">
                            <Button variant="ghost" size="icon" onClick={() => removeExpense(e.id)}>
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

          {/* Chart & Budgets */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <CardContent>
                {totals.byCat.length === 0 ? (
                  <p className="text-sm text-slate-500">Add expenses to see the breakdown.</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={totals.byCat} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                          {totals.byCat.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Category Budgets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {CATEGORIES.map((c) => (
                    <div key={c} className="grid grid-cols-5 items-center gap-2">
                      <div className="col-span-2 text-sm">{c}</div>
                      <div className="col-span-2">
                        <Input
                          inputMode="numeric"
                          placeholder="Budget (INR)"
                          value={catBudgets[c] ?? ""}
                          onChange={(e) => setBudget(c, e.target.value.replace(/[^0-9]/g, ""))}
                        />
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        {(() => {
                          const spent = totals.byCat.find((x) => x.name === c)?.value || 0;
                          const bud = Number(catBudgets[c]) || 0;
                          const diff = bud - spent;
                          return bud > 0 ? (diff >= 0 ? `${fmt(diff)} left` : `${fmt(Math.abs(diff))} over`) : "";
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="h-3 w-full rounded-full bg-slate-200">
      <div className="h-3 rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
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
          <DialogTitle>Quick Start</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-slate-600">
              <p>
                1) Select the month at the top-right. 2) Add income sources (salary, freelance, etc.). 3) (Optional) Set category
                budgets. 4) Add expenses with date, category, and amount.
              </p>
              <p>
                Your data is saved to your browser (localStorage) per month. Use <strong>Export Expenses</strong> to download a CSV.
              </p>
              <p>Tip: Use budgets to see over/under for each category at a glance.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------
// Dev-only test suite (runs in dev builds)
// ----------------------------
function runSelfTests() {
  const assert = (name, cond, info = "") => {
    const msg = `[TEST] ${name}: ${cond ? "PASS" : "FAIL"}${info ? " — " + info : ""}`;
    console[cond ? "log" : "error"](msg);
  };

  // Test 1: CSV newline bug is fixed
  const header = ["Date", "Category"];
  const rows = [
    ["2025-08-01", "Groceries"],
    ["2025-08-02", "Rent"],
  ];
  const csv = buildCSV([header, ...rows]);
  assert("CSV has one newline per row", csv.split("\n").length === rows.length + 1, csv);

  // Test 2: monthKey formatting
  const mk = monthKey("2025-08-05");
  assert("monthKey formats YYYY-MM", mk === "2025-08", mk);

  // Test 3: fmt currency basic
  assert("fmt(0) => ₹0", fmt(0) === "₹0", fmt(0));
}
