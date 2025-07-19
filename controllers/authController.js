import { forgotPasswordService, resetPasswordService } from '../services/authService.js';
import { sendResetPasswordEmail } from '../services/mailService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

/**
 * CONTROLLER for POST /forgot-password
 */
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
        await sendResetPasswordEmail(result.email, result.userName, result.token);
      } catch (mailError) {
        // Log the email error for debugging, but do not expose it to the client.
        // The process continues to send a generic success message for security.
        console.error('CRITICAL: Failed to send password reset email:', mailError);
      }
    }

    // Always return a generic success message to prevent attackers from guessing emails.
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot Password Controller Error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

/**
 * CONTROLLER for POST /reset-password
 */
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    await resetPasswordService(token, newPassword);
    res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
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
