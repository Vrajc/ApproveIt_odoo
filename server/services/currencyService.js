const axios = require('axios');

const FAMOUS_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CNY', 'CHF', 'SGD'];

// Cache for exchange rates (in production, use Redis)
let exchangeRatesCache = {
  rates: {
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
  },
  lastUpdated: new Date()
};

class CurrencyService {
  // Get all supported currencies
  getSupportedCurrencies() {
    return FAMOUS_CURRENCIES;
  }

  // Get exchange rate from one currency to another
  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;

    try {
      await this.updateExchangeRates();
      
      const fromRate = exchangeRatesCache.rates[fromCurrency];
      const toRate = exchangeRatesCache.rates[toCurrency];
      
      if (!fromRate || !toRate) {
        throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
      }
      
      // Convert via USD
      return toRate / fromRate;
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      // Return cached rate or fallback
      return exchangeRatesCache.rates[toCurrency] / exchangeRatesCache.rates[fromCurrency] || 1;
    }
  }

  // Convert amount from one currency to another
  async convertCurrency(amount, fromCurrency, toCurrency) {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  // Update exchange rates (call external API)
  async updateExchangeRates() {
    try {
      // Check if rates are still fresh (update every hour)
      const now = new Date();
      const hoursSinceUpdate = (now - exchangeRatesCache.lastUpdated) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 1) {
        return exchangeRatesCache.rates;
      }

      // In production, use a real API like:
      // const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/USD`);
      // const rates = response.data.rates;
      
      // For now, simulate API call with mock data
      const rates = {
        USD: 1,
        EUR: 0.85 + (Math.random() - 0.5) * 0.02, // Small random variation
        GBP: 0.73 + (Math.random() - 0.5) * 0.02,
        INR: 83.12 + (Math.random() - 0.5) * 2,
        JPY: 149.50 + (Math.random() - 0.5) * 5,
        CAD: 1.35 + (Math.random() - 0.5) * 0.05,
        AUD: 1.52 + (Math.random() - 0.5) * 0.05,
        CNY: 7.24 + (Math.random() - 0.5) * 0.2,
        CHF: 0.88 + (Math.random() - 0.5) * 0.02,
        SGD: 1.34 + (Math.random() - 0.5) * 0.05
      };

      exchangeRatesCache = {
        rates,
        lastUpdated: now
      };

      return rates;
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
      return exchangeRatesCache.rates;
    }
  }

  // Get all current exchange rates
  async getAllRates() {
    await this.updateExchangeRates();
    return {
      rates: exchangeRatesCache.rates,
      lastUpdated: exchangeRatesCache.lastUpdated,
      supportedCurrencies: FAMOUS_CURRENCIES
    };
  }

  // Format currency amount
  formatCurrency(amount, currencyCode) {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      CNY: '¥',
      CHF: 'CHF',
      SGD: 'S$'
    };

    const symbol = symbols[currencyCode] || currencyCode;
    return `${symbol} ${amount.toFixed(2)}`;
  }
}

module.exports = new CurrencyService();
