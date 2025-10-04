import { convertCurrency, DEFAULT_COMPANY_CURRENCY } from '../utils/currencies.js';

export class CurrencyService {
  static async getExchangeRates() {
    // In production, fetch from a real API
    // For now, return mock data
    return Promise.resolve({
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
    });
  }

  static convertToCompanyCurrency(amount, fromCurrency, companyCurrency = DEFAULT_COMPANY_CURRENCY) {
    return convertCurrency(amount, fromCurrency, companyCurrency);
  }

  static async updateExpenseWithConversion(expense) {
    const companyCurrency = DEFAULT_COMPANY_CURRENCY; // Get from company settings
    
    if (expense.currency !== companyCurrency) {
      expense.convertedAmount = this.convertToCompanyCurrency(
        expense.amount, 
        expense.currency, 
        companyCurrency
      );
      expense.companyCurrency = companyCurrency;
    } else {
      expense.convertedAmount = expense.amount;
      expense.companyCurrency = expense.currency;
    }
    
    return expense;
  }
}
