import dotenv from 'dotenv';
dotenv.config();
import { Resend } from 'resend';

// --- Constants ---
const RESET_TOKEN_EXPIRATION_MINUTES = 60; // Used in password reset email

// --- Resend Setup ---
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.MAIL_FROM || process.env.EMAIL_USER;
const FROM_NAME = process.env.MAIL_FROM_NAME || 'Dolchi Co';

/**
 * Internal helper to send an email via Resend.
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html
    });
  } catch (err) {
    console.error('❌ Resend error:', err);
    throw err;
  }
};

// ===========================
// Welcome Email
// ===========================
export const sendWelcomeEmail = async (toEmail, userName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
      <h1 style="color: #1a202c;">Welcome to Dolchi Co, ${userName}!</h1>
      <p>Thank you for joining <strong>Dolchi Co</strong> – where style meets comfort and every piece tells a story.</p>
      <p>Ready to explore? <a href="${process.env.FRONTEND_URL}" style="color: #4f46e5;">Visit our shop</a> and discover the latest trends.</p>
      <hr style="margin: 32px 0;" />
      <p>With style,<br>The Dolchi Co Team</p>
    </div>
  `;

  await sendEmail({
    to: toEmail,
    subject: 'Welcome to Dolchi Co – Your Style Journey Begins!',
    html
  });
};

// ===========================
// Email Verification Email
// ===========================
export const sendVerificationEmail = async (toEmail, userName, token, otp = null) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verifyemail?token=${token}`;
  const otpSection = otp
    ? `<p>Your one-time code (OTP) is: <strong>${otp}</strong></p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
      <h1>Verify your email, ${userName}!</h1>
      <p>Please verify your email to activate your account:</p>
      <p style="text-align:center;">
        <a href="${verificationUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a>
      </p>
      ${otpSection}
    </div>
  `;

  await sendEmail({
    to: toEmail,
    subject: 'Verify Your Email – Dolchi Co',
    html
  });
};

// ===========================
// Password Reset Email
// ===========================
export const sendResetPasswordEmail = async (toEmail, userName, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
      <h1>Reset your password, ${userName}</h1>
      <p>We received a request to reset your password. Click below to set a new one. This link expires in ${RESET_TOKEN_EXPIRATION_MINUTES} minutes.</p>
      <p style="text-align:center;">
        <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a>
      </p>
      <hr style="margin: 32px 0;" />
      <p>If you didn’t request this, just ignore this email. Your account is safe.</p>
    </div>
  `;

  await sendEmail({
    to: toEmail,
    subject: 'Reset Your Password – Dolchi Co',
    html
  });
};
