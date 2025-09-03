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

// Enhanced period key generation
export const periodKey = (startDate, endDate) => {
  if (!startDate || !endDate) {
    // Fallback to month key for backward compatibility
    return monthKey();
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Create a unique key for the custom period
  return `custom-${start.toISOString().slice(0, 10)}-${end
    .toISOString()
    .slice(0, 10)}`;
};

// Helper to check if a date falls within a period
export const isDateInPeriod = (date, startDate, endDate) => {
  const checkDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return checkDate >= start && checkDate <= end;
};

// Helper to get the current period key based on selection
export const getCurrentPeriodKey = (selectedMonth, customDateRange) => {
  if (
    selectedMonth === "custom" &&
    customDateRange.start &&
    customDateRange.end
  ) {
    return periodKey(customDateRange.start, customDateRange.end);
  }
  return selectedMonth;
};
