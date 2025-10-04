const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadImage } = require('../config/cloudinary');

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF) and PDF files are allowed'));
  }
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

// Handle upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field.' });
    }
  } else if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

// Upload to Cloudinary middleware
const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(); // No file uploaded, continue
    }

    console.log('Uploading file to Cloudinary:', req.file.filename);
    
    const cloudinaryResult = await uploadImage(req.file.path, {
      public_id: `receipt_${Date.now()}`,
      folder: 'approveit/receipts'
    });

    // Add Cloudinary result to request
    req.cloudinaryResult = {
      ...cloudinaryResult,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    };

    // Clean up temporary file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError.message);
    }

    console.log('File uploaded successfully to Cloudinary');
    next();
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Clean up temporary file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file after error:', cleanupError.message);
      }
    }

    res.status(500).json({ 
      message: 'Failed to upload file', 
      error: error.message 
    });
  }
};

module.exports = {
  upload,
  handleUploadError,
  uploadToCloudinary
};
