import React, { useState } from 'react';

const ExpenseForm = ({ onClose, onExpenseAdded }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    date: '',
    currency: 'USD',
    exchangeRate: '1.0'
  });
  const [loadingRate, setLoadingRate] = useState(false);
  const [error, setError] = useState(null);

  const fetchExchangeRate = async (currency) => {
    if (currency === 'USD') {
      setFormData(prev => ({ ...prev, exchangeRate: '1.0' }));
      return;
    }

    setLoadingRate(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/expenses/exchange-rates/${currency}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setFormData(prev => ({ ...prev, exchangeRate: data.rate.toString() }));
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    } finally {
      setLoadingRate(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-fetch exchange rate when currency changes
    if (name === 'currency') {
      fetchExchangeRate(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          exchangeRate: parseFloat(formData.exchangeRate) // Ensure it's a number
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const expense = await response.json();
      onExpenseAdded(expense);
      setFormData({
        amount: '',
        description: '',
        category: '',
        date: '',
        currency: 'USD',
        exchangeRate: '1.0'
      });
      onClose();
    } catch (error) {
      console.error('Error creating expense:', error);
      setError('Failed to create expense');
    }
  };

  return (
    <div className="expense-form-overlay">
      <div className="expense-form">
        <h2>Add Expense</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="amount">Amount:</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category:</label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date:</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="currency">Currency:</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              required
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="exchangeRate">
              Exchange Rate to USD:
              {loadingRate && <span className="loading-spinner">Loading...</span>}
            </label>
            <input
              type="number"
              id="exchangeRate"
              name="exchangeRate"
              value={formData.exchangeRate}
              onChange={handleChange}
              step="0.0001"
              min="0.0001"
              required
              disabled={loadingRate}
            />
            <small className="form-hint">
              Current exchange rate (automatically updated)
            </small>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Add Expense
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;