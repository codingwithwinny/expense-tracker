// src/hooks/useCurrency.js
import { useState, useEffect, createContext, useContext } from "react";
import { SUPPORTED_CURRENCIES, getCurrencyByCode } from "@/lib/currencies";

const CurrencyContext = createContext();

const INDIA_TIMEZONES = new Set(["Asia/Kolkata", "Asia/Calcutta"]);
const INDIA_LANG_RE = /^(hi|ta|te|kn|ml|mr|bn|gu|pa|ur|as|or|en-IN|hi-IN|ta-IN|te-IN)$/i;

function resolveInitialCurrency() {
  // Honour an existing user preference — never overwrite a manual choice
  try {
    const saved = localStorage.getItem("expense-tracker:currency");
    if (saved) {
      const currency = getCurrencyByCode(saved);
      if (currency) return currency;
    }
  } catch (_) {}

  // Timezone is the strongest signal
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (INDIA_TIMEZONES.has(tz)) return getCurrencyByCode("INR");
  } catch (_) {}

  // Language fallback
  try {
    const lang = navigator.language || "";
    if (INDIA_LANG_RE.test(lang) || lang.endsWith("-IN")) return getCurrencyByCode("INR");
  } catch (_) {}

  return getCurrencyByCode("USD");
}

export function CurrencyProvider({ children }) {
  // Runs synchronously — first render already has the right currency (no flash)
  const [selectedCurrency, setSelectedCurrency] = useState(resolveInitialCurrency);

  // Persist manual currency changes
  useEffect(() => {
    localStorage.setItem("expense-tracker:currency", selectedCurrency.code);
  }, [selectedCurrency]);

  const changeCurrency = (currencyCode) => {
    const currency = getCurrencyByCode(currencyCode);
    if (currency) {
      setSelectedCurrency(currency);
    }
  };

  return (
    <CurrencyContext.Provider value={{
      selectedCurrency,
      changeCurrency,
      supportedCurrencies: SUPPORTED_CURRENCIES
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Hook to use currency context
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
