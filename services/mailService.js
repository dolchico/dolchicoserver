// --- FILE: services/mailService.js ---

import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

// --- Constants ---
const RESET_TOKEN_EXPIRATION_MINUTES = 60; // Used in password reset email
const OTP_EXPIRATION_MINUTES = 10; // OTP expiration time

// --- Nodemailer Transporter Setup ---
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can adjust the service/provider as needed
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  family: 4,
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter configuration error:', error);
  } else {
    console.log('Email transporter is ready to send messages');
  }
});

// --- General Send Email Function ---
/**
 * Internal helper to send an email.
 * @param {Object} mailOptions - Same as Nodemailer mailOptions
 */
const sendEmail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
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
export const sendWelcomeEmail = async (toEmail, userName) => {
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
};

// ===========================
// Email Verification Email (Updated for new registration flow)
// ===========================
/**
 * Send an email with a verification link and OTP
 * @param {String} toEmail - Recipient email
 * @param {String} token - Verification token for link generation
 * @param {String} otp - OTP code for verification
 * @param {String} userName - Optional user name (can be empty for new registrations)
 */
export const sendVerificationEmail = async (toEmail, token, otp, userName = null) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'https://dolchico.com'}/verifyemail?token=${token}`;
  
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
          <a href="${verificationUrl}" style="background: #d9673f; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 1.1em; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <p style="font-size: 1em; color: #333; margin-bottom: 8px;">
            <strong>Your verification code:</strong>
          </p>
          <p style="font-size: 2em; font-weight: bold; color: #d9673f; letter-spacing: 4px; margin: 0;">
            ${otp}
          </p>
          <p style="font-size: 0.9em; color: #666; margin-top: 8px;">
            This code expires in ${OTP_EXPIRATION_MINUTES} minutes
          </p>
        </div>
        
        <p style="font-size: 1em; color: #666; line-height: 1.6;">
          You can either click the button above or enter the verification code manually in the app.
        </p>
        
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />
        
        <div style="background: #fff3cd; padding: 16px; border-radius: 6px; border-left: 4px solid #ffc107;">
          <p style="font-size: 0.9em; color: #856404; margin: 0;">
            <strong>Security Note:</strong> If you didn't request this verification, please ignore this email. Your account remains secure.
          </p>
        </div>
        
        <p style="font-size: 0.9em; color: #888; margin-top: 24px; text-align: center;">
          This email was sent by Dolchi Co. If you have questions, contact our support team.
        </p>
      </div>
    `,
  };
  
  await sendEmail(mailOptions);
};

// ===========================
// OTP-Only Email (for cases where you only need to send OTP)
// ===========================
/**
 * Send an email with OTP only (no verification link)
 * @param {String} toEmail - Recipient email
 * @param {String} otp - OTP code
 * @param {String} purpose - Purpose of OTP (verification, login, etc.)
 */
export const sendOTPEmail = async (toEmail, otp, purpose = 'verification') => {
  const mailOptions = {
    from: `"Dolchi Co" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Your ${purpose} code – Dolchi Co`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1a202c;">Your Verification Code</h1>
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
};

// ===========================
// Password Reset Email
// ===========================
export const sendResetPasswordEmail = async (toEmail, userName, token) => {
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
};

// ===========================
// Account Activation Success Email
// ===========================
export const sendAccountActivatedEmail = async (toEmail, userName) => {
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
};

/**
 * Send an OTP email specifically for login verification
 * @param {String} toEmail - Recipient email address
 * @param {String} otp - One-Time Password code
 */
export const sendLoginOTPEmail = async (toEmail, otp) => {
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
};

