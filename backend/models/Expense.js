const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  category: {
    type: String,
    required: true,
    enum: ['travel', 'meals', 'office_supplies', 'software', 'training', 'other']
  },
  description: {
    type: String,
    required: true
  },
  expenseDate: {
    type: Date,
    required: true
  },
  receipt: {
    filename: String,
    url: String,
    ocrData: {
      extractedText: String,
      extractedAmount: Number,
      extractedDate: Date,
      confidence: Number
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in_review'],
    default: 'pending'
  },
  approvalFlow: [{
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approverRole: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    actionDate: Date,
    sequence: Number
  }],
  currentApprovalStep: {
    type: Number,
    default: 0
  },
  finalApprovalDate: Date,
  rejectionReason: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
