// src/components/BankImportModal.jsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileUp,
  Sparkles,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { parseBankStatementFn, loadMonth, saveMonth } from "@/lib/firebase";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useTheme() {
  return React.useContext(React.createContext({ dark: false }));
}

// We re-use the ThemeContext from App via prop drilling (dark prop)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Bills & Utilities",
  "Health",
  "Entertainment",
  "Travel",
  "Education",
  "Groceries",
  "Personal Care",
  "Subscriptions",
  "Other",
];

function extractTextFromPDF(file) {
  // Use PDF.js via CDN — loaded globally if available, else fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Try PDF.js if available
        if (window.pdfjsLib) {
          const typedArray = new Uint8Array(e.target.result);
          const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
          let text = "";
          for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item) => item.str).join(" ") + "\n";
          }
          resolve(text.slice(0, 50000));
        } else {
          // Fallback: read as base64 and send raw to Claude
          const base64 = btoa(
            new Uint8Array(e.target.result).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          resolve({ base64, mediaType: "application/pdf" });
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}


function waitForPdfJs(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(); return; }
    const start = Date.now();
    const id = setInterval(() => {
      if (window.pdfjsLib) { clearInterval(id); resolve(); }
      else if (Date.now() - start > timeout) { clearInterval(id); reject(new Error("PDF.js failed to load. Please try again.")); }
    }, 100);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DropZone({ dark, onFile, loading, pdfJsLoading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !loading && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200
        ${dragging
          ? dark
            ? "border-indigo-400 bg-indigo-500/10"
            : "border-indigo-400 bg-indigo-50"
          : dark
          ? "border-white/15 hover:border-indigo-500/50 hover:bg-white/5"
          : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50"
        } ${loading ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.csv,.txt"
        className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      <div
        className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
          dark ? "bg-indigo-500/20" : "bg-indigo-50"
        }`}
      >
        <FileUp className="h-7 w-7 text-indigo-400" />
      </div>
      <div className="text-center">
        <p className={`text-sm font-medium ${dark ? "text-gray-200" : "text-gray-700"}`}>
          Drop your bank statement here
        </p>
        <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Supports PDF, CSV, or TXT — any bank, any country
        </p>
        {pdfJsLoading && (
          <p className={`text-xs mt-2 flex items-center justify-center gap-1.5 ${dark ? "text-indigo-400" : "text-indigo-500"}`}>
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading PDF support…
          </p>
        )}
      </div>
      <span
        className={`text-xs px-3 py-1 rounded-full border ${
          dark ? "border-white/10 text-gray-400" : "border-gray-200 text-gray-500"
        }`}
      >
        or click to browse
      </span>
    </div>
  );
}

function TransactionRow({ tx, idx, selected, onToggle, dark, categories, onEdit }) {
  const [expanded, setExpanded] = useState(false);

  const t = {
    text: dark ? "text-gray-100" : "text-gray-800",
    muted: dark ? "text-gray-400" : "text-gray-500",
    faint: dark ? "text-gray-600" : "text-gray-400",
    input: dark
      ? "bg-[#252a3d] border-white/10 text-gray-200"
      : "bg-white border-gray-200 text-gray-800",
    selectedBg: dark ? "bg-indigo-500/15 border-indigo-500/30" : "bg-indigo-50 border-indigo-200",
    defaultBg: dark ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100",
  };

  return (
    <div
      className={`rounded-xl border transition-all ${
        selected ? t.selectedBg : t.defaultBg
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <div
          onClick={() => onToggle(idx)}
          className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border cursor-pointer transition-colors ${
            selected
              ? "bg-indigo-500 border-indigo-500"
              : dark
              ? "border-white/20"
              : "border-gray-300"
          }`}
        >
          {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <div>
            <p className={`text-[10px] ${t.faint}`}>Date</p>
            <p className={`text-xs font-medium ${t.text}`}>{tx.date}</p>
          </div>
          <div>
            <p className={`text-[10px] ${t.faint}`}>Amount</p>
            <p className={`text-xs font-semibold text-indigo-400`}>
              {tx.amount?.toLocaleString()}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className={`text-[10px] ${t.faint}`}>Description</p>
            <p className={`text-xs truncate ${t.text}`}>{tx.description || "—"}</p>
          </div>
          <div>
            <p className={`text-[10px] ${t.faint}`}>Category</p>
            <p className={`text-xs ${t.muted}`}>{tx.category}</p>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`shrink-0 ${t.faint} hover:${t.muted} transition-colors`}
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Expanded edit row */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className={`px-3 pb-3 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t ${dark ? "border-white/5" : "border-gray-100"}`}>
              <div>
                <label className={`text-[10px] ${t.faint} mb-1 block`}>Date</label>
                <input
                  type="date"
                  value={tx.date}
                  onChange={(e) => onEdit(idx, "date", e.target.value)}
                  className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${t.input}`}
                />
              </div>
              <div>
                <label className={`text-[10px] ${t.faint} mb-1 block`}>Amount</label>
                <input
                  type="number"
                  value={tx.amount}
                  onChange={(e) => onEdit(idx, "amount", Number(e.target.value))}
                  className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${t.input}`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={`text-[10px] ${t.faint} mb-1 block`}>Description</label>
                <input
                  type="text"
                  value={tx.description}
                  onChange={(e) => onEdit(idx, "description", e.target.value)}
                  className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${t.input}`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={`text-[10px] ${t.faint} mb-1 block`}>Category</label>
                <select
                  value={tx.category}
                  onChange={(e) => onEdit(idx, "category", e.target.value)}
                  className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${t.input}`}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function BankImportModal({
  open,
  onClose,
  dark,
  categories,
  selectedCurrency,
  existingExpenses,
  user,
  currentPeriodKey,
  setState,
  addToast,
}) {
  const allCategories = categories?.length ? [...new Set([...categories, ...CATEGORIES])] : CATEGORIES;

  const [step, setStep] = useState("upload"); // upload | parsing | saving | review | done
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState({});
  const [summary, setSummary] = useState(null);
  const [duplicateIds, setDuplicateIds] = useState(new Set());
  const [pdfJsLoading, setPdfJsLoading] = useState(!window.pdfjsLib);

  useEffect(() => {
    if (window.pdfjsLib) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfJsLoading(false);
    };
    script.onerror = () => setPdfJsLoading(false);
    document.head.appendChild(script);
  }, []);

  const t = {
    text: dark ? "text-gray-100" : "text-gray-800",
    muted: dark ? "text-gray-400" : "text-gray-500",
    faint: dark ? "text-gray-500" : "text-gray-400",
    bg: dark ? "bg-[#1e2235]" : "bg-white",
    border: dark ? "border-white/10" : "border-gray-200",
    badgeBg: dark ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100",
  };

  function reset() {
    setStep("upload");
    setFile(null);
    setError("");
    setTransactions([]);
    setSelected({});
    setSummary(null);
    setDuplicateIds(new Set());
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(f) {
    setFile(f);
    setError("");
    setStep("parsing");

    try {
      let fileText;
      if (f.name.endsWith(".csv") || f.name.endsWith(".txt")) {
        fileText = (await f.text()).slice(0, 50000);
      } else {
        // PDF — wait for PDF.js CDN script if still loading
        await waitForPdfJs();
        const extracted = await extractTextFromPDF(f);
        fileText = typeof extracted === "string" ? extracted : "";
      }

      const response = await parseBankStatementFn({
        fileText,
        categories: allCategories,
        currency: selectedCurrency?.code || "INR",
      });
      const result = response.data;

      const txs = (result.transactions || []).filter(
        (tx) => tx.amount > 0 && tx.date
      );

      if (txs.length === 0) {
        setError("No expense transactions found. Please try a different file or format.");
        setStep("upload");
        return;
      }

      // Detect duplicates against existing expenses
      const dupSet = new Set();
      txs.forEach((tx, i) => {
        const isDup = (existingExpenses || []).some(
          (e) =>
            e.date === tx.date &&
            Math.abs(e.amount - tx.amount) < 0.01 &&
            (e.description || "").toLowerCase() === (tx.description || "").toLowerCase()
        );
        if (isDup) dupSet.add(i);
      });

      // Pre-select all non-duplicates
      const sel = {};
      txs.forEach((_, i) => {
        sel[i] = !dupSet.has(i);
      });

      setTransactions(txs);
      setSelected(sel);
      setDuplicateIds(dupSet);
      setSummary(result.summary);
      setStep("review");
    } catch (err) {
      console.error("Parse error:", err);
      // Firebase callable errors have err.message with the specific HttpsError message
      const msg =
        err?.message ||
        err?.details ||
        "Failed to parse statement. Please try again.";
      setError(msg);
      setStep("upload");
    }
  }

  function toggleSelect(i) {
    setSelected((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function toggleAll() {
    const allOn = Object.values(selected).every(Boolean);
    const next = {};
    transactions.forEach((_, i) => {
      next[i] = !allOn;
    });
    setSelected(next);
  }

  function editTransaction(idx, field, value) {
    setTransactions((prev) =>
      prev.map((tx, i) => (i === idx ? { ...tx, [field]: value } : tx))
    );
  }

  async function handleConfirmImport() {
    const toAdd = transactions
      .filter((_, i) => selected[i])
      .map((tx) => ({
        id: crypto.randomUUID(),
        date: tx.date,
        category: tx.category,
        description: tx.description || "",
        amount: Number(tx.amount),
      }));

    if (toAdd.length === 0) {
      addToast?.("Select at least one transaction to import.", "error");
      return;
    }

    setStep("saving");
    try {
      const byMonth = {};
      for (const tx of toAdd) {
        const key = tx.date?.slice(0, 7);
        if (!key) continue;
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(tx);
      }

      const monthsWithAdditions = [];
      let totalAdded = 0;
      const currentMonthAdded = [];

      for (const mKey of Object.keys(byMonth)) {
        const incoming = byMonth[mKey];
        const monthData = await loadMonth(user.uid, mKey);
        const existing = monthData.expenses || [];

        const newItems = incoming.filter(
          (tx) =>
            !existing.some(
              (e) =>
                e.date === tx.date &&
                Math.abs(e.amount - tx.amount) < 0.01 &&
                (e.description || "").toLowerCase() === (tx.description || "").toLowerCase(),
            ),
        );

        if (newItems.length === 0) continue;

        await saveMonth(user.uid, mKey, { expenses: [...newItems, ...existing] });
        totalAdded += newItems.length;
        monthsWithAdditions.push(mKey);

        if (mKey === currentPeriodKey) {
          currentMonthAdded.push(...newItems);
        }
      }

      if (currentMonthAdded.length > 0) {
        setState((s) => ({
          ...s,
          expenses: [...currentMonthAdded, ...(s.expenses || [])],
        }));
      }

      if (totalAdded === 0) {
        addToast?.("All transactions already exist — nothing new imported.", "info");
        setStep("review");
        return;
      }

      const mc = monthsWithAdditions.length;
      addToast?.(
        `${totalAdded} transaction${totalAdded !== 1 ? "s" : ""} imported across ${mc} month${mc !== 1 ? "s" : ""}`,
        "success",
      );

      if (currentMonthAdded.length === 0 && monthsWithAdditions.length > 0) {
        const latest = [...monthsWithAdditions].sort().reverse()[0];
        const [y, m] = latest.split("-");
        const label = new Date(Number(y), Number(m) - 1).toLocaleString("en-IN", {
          month: "long",
          year: "numeric",
        });
        addToast?.(`Switch to ${label} to see imported transactions.`, "info");
      }

      setStep("done");
    } catch (err) {
      setError(err?.message || "Import failed. Please try again.");
      setStep("review");
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const dupCount = duplicateIds.size;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className={`max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto ${
          dark ? "bg-[#1e2235] border-white/10" : ""
        }`}
      >
        <DialogHeader>
          <DialogTitle
            className={`flex items-center gap-2 ${dark ? "text-gray-100" : "text-gray-800"}`}
          >
            <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            Import Bank Statement
          </DialogTitle>
          <DialogDescription className={dark ? "text-gray-400" : ""}>
            AI-powered parsing — supports any bank, any country
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <AnimatePresence mode="wait">
            {/* ── UPLOAD ── */}
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <DropZone dark={dark} onFile={handleFile} loading={false} pdfJsLoading={pdfJsLoading} />

                {error && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-xl border ${
                      dark
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-red-50 border-red-100 text-red-600"
                    }`}
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* Supported banks note */}
                <div
                  className={`p-3 rounded-xl border text-xs ${t.badgeBg} ${t.muted}`}
                >
                  <p className="font-medium mb-1.5">Works with statements from:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "HDFC", "SBI", "ICICI", "Axis", "Kotak", "Yes Bank",
                      "Chase", "Bank of America", "Barclays", "HSBC",
                      "DBS", "Standard Chartered", "and more…",
                    ].map((b) => (
                      <span
                        key={b}
                        className={`px-2 py-0.5 rounded-full border ${
                          dark
                            ? "border-white/10 text-gray-400"
                            : "border-gray-200 text-gray-500"
                        }`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── PARSING ── */}
            {step === "parsing" && (
              <motion.div
                key="parsing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-5"
              >
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-indigo-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Loader2 className="h-3 w-3 text-white animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-semibold ${t.text}`}>
                    Analyzing your statement…
                  </p>
                  <p className={`text-xs mt-1 ${t.faint}`}>
                    {file?.name} — Claude is extracting transactions
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {["Parsing PDF", "Finding transactions", "Categorizing"].map(
                    (label, i) => (
                      <motion.span
                        key={label}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          delay: i * 0.6,
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${t.badgeBg} ${t.faint}`}
                      >
                        {label}
                      </motion.span>
                    )
                  )}
                </div>
              </motion.div>
            )}

            {/* ── SAVING ── */}
            {step === "saving" && (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-5"
              >
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-green-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Loader2 className="h-3 w-3 text-white animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-semibold ${t.text}`}>
                    Saving transactions…
                  </p>
                  <p className={`text-xs mt-1 ${t.faint}`}>
                    Writing to each month — this may take a moment
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── REVIEW ── */}
            {step === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Summary bar */}
                {summary && (
                  <div
                    className={`flex flex-wrap gap-3 p-3 rounded-xl border text-xs ${t.badgeBg}`}
                  >
                    {[
                      { label: "Bank", value: summary.bank },
                      { label: "Period", value: summary.period },
                      { label: "Currency", value: summary.currency },
                      { label: "Total", value: `${summary.total?.toLocaleString()}` },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className={t.faint}>{s.label}</p>
                        <p className={`font-medium ${t.text}`}>{s.value || "—"}</p>
                      </div>
                    ))}
                    <div>
                      <p className={t.faint}>Found</p>
                      <p className={`font-medium ${t.text}`}>
                        {transactions.length} transactions
                      </p>
                    </div>
                    {dupCount > 0 && (
                      <div>
                        <p className={t.faint}>Duplicates</p>
                        <p className="font-medium text-amber-400">
                          {dupCount} detected
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleAll}
                    className={`text-xs underline underline-offset-2 ${
                      dark ? "text-indigo-400" : "text-indigo-600"
                    }`}
                  >
                    {Object.values(selected).every(Boolean)
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                  <p className={`text-xs ${t.faint}`}>
                    {selectedCount} of {transactions.length} selected
                    {dupCount > 0 && ` · ${dupCount} duplicates skipped`}
                  </p>
                </div>

                {/* Transaction list */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {transactions.map((tx, i) => (
                    <div key={i} className="relative">
                      <TransactionRow
                        tx={tx}
                        idx={i}
                        selected={!!selected[i]}
                        onToggle={toggleSelect}
                        dark={dark}
                        categories={allCategories}
                        onEdit={editTransaction}
                      />
                      {duplicateIds.has(i) && (
                        <span
                          className={`absolute top-2 right-8 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            dark
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                          }`}
                        >
                          duplicate
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 sticky bottom-0">
                  <button
                    onClick={() => { reset(); }}
                    className={`flex-1 py-2.5 rounded-xl border text-sm transition-colors ${
                      dark
                        ? "border-white/10 text-gray-400 hover:bg-white/5"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={selectedCount === 0}
                    className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shadow-md"
                  >
                    Import {selectedCount > 0 ? `${selectedCount} ` : ""}
                    Transaction{selectedCount !== 1 ? "s" : ""}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── DONE ── */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 gap-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/20"
                >
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <p className={`text-lg font-bold ${t.text}`}>Import complete!</p>
                  <p className={`text-sm mt-1 ${t.faint}`}>
                    {selectedCount} transaction{selectedCount !== 1 ? "s" : ""} added to your expenses
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 shadow-md"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
