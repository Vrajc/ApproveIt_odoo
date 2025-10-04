const express = require('express');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { authenticate, sameCompany } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', sameCompany, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const companyId = req.user.company._id;

    console.log('Fetching dashboard stats for user:', { userId, userRole, companyId });

    // Base query with proper company filtering
    let baseQuery = { company: companyId };
    
    // Employees see only their own expenses
    if (userRole === 'employee') {
      baseQuery.submittedBy = userId;
    }

    console.log('Base query:', baseQuery);

    const [
      totalExpensesResult,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      pendingApprovals,
      teamExpenses
    ] = await Promise.all([
      // Total expenses amount (approved only)
      Expense.aggregate([
        { $match: { ...baseQuery, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$convertedAmount' } } }
      ]).catch(err => {
        console.error('Error in total expenses aggregation:', err);
        return [{ total: 0 }];
      }),
      
      // Count pending expenses
      Expense.countDocuments({ ...baseQuery, status: 'pending' }).catch(err => {
        console.error('Error counting pending expenses:', err);
        return 0;
      }),
      
      // Count approved expenses
      Expense.countDocuments({ ...baseQuery, status: 'approved' }).catch(err => {
        console.error('Error counting approved expenses:', err);
        return 0;
      }),
      
      // Count rejected expenses
      Expense.countDocuments({ ...baseQuery, status: 'rejected' }).catch(err => {
        console.error('Error counting rejected expenses:', err);
        return 0;
      }),
      
      // Pending approvals for managers/admins
      userRole === 'employee' ? Promise.resolve(0) : Expense.countDocuments({
        company: companyId,
        status: 'pending',
        ...(userRole === 'manager' ? { currentApprover: userId } : {})
      }).catch(err => {
        console.error('Error counting pending approvals:', err);
        return 0;
      }),
      
      // Team expenses for managers/admins
      userRole === 'employee' ? Promise.resolve(0) : Expense.countDocuments({
        company: companyId,
        submittedBy: { $ne: userId }
      }).catch(err => {
        console.error('Error counting team expenses:', err);
        return 0;
      })
    ]);

    const stats = {
      totalExpenses: totalExpensesResult[0]?.total || 0,
      pendingExpenses: pendingExpenses || 0,
      approvedExpenses: approvedExpenses || 0,
      rejectedExpenses: rejectedExpenses || 0,
      pendingApprovals: pendingApprovals || 0,
      teamExpenses: teamExpenses || 0
    };

    console.log('Dashboard stats calculated:', stats);

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    
    // Return default stats on error
    res.status(500).json({
      totalExpenses: 0,
      pendingExpenses: 0,
      approvedExpenses: 0,
      rejectedExpenses: 0,
      pendingApprovals: 0,
      teamExpenses: 0,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// @route   GET /api/dashboard/analytics
// @desc    Get expense analytics
// @access  Private (Manager, Admin)
router.get('/analytics', authenticate, async (req, res) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const companyId = req.user.company._id;

    const [
      expensesByCategory,
      expensesByStatus,
      monthlyTrend,
      topSpenders
    ] = await Promise.all([
      // Expenses by category
      Expense.aggregate([
        {
          $match: {
            company: companyId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$convertedAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),

      // Expenses by status
      Expense.aggregate([
        {
          $match: {
            company: companyId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$status',
            total: { $sum: '$convertedAmount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly trend
      Expense.aggregate([
        {
          $match: {
            company: companyId,
            createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: '$convertedAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Top spenders
      Expense.aggregate([
        {
          $match: {
            company: companyId,
            status: 'approved',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$submittedBy',
            total: { $sum: '$convertedAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            total: 1,
            count: 1,
            name: { $arrayElemAt: ['$user.name', 0] }
          }
        }
      ])
    ]);

    res.json({
      expensesByCategory,
      expensesByStatus,
      monthlyTrend,
      topSpenders
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

module.exports = router;
