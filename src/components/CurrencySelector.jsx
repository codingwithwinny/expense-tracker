import React, { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/hooks/useCurrency.jsx";
import { Check, Globe, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CurrencySelector() {
  const { selectedCurrency, changeCurrency, supportedCurrencies } =
    useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 640);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen && !isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, isMobile]);

  // Lock body scroll on mobile sheet
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isOpen]);

  const popularCodes = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"];
  const popularCurrencies = supportedCurrencies.filter((c) =>
    popularCodes.includes(c.code),
  );
  const otherCurrencies = supportedCurrencies.filter(
    (c) => !popularCodes.includes(c.code),
  );

  function handleSelect(code) {
    changeCurrency(code);
    setIsOpen(false);
  }

  const CurrencyContent = () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">Popular</p>
        <div className="grid grid-cols-2 gap-2">
          {popularCurrencies.map((currency) => {
            const isSelected = selectedCurrency.code === currency.code;
            return (
              <button
                key={currency.code}
                onClick={() => handleSelect(currency.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  isSelected
                    ? "bg-indigo-500 border-indigo-500 text-white"
                    : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
                }`}
              >
                <span>{currency.flag}</span>
                <span className="flex-1 text-left">{currency.code}</span>
                {isSelected && <Check className="h-3 w-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">
          Other Currencies
        </p>
        <select
          value={selectedCurrency.code}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full h-9 px-3 rounded-xl border border-white/10 bg-[#252a3d] text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
        >
          {otherCurrencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.flag} {currency.code} — {currency.name}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2 border-t border-white/10">
        <p className="text-xs text-gray-400">
          Using:{" "}
          <span className="font-medium text-gray-200">
            {selectedCurrency.flag} {selectedCurrency.name}
          </span>
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Wrapper — keeps trigger + dropdown together for desktop */}
      <div className="relative" ref={containerRef}>
        {/* Trigger button */}
        <button
          onClick={() => setIsOpen((o) => !o)}
          className="h-9 px-3 rounded-full border text-sm flex items-center gap-1.5 transition-colors bg-white/70 border-gray-200/60 text-gray-600 hover:bg-white"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {selectedCurrency.flag} {selectedCurrency.code}
          </span>
          <span className="sm:hidden">{selectedCurrency.flag}</span>
        </button>

        {/* Desktop dropdown — anchored to container */}
        {!isMobile && (
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-72 z-50 bg-[#1e2235] border border-white/10 rounded-2xl shadow-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-100">
                    Select Currency
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CurrencyContent />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Mobile bottom sheet — outside the relative container so it covers full screen */}
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-[#1e2235] border-t border-white/10 rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto"
              >
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
                <div className="flex items-center justify-between mb-4">
                  <p className="text-base font-semibold text-gray-100">
                    Select Currency
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-200 p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <CurrencyContent />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
