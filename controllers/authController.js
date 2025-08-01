import { 
  forgotPasswordService, 
  resetPasswordService, 
  verifyOTP as verifyEmailOTP, 
  clearOTP 
} from '../services/authService.js';
import { sendOTPEmail } from '../services/mailService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { determineAuthFlow, findOrCreateUser, updateProfileCompletion } from '../services/userService.js';
import { sendWhatsAppOTP, generateAndStoreOTP, verifyOTP as verifyPhoneOTP } from '../services/msg91Service.js';
import jwt from 'jsonwebtoken';


export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const result = await forgotPasswordService(email);

    // If a user was found, the service returns data needed to send the email.
    if (result) {
      try {
        // The forgotPasswordService already generates and stores the OTP
        // Just send the OTP email using the OTP from the result
        await sendOTPEmail(result.email, result.userName, result.otp);
      } catch (mailError) {
        // Log the email error for debugging, but do not expose it to the client.
        console.error('CRITICAL: Failed to send OTP email:', mailError);
      }
    }

    // Always return a generic success message to prevent attackers from guessing emails.
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, an OTP has been sent.',
    });
  } catch (error) {
    console.error('Forgot Password Controller Error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Validate required fields
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email, OTP, and new password are required.' 
    });
  }

  try {
    // Verify OTP first - using the renamed function
    const isValidOTP = await verifyEmailOTP(email, otp);
    
    if (!isValidOTP) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP.' 
      });
    }

    // Reset password using email instead of token
    await resetPasswordService(email, newPassword);
    
    // Clear the OTP after successful password reset
    await clearOTP(email);

    res.status(200).json({ 
      success: true, 
      message: 'Password has been reset successfully.' 
    });

  } catch (err) {
    console.error('Reset Password Controller Error:', err);

    // Handle specific errors thrown by the service layer
    if (err instanceof ValidationError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }

    // Fallback for any other unexpected errors
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};



export const sendOTP = async (req, res) => {
  const { phoneNumber } = req.body;

  // Validation
  if (!phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'Phone number is required.' 
    });
  }

  // Validate phone number format (Indian format)
  const phoneRegex = /^\+91[6-9]\d{9}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid phone number format. Use +91XXXXXXXXXX format.' 
    });
  }

  try {
    // Get client info for security
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Rate limiting check (basic implementation - enhance as needed)
    // You can implement more sophisticated rate limiting later
    
    // Determine if this is signin or signup flow
    const { flowType } = await determineAuthFlow(phoneNumber);
    
    // Create or find user (unified approach)
    const user = await findOrCreateUser(phoneNumber);
    
    // Generate and store OTP
    const otpCode = await generateAndStoreOTP(
      user.id, 
      flowType.toUpperCase(), 
      clientIP, 
      userAgent
    );
    
    // Send OTP via WhatsApp using MSG91
    const whatsappResult = await sendWhatsAppOTP(phoneNumber, otpCode);
    
    if (!whatsappResult.success) {
      throw new Error('Failed to send WhatsApp OTP');
    }
    
    // Success response (consistent with your existing pattern)
    return res.status(200).json({
      success: true,
      flowType, // 'signin' or 'signup'
      message: `OTP sent via WhatsApp for ${flowType}`,
      expiresIn: 300, // 5 minutes
      messageId: whatsappResult.messageId
    });
    
  } catch (error) {
    console.error('Send OTP Controller Error:', error);
    
    // Handle specific errors
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({ 
        success: false, 
        message: 'Too many OTP requests. Please try again later.' 
      });
    }
    
    if (error.message.includes('WhatsApp')) {
      return res.status(503).json({ 
        success: false, 
        message: 'Unable to send OTP via WhatsApp. Please try again.' 
      });
    }
    
    // Generic error response
    return res.status(500).json({ 
      success: false, 
      message: 'An internal server error occurred.' 
    });
  }
};

/**
 * CONTROLLER for POST /verify-otp
 * Verifies OTP and determines next step (dashboard or profile completion)
 */
export const verifyOTPEndpoint = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  // Validation
  if (!phoneNumber || !otp) {
    return res.status(400).json({ 
      success: false, 
      message: 'Phone number and OTP are required.' 
    });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ 
      success: false, 
      message: 'OTP must be 6 digits.' 
    });
  }

  try {
    // Verify OTP using service
    const { user, otpType } = await verifyOTP(phoneNumber, otp);
    
    // Update user verification status
    await updateUserVerification(user.id);
    
    // Generate JWT token (consistent with your existing auth pattern)
    const token = jwt.sign(
      { 
        userId: user.id, 
        phoneNumber: user.phoneNumber,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Determine next step based on flow type and profile completion
    let nextStep;
    let requiresProfileCompletion = false;
    
    if (otpType === 'SIGNIN' && user.isProfileComplete) {
      nextStep = 'dashboard';
    } else if (otpType === 'SIGNIN' && !user.isProfileComplete) {
      nextStep = 'profile-completion';
      requiresProfileCompletion = true;
    } else if (otpType === 'SIGNUP') {
      nextStep = 'profile-completion';
      requiresProfileCompletion = true;
    }
    
    // Success response (Myntra-style)
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        isProfileComplete: user.isProfileComplete,
        phoneVerified: true
      },
      nextStep,
      flowType: otpType.toLowerCase(),
      requiresProfileCompletion,
      message: otpType === 'SIGNIN' 
        ? 'Successfully signed in' 
        : 'Account verified successfully'
    });
    
  } catch (error) {
    console.error('Verify OTP Controller Error:', error);
    
    // Handle specific errors
    if (error.message.includes('Invalid') || error.message.includes('expired')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP. Please request a new one.' 
      });
    }
    
    if (error.message.includes('User not found')) {
      return res.status(404).json({ 
        success: false, 
        message: 'Phone number not found. Please request OTP first.' 
      });
    }
    
    // Generic error response
    return res.status(500).json({ 
      success: false, 
      message: 'An internal server error occurred.' 
    });
  }
};

/**
 * CONTROLLER for POST /complete-profile
 * For new users to complete their profile after OTP verification
 */
export const completeProfile = async (req, res) => {
  const { name, email, password, agreeToTerms, ageConfirmation } = req.body;
  
  // Get user ID from JWT token (set by your auth middleware)
  const userId = req.user?.userId;
  
  if (!userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required.' 
    });
  }

  // Validation
  if (!name || !agreeToTerms || !ageConfirmation) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name, terms agreement, and age confirmation are required.' 
    });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name must be at least 2 characters long.' 
    });
  }

  // Validate email format if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid email format.' 
    });
  }

  // Validate password if provided
  if (password && password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password must be at least 6 characters long.' 
    });
  }

  try {
    // Update user profile using service
    const updatedUser = await updateProfileCompletion(userId, {
      name: name.trim(),
      email: email?.trim(),
      password
    });
    
    // Success response
    return res.status(200).json({
      success: true,
      user: {
        id: updatedUser.id,
        phoneNumber: updatedUser.phoneNumber,
        name: updatedUser.name,
        email: updatedUser.email,
        isProfileComplete: true,
        phoneVerified: true
      },
      message: 'Profile completed successfully. Welcome aboard!'
    });
    
  } catch (error) {
    console.error('Profile Completion Controller Error:', error);
    
    // Handle specific errors
    if (error.message.includes('Email') && error.message.includes('exists')) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email address is already registered.' 
      });
    }
    
    // Generic error response
    return res.status(500).json({ 
      success: false, 
      message: 'An internal server error occurred.' 
    });
  }
};

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Helper function to update user verification status
 */
const updateUserVerification = async (userId) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        phoneVerified: true,
        lastLoginAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating user verification:', error);
    // Don't throw error here as verification is successful
  }
};
