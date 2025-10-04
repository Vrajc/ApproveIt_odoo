const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'admin'],
    default: 'employee'
  },
  department: {
    type: String,
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  permissions: {
    canSubmitExpenses: { type: Boolean, default: true },
    canApproveExpenses: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canViewAllExpenses: { type: Boolean, default: false },
    canOverrideApprovals: { type: Boolean, default: false }
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Set permissions based on role
userSchema.pre('save', function(next) {
  switch (this.role) {
    case 'admin':
      this.permissions = {
        canSubmitExpenses: true,
        canApproveExpenses: true,
        canManageUsers: true,
        canViewAllExpenses: true,
        canOverrideApprovals: true
      };
      break;
    case 'manager':
      this.permissions = {
        canSubmitExpenses: true,
        canApproveExpenses: true,
        canManageUsers: true,
        canViewAllExpenses: true,
        canOverrideApprovals: true
      };
      break;
    case 'employee':
    default:
      this.permissions = {
        canSubmitExpenses: true,
        canApproveExpenses: false,
        canManageUsers: false,
        canViewAllExpenses: false,
        canOverrideApprovals: false
      };
      break;
  }
  next();
});

// Index for better query performance
userSchema.index({ email: 1, company: 1 });
userSchema.index({ company: 1, role: 1 });

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
