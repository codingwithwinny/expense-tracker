// src/lib/currencies.js
// Comprehensive list of supported currencies with their details

export const SUPPORTED_CURRENCIES = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    locale: 'en-US',
    flag: '🇺🇸',
    maxAmount: 10000000
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    locale: 'en-EU',
    flag: '🇪🇺',
    maxAmount: 10000000
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    locale: 'en-GB',
    flag: '🇬🇧',
    maxAmount: 10000000
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    locale: 'en-IN',
    flag: '🇮🇳',
    maxAmount: 10000000
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    locale: 'en-CA',
    flag: '🇨🇦',
    maxAmount: 10000000
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    locale: 'en-AU',
    flag: '🇦🇺',
    maxAmount: 10000000
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    locale: 'ja-JP',
    flag: '🇯🇵',
    maxAmount: 1000000000
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    locale: 'zh-CN',
    flag: '🇨🇳',
    maxAmount: 100000000
  },
  {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    locale: 'en-SG',
    flag: '🇸🇬',
    maxAmount: 10000000
  },
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    locale: 'ar-AE',
    flag: '🇦🇪',
    maxAmount: 10000000
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'ر.س',
    locale: 'ar-SA',
    flag: '🇸🇦',
    maxAmount: 10000000
  },
  {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    locale: 'pt-BR',
    flag: '🇧🇷',
    maxAmount: 10000000
  },
  {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: '$',
    locale: 'es-MX',
    flag: '🇲🇽',
    maxAmount: 10000000
  },
  {
    code: 'KRW',
    name: 'South Korean Won',
    symbol: '₩',
    locale: 'ko-KR',
    flag: '🇰🇷',
    maxAmount: 10000000000
  },
  {
    code: 'THB',
    name: 'Thai Baht',
    symbol: '฿',
    locale: 'th-TH',
    flag: '🇹🇭',
    maxAmount: 10000000
  }
];

// Get currency by code
export const getCurrencyByCode = (code) => {
  return SUPPORTED_CURRENCIES.find(currency => currency.code === code) || SUPPORTED_CURRENCIES[0];
};

// Get default currency (USD for international users)
export const getDefaultCurrency = () => {
  return SUPPORTED_CURRENCIES[0]; // USD
};

// Get popular currencies for quick selection
export const getPopularCurrencies = () => {
  const popularCodes = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'];
  return SUPPORTED_CURRENCIES.filter(currency => popularCodes.includes(currency.code));
};
