const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const { authenticate, authorize, canApprove, sameCompany } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { deleteImage, getOptimizedUrl } = require('../config/cloudinary');
const currencyService = require('../services/currencyService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// @route   POST /api/expenses
// @desc    Create new expense
// @access  Private (Employee, Manager)
router.post('/', 
  authorize('employee', 'manager'),
  upload.single('receipt'),
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('originalCurrency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('convertedAmount').isFloat({ min: 0.01 }).withMessage('Converted amount must be greater than 0'),
    body('baseCurrency').isLength({ min: 3, max: 3 }).withMessage('Base currency must be 3 characters'),
    body('category').isIn(['Travel', 'Meals', 'Office Supplies', 'Equipment', 'Software', 'Marketing', 'Training', 'Other']).withMessage('Invalid category'),
    body('description').trim().isLength({ min: 5, max: 200 }).withMessage('Description must be 5-200 characters'),
    body('date').isISO8601().withMessage('Invalid date format')
  ],
  async (req, res) => {
    try {
      // Check for validation errors first
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const {
        amount,
        originalCurrency,
        convertedAmount,
        baseCurrency,
        category,
        description,
        date
      } = req.body;

      console.log('Creating expense with data:', {
        amount,
        originalCurrency,
        convertedAmount,
        baseCurrency,
        category,
        description,
        date,
        hasFile: !!req.file
      });

      // Handle receipt upload if present
      let receiptData = null;
      if (req.file) {
        try {
          // Custom Cloudinary upload handling
          const cloudinary = require('../config/cloudinary');
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'expense-receipts',
            resource_type: 'image',
            transformation: [
              { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
            ]
          });

          receiptData = {
            publicId: result.public_id,
            url: result.secure_url,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
          };

          // Clean up temp file
          const fs = require('fs');
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          // Continue without receipt - don't fail the entire expense
          console.log('Continuing expense creation without receipt due to upload failure');
        }
      }

      // Get company approval rules
      const company = await Company.findById(req.user.company._id);
      if (!company) {
        return res.status(404).json({ 
          success: false,
          message: 'Company not found' 
        });
      }

      // Determine initial approver based on amount and approval rules
      let currentApprover = null;
      let approvalLevel = 0;

      if (company.approvalRules?.sequential && company.approvalRules?.thresholds?.length > 0) {
        // Find the appropriate approval level based on amount
        const sortedThresholds = company.approvalRules.thresholds.sort((a, b) => a.amount - b.amount);
        
        for (const threshold of sortedThresholds) {
          if (parseFloat(convertedAmount) >= threshold.amount) {
            // Find a user with the required role
            const approver = await User.findOne({
              company: req.user.company._id,
              role: threshold.role,
              status: 'active',
              _id: { $ne: req.user._id } // Don't assign to self
            });
            
            if (approver) {
              currentApprover = approver._id;
              break;
            }
          }
        }
      }

      // Create expense
      const expense = new Expense({
        amount: parseFloat(amount),
        originalCurrency: originalCurrency.toUpperCase(),
        convertedAmount: parseFloat(convertedAmount),
        baseCurrency: baseCurrency.toUpperCase(),
        category,
        description,
        date: new Date(date),
        submittedBy: req.user._id,
        company: req.user.company._id,
        currentApprover,
        approvalLevel,
        receiptData,
        receiptUrl: receiptData ? receiptData.url : null
      });

      await expense.save();
      await expense.populate(['submittedBy', 'currentApprover']);

      console.log('Expense created successfully:', expense._id);

      res.status(201).json({
        success: true,
        expense,
        message: 'Expense submitted successfully'
      });
    } catch (error) {
      console.error('Create expense error:', error);
      
      // Provide specific error messages
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid data format',
          error: error.message
        });
      }

      res.status(500).json({ 
        success: false,
        message: 'Server error creating expense',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// @route   GET /api/expenses
// @desc    Get user's expenses
// @access  Private
router.get('/', sameCompany, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, category, startDate, endDate } = req.query;
    
    const query = { 
      ...req.companyFilter,
      submittedBy: req.user._id 
    };

    // Add filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('submittedBy', 'name email')
        .populate('currentApprover', 'name email')
        .populate('approvals.approver', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(query)
    ]);

    res.json({
      success: true,
      expenses,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Server error fetching expenses' });
  }
});

// @route   GET /api/expenses/recent
// @desc    Get recent expenses for dashboard
// @access  Private
router.get('/recent', sameCompany, async (req, res) => {
  try {
    console.log('Fetching recent expenses for user:', req.user._id);
    
    const query = {
      company: req.user.company._id,
      submittedBy: req.user._id
    };

    const expenses = await Expense.find(query)
      .populate('submittedBy', 'name email')
      .populate('currentApprover', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(); // Use lean for better performance

    console.log('Recent expenses found:', expenses.length);

    // Ensure consistent response format
    const formattedExpenses = expenses.map(expense => ({
      ...expense,
      // Ensure required fields exist
      amount: expense.amount || 0,
      convertedAmount: expense.convertedAmount || expense.amount || 0,
      originalCurrency: expense.originalCurrency || expense.currency || 'USD',
      baseCurrency: expense.baseCurrency || 'USD',
      status: expense.status || 'pending',
      category: expense.category || 'Other',
      description: expense.description || 'No description',
      date: expense.date || expense.createdAt
    }));

    res.json(formattedExpenses);
  } catch (error) {
    console.error('Get recent expenses error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching recent expenses',
      data: []
    });
  }
});

// @route   GET /api/expenses/approvals
// @desc    Get expenses pending approval (for managers/admins)
// @access  Private (Manager, Admin)
router.get('/approvals', authorize('manager', 'admin'), async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    
    let query = {};

    if (status === 'pending') {
      // Show expenses that need approval from this user
      query.$or = [
        { currentApprover: req.user._id },
        // Admins can see all pending expenses
        ...(req.user.role === 'admin' ? [{ status: 'pending' }] : [])
      ];
    } else {
      query.status = status;
      // Managers can only see expenses they've approved/rejected or from their department
      if (req.user.role === 'manager') {
        query.$or = [
          { 'approvals.approver': req.user._id },
          { department: req.user.department }
        ];
      }
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('submittedBy', 'name email role department')
        .populate('currentApprover', 'name email')
        .populate('approvals.approver', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(query)
    ]);

    res.json(expenses);
  } catch (error) {
    console.error('Get approval expenses error:', error);
    res.status(500).json({ message: 'Server error fetching approval expenses' });
  }
});

// @route   POST /api/expenses/:id/approve
// @desc    Approve or reject expense
// @access  Private (Manager, Admin)
router.post('/:id/approve',
  authorize('manager', 'admin'),
  [
    param('id').isMongoId().withMessage('Invalid expense ID'),
    body('action').isIn(['approved', 'rejected']).withMessage('Action must be approved or rejected'),
    body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { action, comment } = req.body;
      const expenseId = req.params.id;

      const expense = await Expense.findById(expenseId)
        .populate('submittedBy', 'name email department');

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      if (expense.status !== 'pending') {
        return res.status(400).json({ message: 'Expense is not pending approval' });
      }

      // Check if user can approve this expense
      const canApproveExpense = 
        expense.currentApprover?.toString() === req.user._id.toString() ||
        req.user.role === 'admin' ||
        (req.user.role === 'manager' && expense.submittedBy.department === req.user.department);

      if (!canApproveExpense) {
        return res.status(403).json({ message: 'You are not authorized to approve this expense' });
      }

      // Add approval record
      expense.approvals.push({
        approver: req.user._id,
        status: action,
        comment: comment || '',
        date: new Date()
      });

      if (action === 'rejected') {
        expense.status = 'rejected';
        expense.rejectionReason = comment;
        expense.currentApprover = null;
      } else {
        expense.status = 'approved';
        expense.currentApprover = null;
      }

      await expense.save();
      await expense.populate(['submittedBy', 'currentApprover', 'approvals.approver']);

      res.json({
        success: true,
        expense,
        message: `Expense ${action} successfully`
      });
    } catch (error) {
      console.error('Approve expense error:', error);
      res.status(500).json({ message: 'Server error processing approval' });
    }
  }
);

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Private
router.get('/:id',
  [param('id').isMongoId().withMessage('Invalid expense ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const expense = await Expense.findOne({
        _id: req.params.id,
        company: req.user.company._id
      })
        .populate('submittedBy', 'name email role')
        .populate('currentApprover', 'name email role')
        .populate('approvals.approver', 'name email role');

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      // Check access rights
      const canView = 
        expense.submittedBy._id.toString() === req.user._id.toString() ||
        expense.currentApprover?._id.toString() === req.user._id.toString() ||
        expense.approvals.some(approval => approval.approver._id.toString() === req.user._id.toString()) ||
        ['manager', 'admin'].includes(req.user.role);

      if (!canView) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({
        success: true,
        expense
      });
    } catch (error) {
      console.error('Get expense error:', error);
      res.status(500).json({ message: 'Server error fetching expense' });
    }
  }
);

// @route   GET /api/expenses/:id/receipt
// @desc    Get optimized receipt image
// @access  Private
router.get('/:id/receipt',
  [param('id').isMongoId().withMessage('Invalid expense ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const expense = await Expense.findOne({
        _id: req.params.id,
        company: req.user.company._id
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      // Check access rights
      const canView = 
        expense.submittedBy.toString() === req.user._id.toString() ||
        expense.currentApprover?.toString() === req.user._id.toString() ||
        expense.approvals.some(approval => approval.approver.toString() === req.user._id.toString()) ||
        ['manager', 'admin'].includes(req.user.role);

      if (!canView) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!expense.receiptData?.publicId) {
        return res.status(404).json({ message: 'Receipt not found' });
      }

      // Generate optimized URL based on query parameters
      const { width, height, quality } = req.query;
      const options = {};
      
      if (width) options.width = parseInt(width);
      if (height) options.height = parseInt(height);
      if (quality) options.quality = quality;

      const optimizedUrl = getOptimizedUrl(expense.receiptData.publicId, options);

      res.json({
        success: true,
        url: optimizedUrl,
        originalUrl: expense.receiptUrl
      });
    } catch (error) {
      console.error('Get receipt error:', error);
      res.status(500).json({ message: 'Server error fetching receipt' });
    }
  }
);

// @route   DELETE /api/expenses/:id
// @desc    Delete expense (only if pending and own expense)
// @access  Private
router.delete('/:id',
  [param('id').isMongoId().withMessage('Invalid expense ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const expense = await Expense.findOne({
        _id: req.params.id,
        company: req.user.company._id,
        submittedBy: req.user._id
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      if (expense.status !== 'pending') {
        return res.status(400).json({ message: 'Can only delete pending expenses' });
      }

      // Delete receipt from Cloudinary if exists
      if (expense.receiptData?.publicId) {
        try {
          await deleteImage(expense.receiptData.publicId);
        } catch (deleteError) {
          console.error('Error deleting from Cloudinary:', deleteError);
          // Continue with expense deletion even if Cloudinary cleanup fails
        }
      }

      await Expense.findByIdAndDelete(expense._id);
      res.json({
        success: true,
        message: 'Expense deleted successfully'
      });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({ message: 'Server error deleting expense' });
    }
  }
);

// Add endpoint to get current exchange rates
router.get('/exchange-rates/:currency', authenticate, async (req, res) => {
  try {
    const { currency } = req.params;
    const rate = await currencyService.getExchangeRate(currency, 'USD');
    res.json({ currency, rate, toCurrency: 'USD' });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
});

module.exports = router;


