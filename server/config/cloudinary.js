const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image with proper transformations
const uploadImage = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'approveit/receipts',
      resource_type: 'image',
      format: 'auto', // Use format instead of f_auto
      quality: 'auto:good', // Use quality instead of q_auto
      width: 1000,
      height: 1000,
      crop: 'limit',
      ...options
    });

    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Delete image
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};

// Get optimized URL
const getOptimizedUrl = (publicId, options = {}) => {
  const transformation = [];
  
  if (options.width) transformation.push(`w_${options.width}`);
  if (options.height) transformation.push(`h_${options.height}`);
  if (options.quality) transformation.push(`q_${options.quality}`);
  
  // Use proper transformation format
  transformation.push('f_auto'); // Format auto
  
  return cloudinary.url(publicId, {
    transformation: transformation.join(','),
    secure: true
  });
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  getOptimizedUrl
};
