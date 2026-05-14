/**
 * Escapes a value for CSV per RFC 4180.
 * Wraps in quotes if value contains comma, quote, or newline.
 * Doubles any internal quotes.
 */
function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a CSV string from expense data across all periods.
 * @param {Object} allMonthsData - { [periodKey]: { expenses: [...] } }
 * @returns {string} CSV content
 */
export function buildExpensesCsv(allMonthsData) {
  const headers = ["Date", "Amount", "Category", "Description", "Period"];
  const rows = [headers.join(",")];

  Object.entries(allMonthsData || {}).forEach(([periodKey, monthData]) => {
    const expenses = monthData?.expenses || [];
    expenses.forEach((exp) => {
      rows.push(
        [
          escapeCsv(exp.date || ""),
          escapeCsv(exp.amount ?? ""),
          escapeCsv(exp.category || ""),
          escapeCsv(exp.description || ""),
          escapeCsv(periodKey),
        ].join(","),
      );
    });
  });

  return rows.join("\n");
}

/**
 * Builds a full JSON export including expenses, budgets, income, savings, categories.
 */
export function buildFullJsonExport({
  allMonthsData,
  catBudgets,
  incomeSources,
  savingsGoals,
  categories,
  user,
  currency,
}) {
  return {
    exportedAt: new Date().toISOString(),
    exportVersion: "1.0",
    user: {
      displayName: user?.displayName || null,
      email: user?.email || null,
    },
    settings: {
      currency: currency || "INR",
    },
    expenses: Object.entries(allMonthsData || {}).flatMap(
      ([periodKey, monthData]) => {
        const exps = monthData?.expenses || [];
        return exps.map((e) => ({
          date: e.date,
          amount: e.amount,
          category: e.category,
          description: e.description || "",
          period: periodKey,
        }));
      },
    ),
    budgets: catBudgets || {},
    incomeSources: incomeSources || [],
    savingsGoals: savingsGoals || [],
    categories: categories || [],
  };
}

/**
 * Triggers a browser download of the given content as a file.
 * Works in all modern browsers including Safari.
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Reads all expense periods for a user from localStorage.
 * Returns { [periodKey]: { expenses, catBudgets, incomeSources, ... } }
 */
export function readAllPeriodsFromStorage(uid) {
  const prefix = `expense-tracker:${uid}:`;
  const result = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const periodKey = key.slice(prefix.length);
    // Only include standard YYYY-MM period keys, not custom ranges
    if (!/^\d{4}-\d{2}$/.test(periodKey)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      if (parsed) result[periodKey] = parsed;
    } catch {
      // ignore malformed entries
    }
  }
  return result;
}
