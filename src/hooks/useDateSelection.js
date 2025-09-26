// src/hooks/useDateSelection.js
import { useState, useEffect } from "react";
import { monthKey } from "@/lib/utils";

/**
 * Custom hook to persist date selection state (selectedMonth and customDateRange)
 * across page refreshes and app sessions
 */
export default function useDateSelection() {
  // Initialize with localStorage values if available, otherwise defaults
  const getInitialSelectedMonth = () => {
    try {
      return (
        localStorage.getItem("expense-tracker:selectedMonth") || monthKey()
      );
    } catch {
      return monthKey();
    }
  };

  const getInitialCustomDateRange = () => {
    try {
      const saved = localStorage.getItem("expense-tracker:customDateRange");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.start && parsed.end) {
          return parsed;
        }
      }
    } catch {
      // Fall through to default
    }
    return {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10),
    };
  };

  const [selectedMonth, setSelectedMonth] = useState(getInitialSelectedMonth);
  const [customDateRange, setCustomDateRange] = useState(
    getInitialCustomDateRange
  );

  // Log initial state on mount
  useEffect(() => {
    console.log("useDateSelection initialized with:", {
      selectedMonth,
      customDateRange,
    });
  }, []);

  // Persist selectedMonth changes
  useEffect(() => {
    localStorage.setItem("expense-tracker:selectedMonth", selectedMonth);
    console.log("Saved selectedMonth:", selectedMonth);
  }, [selectedMonth]);

  // Persist customDateRange changes
  useEffect(() => {
    localStorage.setItem(
      "expense-tracker:customDateRange",
      JSON.stringify(customDateRange)
    );
    console.log("Saved customDateRange:", customDateRange);
  }, [customDateRange]);

  return {
    selectedMonth,
    setSelectedMonth,
    customDateRange,
    setCustomDateRange,
  };
}
