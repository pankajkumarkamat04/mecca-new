/**
 * Image utility functions for handling different image sources
 */

/**
 * Generate image URL for backend uploads
 */
export const getBackendImageUrl = (filename: string, subfolder = ''): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const folderPath = subfolder ? `/${subfolder}` : '';
  return `${baseUrl}/uploads${folderPath}/${filename}`;
};

/**
 * Generate image URL for static assets
 */
export const getStaticImageUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${cleanPath}`;
};

/**
 * Get optimized image URL based on environment
 */
export const getOptimizedImageUrl = (
  filename: string, 
  type: 'static' | 'backend' | 'cloud' = 'backend',
  subfolder = ''
): string => {
  switch (type) {
    case 'static':
      return getStaticImageUrl(filename);
    case 'backend':
      return getBackendImageUrl(filename, subfolder);
    case 'cloud':
      // For cloud storage like AWS S3, Cloudinary, etc.
      return filename; // Assuming filename already contains full URL
    default:
      return getBackendImageUrl(filename, subfolder);
  }
};

/**
 * Generate placeholder image URL
 */
export const getPlaceholderImage = (type: 'product' | 'avatar' | 'logo' = 'product'): string => {
  const placeholders = {
    product: '/images/icons/product-placeholder.svg',
    avatar: '/images/icons/avatar-placeholder.svg',
    logo: '/images/icons/logo-placeholder.svg'
  };
  return placeholders[type];
};

/**
 * Check if image URL is external
 */
export const isExternalImage = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate responsive image sizes for Next.js Image component
 */
export const getResponsiveSizes = (breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop'): string => {
  const sizes = {
    mobile: '(max-width: 768px) 100vw, 50vw',
    tablet: '(max-width: 1200px) 50vw, 33vw',
    desktop: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  };
  return sizes[breakpoint];
};

/**
 * Validate image file type
 */
export const isValidImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return validTypes.includes(file.type);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate unique filename with timestamp
 */
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
};
