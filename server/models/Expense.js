const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['approved', 'rejected'],
    required: true
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const expenseSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  originalCurrency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    length: 3
  },
  convertedAmount: {
    type: Number,
    required: [true, 'Converted amount is required'],
    min: [0.01, 'Converted amount must be greater than 0']
  },
  baseCurrency: {
    type: String,
    required: [true, 'Base currency is required'],
    uppercase: true,
    length: 3
  },
  exchangeRate: {
    type: Number,
    default: 1.0 // Default to 1.0 for same currency transactions
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Travel', 'Meals', 'Office Supplies', 'Equipment', 'Software', 'Marketing', 'Training', 'Other']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  date: {
    type: Date,
    required: [true, 'Expense date is required']
  },
  receiptUrl: {
    type: String,
    trim: true
  },
  receiptData: {
    publicId: String,
    url: String,
    originalName: String,
    mimeType: String,
    size: Number
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvals: [approvalSchema],
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalLevel: {
    type: Number,
    default: 0
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
expenseSchema.index({ submittedBy: 1, status: 1 });
expenseSchema.index({ company: 1, status: 1 });
expenseSchema.index({ currentApprover: 1, status: 1 });
expenseSchema.index({ createdAt: -1 });

// Calculate exchange rate before saving
expenseSchema.pre('save', function(next) {
  if (this.amount && this.convertedAmount) {
    this.exchangeRate = this.convertedAmount / this.amount;
  }
  next();
});

// Virtual for formatted amount
expenseSchema.virtual('formattedAmount').get(function() {
  return `${this.originalCurrency} ${this.amount.toFixed(2)}`;
});

expenseSchema.virtual('formattedConvertedAmount').get(function() {
  return `${this.baseCurrency} ${this.convertedAmount.toFixed(2)}`;
});

// Virtual for optimized receipt URLs
expenseSchema.virtual('receiptThumbnail').get(function() {
  if (this.receiptData?.publicId) {
    const { getOptimizedUrl } = require('../config/cloudinary');
    return getOptimizedUrl(this.receiptData.publicId, { 
      width: 200, 
      height: 200, 
      crop: 'fill',
      quality: 'auto'
    });
  }
  return null;
});

// Ensure virtuals are included in JSON
expenseSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports = mongoose.model('Expense', expenseSchema);
