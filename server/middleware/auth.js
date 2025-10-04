const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authenticate middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Add more detailed error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token signature' });
      } else if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Token verification failed' });
    }

    const user = await User.findById(decoded.id).populate('company');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Authorize roles middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} is not authorized to access this resource` 
      });
    }

    next();
  };
};

// Same company filter middleware
const sameCompany = (req, res, next) => {
  if (!req.user?.company) {
    return res.status(400).json({ message: 'User not associated with a company' });
  }

  req.companyFilter = { company: req.user.company._id };
  next();
};

// Can approve expenses middleware
const canApprove = async (req, res, next) => {
  if (!req.user.permissions.canApproveExpenses) {
    return res.status(403).json({ message: 'You do not have permission to approve expenses' });
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  sameCompany,
  canApprove
};
exports.canApprove = async (req, res, next) => {
  try {
    const { user } = req;
    
    if (!user.permissions.canApproveExpenses) {
      return res.status(403).json({ message: 'You do not have permission to approve expenses.' });
    }

    // Additional checks can be added here for amount limits based on role
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking approval permissions.' });
  }
};

// Check manager relationship
exports.isManagerOf = async (req, res, next) => {
  try {
    const { user } = req;
    const { userId } = req.params;

    if (user.role === 'admin') {
      return next(); // Admins can manage all users
    }

    if (user.role === 'manager') {
      const subordinate = await User.findOne({ 
        _id: userId, 
        manager: user._id,
        company: user.company._id 
      });
      
      if (!subordinate) {
        return res.status(403).json({ message: 'You can only manage your direct reports.' });
      }
    } else {
      return res.status(403).json({ message: 'Only managers and admins can manage users.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking manager relationship.' });
  }
};

// Check if user belongs to same company
exports.sameCompany = (req, res, next) => {
  // This middleware will be used to ensure users can only access data from their company
  req.companyFilter = { company: req.user.company._id };
  next();
};
 
// Check if user belongs to same company
exports.sameCompany = (req, res, next) => {
  // This middleware will be used to ensure users can only access data from their company
  req.companyFilter = { company: req.user.company._id };
  next();
};
