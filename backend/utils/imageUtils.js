/**
 * Image URL utility functions
 * Handles image URL generation based on environment
 */

/**
 * Generate image URL based on environment
 * @param {string} filename - The uploaded filename
 * @param {Object} req - Express request object
 * @param {string} subfolder - Optional subfolder (e.g., 'logos', 'products', 'avatars')
 * @returns {string} - Complete image URL
 */
const generateImageUrl = (filename, req, subfolder = '') => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `${req.protocol}://${req.get('host')}/api/uploads` 
    : `${req.protocol}://${req.get('host')}/uploads`;
  
  const path = subfolder ? `${subfolder}/${filename}` : filename;
  
  return `${baseUrl}/${path}`;
};

/**
 * Generate relative image path for static serving
 * @param {string} filename - The uploaded filename
 * @param {string} subfolder - Optional subfolder
 * @returns {string} - Relative path for static serving
 */
const generateImagePath = (filename, subfolder = '') => {
  return subfolder ? `${subfolder}/${filename}` : filename;
};

/**
 * Get base URL for image serving
 * @param {Object} req - Express request object
 * @returns {string} - Base URL for images
 */
const getImageBaseUrl = (req) => {
  return process.env.NODE_ENV === 'production' 
    ? `${req.protocol}://${req.get('host')}/api/uploads` 
    : `${req.protocol}://${req.get('host')}/uploads`;
};

module.exports = {
  generateImageUrl,
  generateImagePath,
  getImageBaseUrl
};
