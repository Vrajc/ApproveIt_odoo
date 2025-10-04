const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { authenticate, authorize, checkDepartmentAccess } = require('../middleware/auth');

// Get all expenses (Admin and Manager access)
router.get('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    let query = {};
    
    // If manager, filter by department
    if (req.user.role === 'manager') {
      query.department = req.user.department;
    }

    const expenses = await Expense.find(query)
      .populate('userId', 'name email department')
      .sort({ createdAt: -1 });
    
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Get expenses by department (Manager and Admin access)
router.get('/department/:department', authenticate, authorize('admin', 'manager'), checkDepartmentAccess, async (req, res) => {
  try {
    const { department } = req.params;
    
    const expenses = await Expense.find({ department })
      .populate('userId', 'name email department')
      .sort({ createdAt: -1 });
    
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch department expenses' });
  }
});

// Approve/Reject expense (Admin and Manager access)
router.patch('/:id/status', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { status, comments } = req.body;
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Manager can only approve expenses from their department
    if (req.user.role === 'manager' && expense.department !== req.user.department) {
      return res.status(403).json({ message: 'Cannot approve expenses from other departments' });
    }

    expense.status = status;
    expense.approvedBy = req.user._id;
    expense.approvedAt = new Date();
    if (comments) expense.comments = comments;

    await expense.save();
    
    const updatedExpense = await Expense.findById(expense._id)
      .populate('userId', 'name email department')
      .populate('approvedBy', 'name email');
    
    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update expense status' });
  }
});

module.exports = router;