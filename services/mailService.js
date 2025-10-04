import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

// --- Constants ---
const RESET_TOKEN_EXPIRATION_MINUTES = 60; // Used in password reset email
const OTP_EXPIRATION_MINUTES = 10; // OTP expiration time

// --- Environment Variable Validation ---
const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// --- Nodemailer Transporter Setup ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Avoid self-signed cert errors
  },
});

// Verify transporter configuration at startup
(async () => {
  try {
    await transporter.verify();
    console.log('Email transporter is ready to send messages');
  } catch (error) {
    console.error('Email transporter configuration error:', error);
    throw new Error(`Failed to initialize email transporter: ${error.message}`);
  }
})();

// --- General Send Email Function ---
/**
 * Internal helper to send an email.
 * @param {Object} mailOptions - Nodemailer mailOptions
 * @returns {Promise<Object>} Email sending result
 * @throws {Error} If mailOptions is invalid or email sending fails
 */
const sendEmail = async (mailOptions) => {
  try {
    // Validate mailOptions
    if (!mailOptions || typeof mailOptions !== 'object') {
      throw new Error('Invalid mail options');
    }
    const { from, to, subject, html } = mailOptions;
    if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new Error('Invalid recipient email address');
    }
    if (!subject || typeof subject !== 'string') {
      throw new Error('Invalid email subject');
    }
    if (!html || typeof html !== 'string') {
      throw new Error('Invalid email HTML content');
    }
    if (from && from !== `"Dolchi Co" <${process.env.EMAIL_USER}>`) {
      throw new Error('Invalid sender address');
    }

    const info = await transporter.sendMail({
      from: `"Dolchi Co" <${process.env.EMAIL_USER}>`, // Ensure consistent sender
      ...mailOptions,
    });
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// ===========================
// Welcome Email
// ===========================
/**
 * Sends a welcome email to a new user.
 * @param {string} toEmail - Recipient email address
 * @param {string} [userName] - User's name (optional)
 * @returns {Promise<void>}
 * @throws {Error} If inputs are invalid or email sending fails
 */
export const sendWelcomeEmail = async (toEmail, userName = null) => {
  try {
    // Validate inputs
    if (!toEmail || typeof toEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      throw new Error('Invalid recipient email address');
    }
    if (userName && typeof userName !== 'string') {
      throw new Error('Invalid user name: must be a string');
    }

    const mailOptions = {
      from: `"Dolchi Co" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Welcome to Dolchi Co – Your Style Journey Begins!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
          <h1 style="color: #1a202c;">Welcome to Dolchi Co, ${userName || 'Valued Customer'}!</h1>
          <p style="font-size: 1.1em; line-height: 1.6;">
            Thank you for joining <strong>Dolchi Co</strong> – where style meets comfort and every piece tells a story. We're thrilled to have you as part of our vibrant community of fashion lovers!
          </p>
          <p style="font-size: 1.1em; line-height: 1.6;">
            Ready to explore? <a href="https://dolchico.com" style="color: #4f46e5; text-decoration: underline;">Visit our shop</a> and discover the latest trends, timeless classics, and everything in between.
          </p>
          <hr style="margin: 32px 0;" />
          <p style="font-size: 1em; color: #555;">
            With style,<br>
            The Dolchi Co Team
          </p>
        </div>
      `,
    };
    await sendEmail(mailOptions);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
};

// ===========================
// Email Verification Email
// ===========================
/**
 * Sends an email with a verification link and OTP.
 * @param {string} toEmail - Recipient email address
 * @param {string} token - Verification token for link
 * @param {string} otp - OTP code for verification
 * @param {string} [userName] - User's name (optional)
 * @returns {Promise<void>}
 * @throws {Error} If inputs are invalid or email sending fails
 */
export const sendVerificationEmail = async (toEmail, token, otp, userName = null) => {
  try {
    // Validate inputs
    if (!toEmail || typeof toEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      throw new Error('Invalid recipient email address');
    }
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid verification token');
    }
    if (!otp || typeof otp !== 'string') {
      throw new Error('Invalid OTP code');
    }
    if (userName && typeof userName !== 'string') {
      throw new Error('Invalid user name: must be a string');
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'https://dolchico.com'}/verifyemail?token=${token}&email=${encodeURIComponent(toEmail)}`;
    const displayName = userName || 'Valued Customer';

    const mailOptions = {
      from: `"Dolchi Co" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Verify Your Email – Dolchi Co',
      html: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1a202c; margin-bottom: 8px;">Verify Your Email</h1>
            <p style="color: #666; font-size: 1em;">Hello ${displayName}!</p>
          </div>
          <p style="font-size: 1.1em; line-height: 1.6; color: #333;">
            Welcome to Dolchi Co! Please verify your email address to complete your registration and start your style journey with us.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" style="background: #ff6b35; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 1.1em; font-weight: bold; display: inline-block; text-align: center;">
              Verify Email Address
            </a>
          </div>
          <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
            <p style="font-size: 1em; color: #333; margin-bottom: 8px;">
              <strong>Alternative: Enter this verification code manually:</strong>
            </p>
            <p style="font-size: 2em; font-weight: bold; color: #ff6b35; letter-spacing: 4px; margin: 0; font-family: 'Courier New', monospace;">
              ${otp}
            </p>
            <p style="font-size: 0.9em; color: #666; margin-top: 8px;">
              This code expires in 10 minutes
            </p>
          </div>
          <p style="font-size: 1em; color: #666; line-height: 1.6; text-align: center;">
            You can either click the button above or enter the verification code manually on our website.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <p style="font-size: 0.9em; color: #666;">
              Can't click the button? Copy and paste this link:
            </p>
            <p style="font-size: 0.8em; color: #007bff; word-break: break-all; background: #f8f9fa; padding: 8px; border-radius: 4px;">
              ${verificationUrl}
            </p>
          </div>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />
          <div style="background: #fff3cd; padding: 16px; border-radius: 6px; border-left: 4px solid #ffc107;">
            <p style="font-size: 0.9em; color: #856404; margin: 0;">
              <strong>Security Note:</strong> If you didn't request this verification, please ignore this email. Your account remains secure.
            </p>
          </div>
          <p style="font-size: 0.9em; color: #888; margin-top: 24px; text-align: center;">
            This email was sent by Dolchi Co. If you have questions, contact our support team.
          </p>
          <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #ddd;">
            <p style="font-size: 0.8em; color: #999;">
              © 2025 Dolchi Co. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };
    await sendEmail(mailOptions);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

// ===========================
// OTP-Only Email
// ===========================
/**
 * Sends an email with OTP only (no verification link).
 * @param {string} toEmail - Recipient email address
 * @param {string} [userName='User'] - User's name (optional)
 * @param {string} otp - OTP code
 * @param {string} [purpose='verification'] - Purpose of OTP
 * @returns {Promise<void>}
 * @throws {Error} If inputs are invalid or email sending fails
 */
export const sendOTPEmail = async (toEmail, userName = 'User', otp, purpose = 'verification') => {
  try {
    // Validate inputs
    if (!toEmail || typeof toEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      throw new Error('Invalid recipient email address');
    }
    if (userName && typeof userName !== 'string') {
      throw new Error('Invalid user name: must be a string');
    }
    if (!otp || typeof otp !== 'string') {
      throw new Error('Invalid OTP code');
    }
    if (typeof purpose !== 'string') {
      throw new Error('Invalid purpose: must be a string');
    }

    const mailOptions = {
      from: `"Dolchi Co" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Your ${purpose} code – Dolchi Co`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1a202c;">Hello ${userName}!</h1>
            <h2 style="color: #1a202c;">Your Verification Code</h2>
          </div>
          <p style="font-size: 1.1em; line-height: 1.6; color: #333; text-align: center;">
            Use this code to complete your ${purpose}:
          </p>
          <div style="background: #f0f8ff; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
            <p style="font-size: 2.5em; font-weight: bold; color: #d9673f; letter-spacing: 6px; margin: 0;">
              ${otp}
            </p>
            <p style="font-size: 1em; color: #666; margin-top: 12px;">
              This code expires in ${OTP_EXPIRATION_MINUTES} minutes
            </p>
          </div>
          <div style="background: #fff3cd; padding: 16px; border-radius: 6px; border-left: 4px solid #ffc107;">
            <p style="font-size: 0.9em; color: #856404; margin: 0;">
              <strong>Security Note:</strong> Never share this code with anyone. Dolchi Co will never ask for your verification code.
            </p>
          </div>
        </div>
      `,
    };
    await sendEmail(mailOptions);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};

// ===========================
// Password Reset Email
// ===========================
/**
 * Sends a password reset email with a reset link.
 * @param {string} toEmail - Recipient email address
 * @param {string} [userName] - User's name (optional)
 * @param {string} token - Password reset token
 * @returns {Promise<void>}
 * @throws {Error} If inputs are invalid or email sending fails
 */
export const sendResetPasswordEmail = async (toEmail, userName, token) => {
  try {
    // Validate inputs
    if (!toEmail || typeof toEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      throw new Error('Invalid recipient email address');
    }
    if (userName && typeof userName !== 'string') {
      throw new Error('Invalid user name: must be a string');
    }
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid reset token');
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'https://dolchico.com'}/reset-password?token=${token}`;
    const displayName = userName || 'Valued Customer';

    const mailOptions = {
      from: `"Dolchi Co" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Reset Your Password – Dolchi Co',
      html: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
          <h1 style="color: #1a202c;">Reset Your Password</h1>
          <p style="font-size: 1em; color: #666;">Hello ${displayName},</p>
          <p style="font-size: 1.1em; line-height: 1.6;">
            We received a request to reset your Dolchi Co password. Click the button below to set a new password. This link will expire in ${RESET_TOKEN_EXPIRATION_MINUTES} minutes.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #d9673f; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 1.1em; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <hr style="margin: 32px 0;" />
          <div style="background: #f8d7da; padding: 16px; border-radius: 6px; border-left: 4px solid #dc3545;">
            <p style="font-size: 0.9em; color: #721c24; margin: 0;">
              <strong>Important:</strong> If you did not request a password reset, you can safely ignore this email. Your account will remain secure.
            </p>
          </div>
        </div>
      `,
    };
    await sendEmail(mailOptions);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

// ===========================
// Account Activation Success Email
// ===========================
/**
 * Sends an account activation success email.
 * @param {string} toEmail - Recipient email address
 * @param {string} [userName] - User's name (optional)
 * @returns {Promise<void>}
 * @throws {Error} If inputs are invalid or email sending fails
 */
export const sendAccountActivatedEmail = async (toEmail, userName) => {
  try {
    // Validate inputs
    if (!toEmail || typeof toEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      throw new Error('Invalid recipient email address');
    }
    if (userName && typeof userName !== 'string') {
      throw new Error('Invalid user name: must be a string');
    }

    const displayName = userName || 'Valued Customer';

    const mailOptions = {
      from: `"Dolchi Co" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Account Activated – Welcome to Dolchi Co!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1a202c;">🎉 Account Activated!</h1>
          </div>
          <p style="font-size: 1.1em; line-height: 1.6;">
            Congratulations ${displayName}! Your Dolchi Co account has been successfully activated.
          </p>
          <p style="font-size: 1.1em; line-height: 1.6;">
            You can now enjoy all the benefits of being a Dolchi Co member:
          </p>
          <ul style="font-size: 1em; line-height: 1.8; color: #555;">
            <li>Browse our exclusive collection</li>
            <li>Get personalized recommendations</li>
            <li>Track your orders in real-time</li>
            <li>Access member-only deals</li>
          </ul>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://dolchico.com'}" style="background: #d9673f; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 1.1em; font-weight: bold; display: inline-block;">
              Start Shopping
            </a>
          </div>
          <hr style="margin: 32px 0;" />
          <p style="font-size: 1em; color: #555;">
            Welcome aboard!<br>
            The Dolchi Co Team
          </p>
        </div>
      `,
    };
    await sendEmail(mailOptions);
  } catch (error) {
    console.error('Error sending account activation email:', error);
    throw new Error(`Failed to send account activation email: ${error.message}`);
  }
};

// ===========================
// Login OTP Email
// ===========================
/**
 * Sends an OTP email for login verification.
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - OTP code
 * @returns {Promise<void>}
 * @throws {Error} If inputs are invalid or email sending fails
 */
export const sendLoginOTPEmail = async (toEmail, otp) => {
  try {
    // Validate inputs
    if (!toEmail || typeof toEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      throw new Error('Invalid recipient email address');
    }
    if (!otp || typeof otp !== 'string') {
      throw new Error('Invalid OTP code');
    }

    const purpose = 'login';
    const mailOptions = {
      from: `"Dolchi Co" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Your ${purpose} code – Dolchi Co`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1a202c;">Your Login Code</h1>
          </div>
          <p style="font-size: 1.1em; line-height: 1.6; color: #333; text-align: center;">
            Use this code to log in to your Dolchi Co account:
          </p>
          <div style="background: #f0f8ff; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
            <p style="font-size: 2.5em; font-weight: bold; color: #d9673f; letter-spacing: 6px; margin: 0;">
              ${otp}
            </p>
            <p style="font-size: 1em; color: #666; margin-top: 12px;">
              This code expires in ${OTP_EXPIRATION_MINUTES} minutes
            </p>
          </div>
          <div style="background: #fff3cd; padding: 16px; border-radius: 6px; border-left: 4px solid #ffc107;">
            <p style="font-size: 0.9em; color: #856404; margin: 0;">
              <strong>Security Note:</strong> Never share this code with anyone. Dolchi Co will never ask for your verification code.
            </p>
          </div>
        </div>
      `,
    };
    await sendEmail(mailOptions);
  } catch (error) {
    console.error('Error sending login OTP email:', error);
    throw new Error(`Failed to send login OTP email: ${error.message}`);
  }
};