import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

// --- Constants ---
const RESET_TOKEN_EXPIRATION_MINUTES = 60; // Consistent with the service layer

// --- Nodemailer Transporter Setup ---
// This configuration is solid, using environment variables for security.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  family: 4, // Forces IPv4, a common fix for hosting environment issues.
});


// --- Email Functions ---

/**
 * Sends a welcome email to a new user.
 */
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
          Ready to explore? <a href="${'https://dolchico.com'}" style="color: #4f46e5; text-decoration: underline;">Visit our shop</a> and discover the latest trends, timeless classics, and everything in between.
        </p>
        <hr style="margin: 32px 0;" />
        <p style="font-size: 1em; color: #555;">
          With style,<br>
          The Dolchi Co Team
        </p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

/**
 * Sends an email with a verification link.
 */
export const sendVerificationEmail = async (toEmail, userName, token) => {
  const verificationUrl = `${'https://valyris-i.onrender.com'}/api/user/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Dolchi Co" <${'https://valyris-i.onrender.com'}>`,
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
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

/**
 * Sends a password reset email.
 */
export const sendResetPasswordEmail = async (toEmail, userName, token) => {
  const resetUrl = `${'https://dolchico.com'}/reset-password?token=${token}`;

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
  await transporter.sendMail(mailOptions);
};
