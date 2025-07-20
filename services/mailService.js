// --- FILE: services/mailService.js ---

import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

// --- Constants ---
const RESET_TOKEN_EXPIRATION_MINUTES = 60; // Used in password reset email

// --- Nodemailer Transporter Setup ---
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can adjust the service/provider as needed
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  family: 4,
});

// --- General Send Email Function ---
/**
 * Internal helper to send an email.
 * @param {Object} mailOptions - Same as Nodemailer mailOptions
 */
const sendEmail = async (mailOptions) => {
  await transporter.sendMail(mailOptions);
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
        <h1 style="color: #1a202c;">Welcome to Dolchi Co, ${userName}!</h1>
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
// Email Verification Email
// ===========================
/**
 * Send an email with a verification link (and optionally an OTP)
 * @param {String} toEmail
 * @param {String} userName
 * @param {String} token         Verification token for link generation
 * @param {String|null} otp      Optional OTP code (included if present)
 */
export const sendVerificationEmail = async (toEmail, userName, token, otp = null) => {
  const verificationUrl = `https://dolchico.com/verifyemail?token=${token}`;
  let otpSection = '';
  if (otp) {
    otpSection = `
      <p style="font-size: 1.1em; line-height: 1.6; color: #333; margin-top:32px;">
        Your one-time verification code (OTP) is:<br>
        <span style="font-size: 1.3em; font-weight: bold; color: #4f46e5;">${otp}</span>
      </p>
      <p style="font-size: 1em; color: #555;">
        If you did not request this, simply ignore this email.
      </p>
    `;
  }

  const mailOptions = {
    from: `"Dolchi Co" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Verify Your Email – Dolchi Co',
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
        <h1 style="color: #1a202c;">Verify your email, ${userName}!</h1>
        <p style="font-size: 1.1em; line-height: 1.6;">
          Please verify your email address to activate your account:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verificationUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:1.1em;">
            Verify Email
          </a>
        </div>
        ${otpSection}
      </div>
    `,
  };
  await sendEmail(mailOptions);
};


// ===========================
// Password Reset Email
// ===========================
export const sendResetPasswordEmail = async (toEmail, userName, token) => {
  const resetUrl = `https://dolchico.com/reset-password?token=${token}`;
  const mailOptions = {
    from: `"Dolchi Co" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset Your Password – Dolchi Co',
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
        <h1 style="color: #1a202c;">Reset your password, ${userName}</h1>
        <p style="font-size: 1.1em; line-height: 1.6;">
          We received a request to reset your Dolchi Co password. Click the button below to set a new password. This link will expire in ${RESET_TOKEN_EXPIRATION_MINUTES} minutes.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:1.1em;">
            Reset Password
          </a>
        </div>
        <hr style="margin: 32px 0;" />
        <p style="font-size: 1em; color: #555;">
          If you did not request a password reset, you can safely ignore this email—your account will remain secure.
        </p>
      </div>
    `,
  };
  await sendEmail(mailOptions);
};
