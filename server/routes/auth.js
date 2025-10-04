const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');
const { authenticate } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Create a simple in-memory rate limiter with improved logic
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ATTEMPTS = 10; // Increased to 10 attempts per minute
const TEST_USER_MAX_ATTEMPTS = 50; // Higher limit for test users

const checkRateLimit = (ip, options = {}) => {
  const { isTestUser = false, skipRateLimit = false } = options;
  
  // Always allow in development with skipRateLimit flag
  if (skipRateLimit && process.env.NODE_ENV === 'development') {
    console.log('Rate limit bypassed for development test user');
    return { allowed: true };
  }
  
  // Allow test users in development
  if (isTestUser && process.env.NODE_ENV === 'development') {
    console.log('Rate limit relaxed for test user');
    return { allowed: true };
  }

  const now = Date.now();
  const key = `${ip}-${isTestUser ? 'test' : 'normal'}`;
  const maxAttempts = isTestUser ? TEST_USER_MAX_ATTEMPTS : MAX_ATTEMPTS;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  const record = rateLimitMap.get(key);
  
  if (now > record.resetTime) {
    // Reset the counter
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= maxAttempts) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((record.resetTime - now) / 1000) 
    };
  }
  
  record.count++;
  return { allowed: true };
};

// Generate JWT token
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register new user and company (admin only)
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('companyName').trim().isLength({ min: 2, max: 100 }).withMessage('Company name is required'),
  body('role').isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  body('department').optional().trim(),
  body('isTestUser').optional().isBoolean(),
  body('skipRateLimit').optional().isBoolean()
], async (req, res) => {
  try {
    // Check rate limiting with improved options
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimit = checkRateLimit(clientIp, {
      isTestUser: req.body.isTestUser,
      skipRateLimit: req.body.skipRateLimit
    });
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIp}, retry after: ${rateLimit.retryAfter}s`);
      return res.status(429).json({ 
        message: `Too many registration attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
        retryAfter: rateLimit.retryAfter 
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, email, password, companyName, role = 'employee', department, isTestUser } = req.body;

    console.log('Registration attempt:', { 
      name, 
      email, 
      role, 
      companyName, 
      isTestUser: !!isTestUser,
      ip: clientIp 
    });

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    let company;
    let userRole = role;

    // Check if company exists
    company = await Company.findOne({ name: companyName.trim() });
    
    if (!company) {
      console.log('Creating new company:', companyName);
      company = new Company({
        name: companyName.trim(),
        baseCurrency: 'USD',
        approvalRules: {
          sequential: true,
          requireManagerApproval: true,
          thresholds: [
            { amount: 500, role: 'manager' },
            { amount: 2000, role: 'admin' }
          ],
          conditionalRules: {
            enabled: false,
            percentageRule: { enabled: false, percentage: 60 },
            specificApproverRule: { enabled: false, approverId: null },
            hybrid: false
          }
        }
      });

      await company.save();
      
      // If this is the first user in a new company, make them admin
      if (role !== 'admin') {
        const existingUsers = await User.countDocuments({ company: company._id });
        if (existingUsers === 0) {
          userRole = 'admin';
        }
      }
    }

    // Create user with raw password (let pre-save hook handle hashing)
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: password, // Don't hash here - let the model do it
      role: userRole,
      department: department || 'general',
      company: company._id
    });

    await user.save();
    console.log('User created successfully:', user._id);

    // Update company with createdBy if first user
    if (!company.createdBy) {
      company.createdBy = user._id;
      await company.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role,
        company: company._id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Populate user data
    await user.populate('company');

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        company: user.company,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check rate limiting for login
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimit = checkRateLimit(clientIp);
    
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        success: false,
        message: `Too many login attempts, please try again later.`,
        retryAfter: rateLimit.retryAfter 
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password').populate('company');
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    console.log('User found:', user._id);

    // Check if user is active
    if (user.status !== 'active') {
      console.log('User inactive:', user.status);
      return res.status(401).json({ 
        success: false,
        message: 'Account is inactive. Please contact your administrator.' 
      });
    }

    // Check password
    console.log('Comparing passwords...');
    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role,
        company: user.company._id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log('Login successful for:', email);

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        company: user.company,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('company');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, email } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id },
        company: req.user.company._id 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updates.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).populate('company');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/check-db
// @desc    Check database connection
// @access  Public (for debugging)
router.get('/check-db', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const companyCount = await Company.countDocuments();
    
    res.json({
      success: true,
      message: 'Database connected',
      stats: {
        users: userCount,
        companies: companyCount
      }
    });
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/check-user
// @desc    Check if user exists (for debugging)
// @access  Public (for debugging)
router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email }).populate('company');
    
    if (!user) {
      return res.json({
        exists: false,
        message: 'User not found'
      });
    }
    
    res.json({
      exists: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
        company: user.company?.name || 'No company',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('User check error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset user password (for debugging)
// @access  Public (for debugging - remove in production)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

module.exports = router;
