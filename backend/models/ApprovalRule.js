const mongoose = require('mongoose');

const approvalRuleSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  ruleName: {
    type: String,
    required: true
  },
  conditions: {
    minAmount: Number,
    maxAmount: Number,
    categories: [String],
    departments: [String]
  },
  approvalSteps: [{
    sequence: {
      type: Number,
      required: true
    },
    approverRole: {
      type: String,
      enum: ['manager', 'finance', 'admin', 'director'],
      required: true
    },
    isManagerApprover: {
      type: Boolean,
      default: false
    },
    approvalLimit: Number,
    isRequired: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);
