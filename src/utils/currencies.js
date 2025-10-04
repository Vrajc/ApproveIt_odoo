export const FAMOUS_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' }
];

export const DEFAULT_COMPANY_CURRENCY = 'USD';

// Mock exchange rates - in production, fetch from API like exchangerate-api.com
export const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.73,
  INR: 83.12,
  JPY: 149.50,
  CAD: 1.35,
  AUD: 1.52,
  CNY: 7.24,
  CHF: 0.88,
  SGD: 1.34
};

export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  
  const usdAmount = amount / EXCHANGE_RATES[fromCurrency];
  return usdAmount * EXCHANGE_RATES[toCurrency];
};

export const formatCurrency = (amount, currencyCode) => {
  const currency = FAMOUS_CURRENCIES.find(c => c.code === currencyCode);
  return `${currency?.symbol || currencyCode} ${amount.toFixed(2)}`;
};
