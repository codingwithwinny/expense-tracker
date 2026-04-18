import React, { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/hooks/useCurrency.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Globe } from "lucide-react";

export default function CurrencySelector({ dark = false }) {
  const { selectedCurrency, changeCurrency, supportedCurrencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const popularCodes = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"];
  const popularCurrencies = supportedCurrencies.filter((currency) =>
    popularCodes.includes(currency.code),
  );
  const otherCurrencies = supportedCurrencies.filter(
    (currency) => !popularCodes.includes(currency.code),
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`gap-2 h-8 ${
          dark ? "bg-[#252a3d] border-white/10 text-gray-200 hover:bg-white/10" : ""
        }`}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">
          {selectedCurrency.flag} {selectedCurrency.code}
        </span>
        <span className="sm:hidden">{selectedCurrency.flag}</span>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-2 w-80 z-50 sm:w-80 max-w-[calc(100vw-2rem)]">
          <Card
            className={`shadow-lg border max-h-[70vh] overflow-y-auto ${
              dark ? "bg-[#1e2235] border-white/10" : ""
            }`}
          >
            <CardHeader
              className={`pb-3 ${dark ? "bg-transparent border-white/10" : ""}`}
            >
              <CardTitle className={`text-sm font-medium ${dark ? "text-gray-100" : ""}`}>
                Select Currency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className={`text-xs font-medium mb-2 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                  Popular
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {popularCurrencies.map((currency) => (
                    <Button
                      key={currency.code}
                      variant={
                        selectedCurrency.code === currency.code ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        changeCurrency(currency.code);
                        setIsOpen(false);
                      }}
                      className={`justify-start gap-2 h-8 text-xs ${
                        dark && selectedCurrency.code !== currency.code
                          ? "bg-transparent border-white/10 text-gray-200 hover:bg-white/10"
                          : ""
                      }`}
                    >
                      <span>{currency.flag}</span>
                      <span className="flex-1 text-left">{currency.code}</span>
                      {selectedCurrency.code === currency.code && (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className={`text-xs font-medium mb-2 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                  Other Currencies
                </h4>
                <select
                  value={selectedCurrency.code}
                  onChange={(e) => {
                    changeCurrency(e.target.value);
                    setIsOpen(false);
                  }}
                  className={`w-full h-8 px-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    dark
                      ? "bg-[#252a3d] border-white/10 text-gray-200 [color-scheme:dark]"
                      : "bg-white border-gray-200 text-gray-700 [color-scheme:light]"
                  }`}
                >
                  {otherCurrencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.flag} {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`pt-2 border-t ${dark ? "border-white/10" : ""}`}>
                <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  Currently using:{" "}
                  <strong>
                    {selectedCurrency.flag} {selectedCurrency.name}
                  </strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
