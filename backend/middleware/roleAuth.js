const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Check if user has required role
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid token or user inactive.' });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token.' });
    }
  };
};

// Check if user can approve expenses
const canApprove = async (req, res, next) => {
  try {
    if (!['manager', 'admin', 'finance', 'director'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only managers and above can approve expenses.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed.' });
  }
};

module.exports = { requireRole, canApprove };
