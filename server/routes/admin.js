const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Company = require('../models/Company');
const User = require('../models/User');
const Expense = require('../models/Expense');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

// @route   GET /api/admin/company
// @desc    Get company settings
// @access  Private (Admin)
router.get('/company', async (req, res) => {
  try {
    const company = await Company.findById(req.user.company._id);
    
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: 'Company not found' 
      });
    }

    res.json({
      success: true,
      ...company.toObject()
    });
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching company settings' 
    });
  }
});

// @route   PUT /api/admin/company
// @desc    Update company settings
// @access  Private (Admin)
router.put('/company', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Company name is required and must be 1-100 characters'),
  body('baseCurrency').isLength({ min: 3, max: 3 }).withMessage('Base currency must be 3 characters'),
  body('approvalRules.thresholds').optional().isArray().withMessage('Thresholds must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const company = await Company.findById(req.user.company._id);
    
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: 'Company not found' 
      });
    }

    // Update company settings
    company.name = req.body.name;
    company.baseCurrency = req.body.baseCurrency;
    company.approvalRules = req.body.approvalRules;

    await company.save();

    res.json({
      success: true,
      message: 'Company settings updated successfully',
      company
    });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating company settings' 
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all company users
// @access  Private (Admin)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ 
      'company._id': req.user.company._id 
    })
    .select('-password')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching users' 
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private (Admin)
router.post('/users', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be 1-100 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  body('department').optional().trim().isLength({ max: 50 }).withMessage('Department cannot exceed 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, email, password, role, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department,
      company: req.user.company,
      status: 'active'
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error creating user' 
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/users/:id', [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  body('department').optional().trim().isLength({ max: 50 }).withMessage('Department cannot exceed 50 characters'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const userId = req.params.id;
    const updates = req.body;

    // Don't allow updating password through this route
    delete updates.password;

    const user = await User.findOneAndUpdate(
      { 
        _id: userId, 
        'company._id': req.user.company._id 
      },
      updates,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating user' 
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Toggle user status
// @access  Private (Admin)
router.put('/users/:id/status', [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const userId = req.params.id;
    const { status } = req.body;

    // Prevent admin from deactivating themselves
    if (userId === req.user._id.toString() && status === 'inactive') {
      return res.status(400).json({ 
        success: false,
        message: 'You cannot deactivate your own account' 
      });
    }

    const user = await User.findOneAndUpdate(
      { 
        _id: userId, 
        'company._id': req.user.company._id 
      },
      { status },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating user status' 
    });
  }
});

// @route   GET /api/admin/managers
// @desc    Get all managers and admins for approval rules
// @access  Private (Admin)
router.get('/managers', async (req, res) => {
  try {
    const managers = await User.find({ 
      'company._id': req.user.company._id,
      role: { $in: ['manager', 'admin'] },
      status: 'active'
    })
    .select('name email role department')
    .sort({ name: 1 });

    res.json({
      success: true,
      managers
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching managers' 
    });
  }
});

// @route   GET /api/admin/approval-rules
// @desc    Get all approval rules
// @access  Private (Admin)
router.get('/approval-rules', async (req, res) => {
  try {
    // For now, return empty array as we're managing rules through company settings
    // This can be expanded later for more complex rule management
    res.json({
      success: true,
      rules: []
    });
  } catch (error) {
    console.error('Get approval rules error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching approval rules' 
    });
  }
});

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin)
router.get('/stats', async (req, res) => {
  try {
    const companyId = req.user.company._id;

    const [
      totalUsers,
      activeUsers,
      totalExpenses,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      totalExpenseAmount
    ] = await Promise.all([
      User.countDocuments({ 'company._id': companyId }),
      User.countDocuments({ 'company._id': companyId, status: 'active' }),
      Expense.countDocuments({ company: companyId }),
      Expense.countDocuments({ company: companyId, status: 'pending' }),
      Expense.countDocuments({ company: companyId, status: 'approved' }),
      Expense.countDocuments({ company: companyId, status: 'rejected' }),
      Expense.aggregate([
        { $match: { company: companyId, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$convertedAmount' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        expenses: {
          total: totalExpenses,
          pending: pendingExpenses,
          approved: approvedExpenses,
          rejected: rejectedExpenses,
          totalAmount: totalExpenseAmount[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching statistics' 
    });
  }
});

// @route   POST /api/admin/override-approval/:expenseId
// @desc    Override expense approval (admin privilege)
// @access  Private (Admin)
router.post('/override-approval/:expenseId', [
  param('expenseId').isMongoId().withMessage('Invalid expense ID'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason is required and must be 1-500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { expenseId } = req.params;
    const { action, reason } = req.body;

    const expense = await Expense.findOne({
      _id: expenseId,
      company: req.user.company._id
    }).populate('submittedBy', 'name email');

    if (!expense) {
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found' 
      });
    }

    // Add admin override approval
    expense.approvals.push({
      approver: req.user._id,
      status: action === 'approve' ? 'approved' : 'rejected',
      comment: `Admin Override: ${reason}`,
      date: new Date()
    });

    expense.status = action === 'approve' ? 'approved' : 'rejected';
    expense.currentApprover = null;

    if (action === 'reject') {
      expense.rejectionReason = `Admin Override: ${reason}`;
    }

    await expense.save();

    res.json({
      success: true,
      message: `Expense ${action}d successfully with admin override`,
      expense
    });
  } catch (error) {
    console.error('Override approval error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error processing override' 
    });
  }
});

module.exports = router;

