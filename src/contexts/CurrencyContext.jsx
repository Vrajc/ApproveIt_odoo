import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

// Famous currencies with symbols
const FAMOUS_CURRENCIES = [
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

// Default exchange rates - will be updated from API
const DEFAULT_EXCHANGE_RATES = {
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

export const CurrencyProvider = ({ children }) => {
  const [currencies] = useState(FAMOUS_CURRENCIES);
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_EXCHANGE_RATES);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);

  // Fetch exchange rates from API
  const fetchExchangeRates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (token) {
        const response = await axios.get('/api/currency/rates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success && response.data.rates) {
          setExchangeRates(response.data.rates);
        }
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      // Continue with default rates
    } finally {
      setLoading(false);
    }
  };

  const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    
    try {
      // Try API conversion first
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/currency/convert', {
          params: { amount, from: fromCurrency, to: toCurrency },
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success) {
          return response.data.convertedAmount;
        }
      }
    } catch (error) {
      console.error('API conversion failed, using fallback:', error);
    }
    
    // Fallback to local conversion
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
      console.warn(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
      return amount;
    }
    
    // Convert via USD
    const usdAmount = amount / exchangeRates[fromCurrency];
    return usdAmount * exchangeRates[toCurrency];
  };

  const formatCurrency = (amount, currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || currencyCode;
    
    // Format number with proper locale
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${symbol} ${formatter.format(amount)}`;
  };

  const getCurrencySymbol = (currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  useEffect(() => {
    fetchExchangeRates();
    // Update rates every hour in production
    const interval = setInterval(fetchExchangeRates, 3600000);
    return () => clearInterval(interval);
  }, []);

  const value = {
    currencies,
    exchangeRates,
    baseCurrency,
    setBaseCurrency,
    loading,
    convertCurrency,
    formatCurrency,
    getCurrencySymbol,
    refreshRates: fetchExchangeRates
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
