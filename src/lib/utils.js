// INR currency format
export const fmt = (n) =>
  isNaN(n)
    ? "₹0"
    : Number(n).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      });

export const monthKey = (d) => {
  const dt = d ? new Date(d) : new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

export function buildCSV(rows) {
  // very small/robust CSV: quote fields containing comma or newline
  const esc = (s) => {
    const str = String(s ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    // NOTE: We deliberately allow commas inside quoted fields,
    // but we replaced commas in descriptions before generating CSV.
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}