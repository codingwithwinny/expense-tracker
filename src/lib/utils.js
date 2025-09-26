// Multi-currency format function
export const fmt = (n, currency = 'INR', locale = 'en-IN') => {
  if (isNaN(n)) {
    // Return default symbol for the currency
    const symbols = {
      'USD': '$0',
      'EUR': '€0',
      'GBP': '£0',
      'INR': '₹0',
      'CAD': 'C$0',
      'AUD': 'A$0',
      'JPY': '¥0',
      'CNY': '¥0',
      'SGD': 'S$0',
      'AED': 'د.إ0',
      'SAR': 'ر.س0',
      'BRL': 'R$0',
      'MXN': '$0',
      'KRW': '₩0',
      'THB': '฿0'
    };
    return symbols[currency] || '₹0';
  }

  return Number(n).toLocaleString(locale, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
  });
};

// Legacy INR format for backward compatibility
export const fmtINR = (n) => fmt(n, 'INR', 'en-IN');

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
