const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ...existing code...

// Role-based authorization middleware
const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};

// Department access check for managers
const checkDepartmentAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next(); // Admin can access all departments
    }

    if (req.user.role === 'manager') {
      // Manager can only access their department
      const { department } = req.params;
      if (department && req.user.department !== department) {
        return res.status(403).json({ message: 'Access denied to this department' });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Department access check failed' });
  }
};

module.exports = { authenticate, authorize, checkDepartmentAccess };