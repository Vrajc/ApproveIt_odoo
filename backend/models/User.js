const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ...existing code...
  role: {
    type: String,
    enum: ['employee', 'manager', 'admin', 'finance', 'director'],
    default: 'employee'
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  department: {
    type: String,
    required: true
  },
  approvalLimit: {
    type: Number,
    default: 0 // Maximum amount this user can approve
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);