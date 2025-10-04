const express = require('express');
const currencyService = require('../services/currencyService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/currency/rates
// @desc    Get all exchange rates
// @access  Private
router.get('/rates', async (req, res) => {
  try {
    const rates = await currencyService.getAllRates();
    res.json({
      success: true,
      ...rates
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates'
    });
  }
});

// @route   GET /api/currency/convert
// @desc    Convert currency amount
// @access  Private
router.get('/convert', async (req, res) => {
  try {
    const { amount, from, to } = req.query;

    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Amount, from, and to currencies are required'
      });
    }

    const convertedAmount = await currencyService.convertCurrency(
      parseFloat(amount),
      from.toUpperCase(),
      to.toUpperCase()
    );

    const rate = await currencyService.getExchangeRate(from.toUpperCase(), to.toUpperCase());

    res.json({
      success: true,
      originalAmount: parseFloat(amount),
      convertedAmount,
      fromCurrency: from.toUpperCase(),
      toCurrency: to.toUpperCase(),
      exchangeRate: rate
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency'
    });
  }
});

// @route   GET /api/currency/supported
// @desc    Get supported currencies
// @access  Private
router.get('/supported', (req, res) => {
  try {
    const currencies = currencyService.getSupportedCurrencies();
    res.json({
      success: true,
      currencies
    });
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supported currencies'
    });
  }
});

module.exports = router;
