const Setting = require('../models/Setting');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/logos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// @desc Get application settings (singleton)
// @route GET /api/settings
// @access Private
const getSettings = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Update application settings
// @route PUT /api/settings
// @access Private
const updateSettings = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();
    const updates = req.body || {};

    if (updates.company) settings.company = { ...settings.company.toObject(), ...updates.company };
    if (updates.appearance) settings.appearance = { ...settings.appearance.toObject(), ...updates.appearance };
    if (updates.notifications) settings.notifications = { ...settings.notifications.toObject(), ...updates.notifications };
    if (updates.system) settings.system = { ...settings.system.toObject(), ...updates.system };
    settings.updatedBy = req.user?._id || settings.updatedBy;

    await settings.save();
    res.json({ success: true, message: 'Settings updated', data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Upload company logo
// @route POST /api/settings/logo
// @access Private
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const settings = await Setting.getSingleton();
    
    // Delete old logo if exists
    if (settings.company.logo.filename) {
      const oldLogoPath = path.join('uploads/logos', settings.company.logo.filename);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Update logo information
    settings.company.logo = {
      url: `/uploads/logos/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname
    };
    settings.updatedBy = req.user?._id || settings.updatedBy;

    await settings.save();
    res.json({ success: true, message: 'Logo uploaded successfully', data: settings.company.logo });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Delete company logo
// @route DELETE /api/settings/logo
// @access Private
const deleteLogo = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();
    
    if (settings.company.logo.filename) {
      const logoPath = path.join('uploads/logos', settings.company.logo.filename);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    settings.company.logo = {
      url: '',
      filename: '',
      originalName: ''
    };
    settings.updatedBy = req.user?._id || settings.updatedBy;

    await settings.save();
    res.json({ success: true, message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { 
  getSettings, 
  updateSettings, 
  uploadLogo, 
  deleteLogo,
  upload: upload.single('logo')
};


