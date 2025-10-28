const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');

// Email function for password reset
const sendPasswordResetEmail = async (email, resetToken) => {
  // This would integrate with an email service like SendGrid, Nodemailer, etc.
  // For now, we'll just log the email content
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
  
  console.log('Sending password reset email:', {
    to: email,
    subject: 'Password Reset Request',
    resetUrl: resetUrl
  });
  
  // In a real implementation, you would:
  // 1. Generate an HTML email template
  // 2. Send via email service
  // 3. Handle delivery status
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, role = 'customer' } = req.body;
    let customerFoundBy = null; // Track how we found the customer

    // Check if user already exists (by email or phone)
    const userFilters = [{ email }];
    if (phone) {
      userFilters.push({ phone });
    }
    
    const existingUser = await User.findOne({ $or: userFilters });
    
    if (existingUser) {
      let conflictField = 'email';
      if (phone && existingUser.phone === phone) {
        conflictField = 'phone number';
      }
      return res.status(400).json({ 
        success: false,
        message: `A user account already exists with this ${conflictField}` 
      });
    }
    
    // Check if customer already exists (prefer phone number first, then email)
    let existingCustomer = null;
    
    // First, try to find customer by phone number (more reliable) if phone is provided
    if (phone && phone.trim()) {
      existingCustomer = await Customer.findOne({ phone: phone.trim() });
      if (existingCustomer) {
        customerFoundBy = 'phone';
        console.log('Found existing customer by phone number:', {
          customerId: existingCustomer._id,
          customerEmail: existingCustomer.email,
          customerPhone: existingCustomer.phone,
          searchPhone: phone.trim()
        });
      }
    }
    
    // If not found by phone, try to find by email
    if (!existingCustomer) {
      existingCustomer = await Customer.findOne({ email });
      if (existingCustomer) {
        customerFoundBy = 'email';
        console.log('Found existing customer by email:', {
          customerId: existingCustomer._id,
          customerEmail: existingCustomer.email,
          customerPhone: existingCustomer.phone,
          searchEmail: email
        });
      }
    }
    
    // Log the search result
    if (existingCustomer) {
      console.log(`Existing customer found by ${customerFoundBy} - will link to new user account`);
    } else {
      console.log('No existing customer found - will create new customer record');
    }

    // For standalone MongoDB, we'll use sequential operations with cleanup
    // Transactions are disabled to avoid compatibility issues
    console.log('Using sequential saves with cleanup (transactions disabled for compatibility)');

    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      role
    });

    await user.save();
    console.log('User record created with ID:', user._id);

    let customer = null;
    // If role is customer, handle customer record
    if (role === 'customer') {
      try {
        if (existingCustomer) {
          // Update existing customer record with user link
          console.log('Linking existing customer record to new user:', {
            customerId: existingCustomer._id,
            existingCustomerEmail: existingCustomer.email,
            existingCustomerPhone: existingCustomer.phone,
            newUserEmail: email,
            newUserPhone: phone,
            newUserId: user._id
          });
          
          // Check if customer is already linked to another user
          if (existingCustomer.user && existingCustomer.user.toString() !== user._id.toString()) {
            console.warn('Customer was already linked to another user:', existingCustomer.user);
          }
          
          existingCustomer.user = user._id;
          existingCustomer.isActive = true;
          
          console.log('Setting customer.user field to:', user._id);
          
          // Update customer info with user registration data (prefer user-provided data)
          if (!existingCustomer.firstName && firstName) {
            existingCustomer.firstName = firstName;
            console.log('Updated customer firstName from registration data');
          }
          if (!existingCustomer.lastName && lastName) {
            existingCustomer.lastName = lastName;
            console.log('Updated customer lastName from registration data');
          }
          
          // Handle email update carefully
          if (existingCustomer.email !== email) {
            // Check if the new email conflicts with another customer
            const emailConflict = await Customer.findOne({ 
              email: email, 
              _id: { $ne: existingCustomer._id } 
            });
            if (!emailConflict) {
              console.log(`Updating customer email from '${existingCustomer.email}' to '${email}'`);
              existingCustomer.email = email;
            } else {
              console.warn('Email already exists for another customer, keeping existing email');
            }
          }
          
          // Handle phone update carefully  
          if (phone && existingCustomer.phone !== phone) {
            // Only update phone if it doesn't conflict with existing unique constraint
            const phoneConflict = await Customer.findOne({ 
              phone: phone, 
              _id: { $ne: existingCustomer._id } 
            });
            if (!phoneConflict) {
              console.log(`Updating customer phone from '${existingCustomer.phone}' to '${phone}'`);
              existingCustomer.phone = phone;
            } else {
              console.warn('Phone number already exists for another customer, keeping existing phone');
            }
          }
          
          await existingCustomer.save();
          customer = existingCustomer;
          
          // Verify the user field was saved
          const verifyCustomer = await Customer.findById(existingCustomer._id);
          console.log('Verification - Customer user field after save:', verifyCustomer.user);
          console.log('Existing customer record updated and linked to user successfully');
        } else {
          // Create new customer record
          console.log('Creating new customer record for user:', user._id);
          customer = new Customer({
            firstName,
            lastName,
            email,
            phone,
            user: user._id, // Link to the user record
            createdBy: user._id, // Self-created during registration
            isActive: true,
            registrationDate: new Date()
          });
          await customer.save();
          console.log('New customer record created with ID:', customer._id);
        }
      } catch (customerError) {
        console.error('Error handling customer record:', customerError);
        
        // Clean up the user record since customer creation failed
        try {
          await User.findByIdAndDelete(user._id);
          console.log('Cleaned up user record due to customer creation failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup user record:', cleanupError);
        }
        
        throw customerError;
      }
    }

    // Registration completed successfully

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // 1 hour for better security
    );

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    // Determine appropriate success message
    let message = 'Account created successfully';
    let linkingMethod = null;
    
    if (role === 'customer' && existingCustomer) {
      // Use the method we actually found the customer by
      linkingMethod = customerFoundBy || 'unknown';
      
      if (customerFoundBy === 'phone') {
        message = 'Account created successfully and linked to existing customer profile (matched by phone number)';
      } else if (customerFoundBy === 'email') {
        message = 'Account created successfully and linked to existing customer profile (matched by email)';
      } else {
        message = 'Account created successfully and linked to existing customer profile';
      }
    }

    res.status(201).json({
      success: true,
      message,
      token,
      user: userResponse,
      ...(customer && { 
        customer: { 
          id: customer._id, 
          customerCode: customer.customerCode,
          isExistingCustomer: !!existingCustomer,
          ...(linkingMethod && { linkedBy: linkingMethod })
        } 
      })
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Log the error for debugging
    console.error('Registration failed with error:', error.message);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Validation failed: ${messages}` 
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      let message;
      
      if (field === 'email') {
        message = 'An account with this email address already exists';
      } else if (field === 'phone') {
        message = 'An account with this phone number already exists';
      } else {
        message = `${field} already exists`;
      }
      
      return res.status(400).json({ 
        success: false, 
        message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during account creation. Please try again.' 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // 1 hour for better security
    );

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      accessToken: token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userResponse = user.toJSON();
    // Ensure consistent fields
    if (!userResponse.id && userResponse._id) {
      userResponse.id = String(userResponse._id);
    }
    if (!userResponse.email && userResponse.username) {
      userResponse.email = userResponse.username; // fallback if schema differs
    }
    delete userResponse.password;

    res.json({ 
      success: true,
      user: userResponse,
      // Compatibility aliases for some external tests expecting top-level fields
      email: userResponse.email,
      id: userResponse.id
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Refresh JWT token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = async (req, res) => {
  try {
    // Generate new token
    const token = jwt.sign(
      { id: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // 1 hour for better security
    );

    res.json({ 
      success: true,
      token,
      accessToken: token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Change user password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true,
      message: 'Password reset instructions sent to your email'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid reset token' 
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ 
      success: true,
      message: 'Password reset successfully' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const { revokedTokens } = require('../middleware/auth');

const logout = (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) revokedTokens.add(token);
  } catch {}
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  logout
};
