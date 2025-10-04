const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  baseCurrency: {
    type: String,
    required: [true, 'Base currency is required'],
    uppercase: true,
    length: 3,
    default: 'USD'
  },
  approvalRules: {
    sequential: {
      type: Boolean,
      default: true
    },
    requireManagerApproval: {
      type: Boolean,
      default: true
    },
    thresholds: [{
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      role: {
        type: String,
        enum: ['manager', 'admin'],
        required: true
      }
    }],
    conditionalRules: {
      enabled: {
        type: Boolean,
        default: false
      },
      percentageRule: {
        enabled: {
          type: Boolean,
          default: false
        },
        percentage: {
          type: Number,
          min: 1,
          max: 100,
          default: 60
        }
      },
      specificApproverRule: {
        enabled: {
          type: Boolean,
          default: false
        },
        approverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      },
      hybrid: {
        type: Boolean,
        default: false
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Set default approval thresholds
companySchema.pre('save', function(next) {
  if (this.isNew && (!this.approvalRules.thresholds || this.approvalRules.thresholds.length === 0)) {
    this.approvalRules.thresholds = [
      { amount: 500, role: 'manager' },
      { amount: 2000, role: 'admin' }
    ];
  }
  next();
});

module.exports = mongoose.model('Company', companySchema);
