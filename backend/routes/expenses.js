const express = require('express');
const multer = require('multer');
const { requireRole, canApprove } = require('../middleware/roleAuth');
const Expense = require('../models/Expense');
const ApprovalRule = require('../models/ApprovalRule');
const ocrService = require('../services/ocrService');
const approvalService = require('../services/approvalService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Employee: Submit expense with OCR receipt
router.post('/submit', requireRole(['employee']), upload.single('receipt'), async (req, res) => {
  try {
    const { amount, currency, category, description, expenseDate } = req.body;
    
    let receiptData = null;
    if (req.file) {
      // Process OCR
      const ocrResult = await ocrService.extractReceiptData(req.file.path);
      receiptData = {
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        ocrData: ocrResult
      };
    }

    const expense = new Expense({
      employeeId: req.user._id,
      amount,
      currency: currency || 'USD',
      category,
      description,
      expenseDate,
      receipt: receiptData
    });

    // Set up approval flow based on rules
    const approvalFlow = await approvalService.setupApprovalFlow(expense, req.user);
    expense.approvalFlow = approvalFlow;

    await expense.save();
    await approvalService.notifyNextApprover(expense);

    res.status(201).json({ 
      message: 'Expense submitted successfully', 
      expense,
      ocrData: receiptData?.ocrData 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Employee: View own expense history
router.get('/my-expenses', requireRole(['employee']), async (req, res) => {
  try {
    const expenses = await Expense.find({ employeeId: req.user._id })
      .populate('approvalFlow.approverId', 'name role')
      .sort({ createdAt: -1 });
    
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manager/Admin: View pending approvals
router.get('/pending-approvals', requireRole(['manager', 'admin', 'finance', 'director']), async (req, res) => {
  try {
    const expenses = await approvalService.getPendingApprovals(req.user);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manager/Admin: Approve/Reject expense
router.post('/:expenseId/approve', canApprove, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    
    const result = await approvalService.processApproval(expenseId, req.user, action, comments);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: View all expenses dashboard
router.get('/dashboard', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, status, department } = req.query;
    
    let filter = {};
    if (startDate && endDate) {
      filter.expenseDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status) filter.status = status;
    
    const expenses = await Expense.find(filter)
      .populate('employeeId', 'name department')
      .populate('approvalFlow.approverId', 'name role')
      .sort({ createdAt: -1 });
    
    // Calculate statistics
    const stats = await approvalService.getExpenseStatistics(filter);
    
    res.json({ expenses, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
