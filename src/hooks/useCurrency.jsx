// src/hooks/useCurrency.js
import { useState, useEffect, createContext, useContext } from "react";
import { SUPPORTED_CURRENCIES, getCurrencyByCode, getDefaultCurrency } from "@/lib/currencies";

// Create currency context
const CurrencyContext = createContext();

// Currency provider component
export function CurrencyProvider({ children }) {
  const [selectedCurrency, setSelectedCurrency] = useState(getDefaultCurrency());

  // Load currency preference from localStorage on mount
  useEffect(() => {
    try {
      const savedCurrencyCode = localStorage.getItem("expense-tracker:currency");
      if (savedCurrencyCode) {
        const currency = getCurrencyByCode(savedCurrencyCode);
        if (currency) {
          setSelectedCurrency(currency);
        }
      }
    } catch (error) {
      console.warn("Failed to load currency preference:", error);
    }
  }, []);

  // Save currency preference to localStorage when changed
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
