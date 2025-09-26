// src/components/CurrencySelector.jsx
import React, { useState } from "react";
import { useCurrency } from "@/hooks/useCurrency.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Check } from "lucide-react";

export default function CurrencySelector() {
  const { selectedCurrency, changeCurrency, supportedCurrencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const popularCurrencies = supportedCurrencies.filter(currency => 
    ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'].includes(currency.code)
  );

  const otherCurrencies = supportedCurrencies.filter(currency => 
    !['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'].includes(currency.code)
  );

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 h-8"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{selectedCurrency.flag} {selectedCurrency.code}</span>
        <span className="sm:hidden">{selectedCurrency.flag}</span>
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50">
          <Card className="shadow-lg border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select Currency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Popular Currencies */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-2">Popular</h4>
                <div className="grid grid-cols-2 gap-2">
                  {popularCurrencies.map((currency) => (
                    <Button
                      key={currency.code}
                      variant={selectedCurrency.code === currency.code ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        changeCurrency(currency.code);
                        setIsOpen(false);
                      }}
                      className="justify-start gap-2 h-8 text-xs"
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

              {/* Other Currencies */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-2">Other Currencies</h4>
                <Select
                  value={selectedCurrency.code}
                  onValueChange={(value) => {
                    changeCurrency(value);
                    setIsOpen(false);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherCurrencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          <span>{currency.flag}</span>
                          <span>{currency.code} - {currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  Currently using: <strong>{selectedCurrency.flag} {selectedCurrency.name}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
