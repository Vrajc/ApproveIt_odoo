const Expense = require('../models/Expense');
const ApprovalRule = require('../models/ApprovalRule');
const User = require('../models/User');
const emailService = require('./emailService');

class ApprovalService {
  // Set up approval flow based on rules and expense details
  async setupApprovalFlow(expense, employee) {
    const rules = await ApprovalRule.find({
      companyId: employee.companyId,
      isActive: true,
      'conditions.minAmount': { $lte: expense.amount },
      'conditions.maxAmount': { $gte: expense.amount },
      'conditions.categories': { $in: [expense.category] }
    }).sort({ 'conditions.minAmount': -1 });

    const applicableRule = rules[0];
    if (!applicableRule) {
      // Default approval flow - just manager
      return [{
        approverId: employee.managerId,
        approverRole: 'manager',
        sequence: 1,
        status: 'pending'
      }];
    }

    const approvalFlow = [];
    for (const step of applicableRule.approvalSteps) {
      let approverId;
      
      if (step.isManagerApprover) {
        approverId = employee.managerId;
      } else {
        // Find user with specific role in same department/company
        const approver = await User.findOne({
          role: step.approverRole,
          companyId: employee.companyId,
          isActive: true,
          approvalLimit: { $gte: expense.amount }
        });
        approverId = approver?._id;
      }

      if (approverId) {
        approvalFlow.push({
          approverId,
          approverRole: step.approverRole,
          sequence: step.sequence,
          status: 'pending'
        });
      }
    }

    return approvalFlow.sort((a, b) => a.sequence - b.sequence);
  }

  // Process approval/rejection
  async processApproval(expenseId, approver, action, comments) {
    const expense = await Expense.findById(expenseId)
      .populate('employeeId')
      .populate('approvalFlow.approverId');

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Find current approval step
    const currentStep = expense.approvalFlow[expense.currentApprovalStep];
    
    if (!currentStep || !currentStep.approverId.equals(approver._id)) {
      throw new Error('You are not authorized to approve this expense at this step');
    }

    // Update current step
    currentStep.status = action;
    currentStep.comments = comments;
    currentStep.actionDate = new Date();

    if (action === 'reject') {
      expense.status = 'rejected';
      expense.rejectionReason = comments;
      
      // Notify employee
      await emailService.sendRejectionNotification(expense, comments);
    } else if (action === 'approve') {
      // Check if this is the final approval
      const nextStep = expense.approvalFlow[expense.currentApprovalStep + 1];
      
      if (nextStep) {
        // Move to next approval step
        expense.currentApprovalStep += 1;
        expense.status = 'in_review';
        
        // Notify next approver
        await this.notifyNextApprover(expense);
      } else {
        // Final approval
        expense.status = 'approved';
        expense.finalApprovalDate = new Date();
        
        // Notify employee
        await emailService.sendApprovalNotification(expense);
      }
    }

    await expense.save();
    return { message: `Expense ${action}d successfully`, expense };
  }

  // Get pending approvals for a user
  async getPendingApprovals(approver) {
    const expenses = await Expense.find({
      status: { $in: ['pending', 'in_review'] }
    })
    .populate('employeeId', 'name department')
    .populate('approvalFlow.approverId', 'name role');

    // Filter expenses where current approver is the user
    return expenses.filter(expense => {
      const currentStep = expense.approvalFlow[expense.currentApprovalStep];
      return currentStep && currentStep.approverId._id.equals(approver._id) && currentStep.status === 'pending';
    });
  }

  // Notify next approver
  async notifyNextApprover(expense) {
    const currentStep = expense.approvalFlow[expense.currentApprovalStep];
    if (currentStep) {
      await emailService.sendApprovalRequest(expense, currentStep.approverId);
    }
  }

  // Get expense statistics for dashboard
  async getExpenseStatistics(filter = {}) {
    const totalExpenses = await Expense.countDocuments(filter);
    const approvedExpenses = await Expense.countDocuments({ ...filter, status: 'approved' });
    const pendingExpenses = await Expense.countDocuments({ ...filter, status: { $in: ['pending', 'in_review'] } });
    const rejectedExpenses = await Expense.countDocuments({ ...filter, status: 'rejected' });
    
    const totalAmount = await Expense.aggregate([
      { $match: { ...filter, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return {
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      rejectedExpenses,
      totalApprovedAmount: totalAmount[0]?.total || 0
    };
  }
}

module.exports = new ApprovalService();
