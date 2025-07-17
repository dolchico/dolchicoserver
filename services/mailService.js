import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  family: 4,            // 👈 This line forces IPv4 instead of IPv6
});

// Welcome email
export const sendWelcomeEmail = async (toEmail, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Welcome to Dolchi Co – Your Style Journey Begins!',
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
        <h1 style="color: #1a202c;">Welcome to Dolchi Co, ${userName}!</h1>
        <p style="font-size: 1.1em; line-height: 1.6;">
          Thank you for joining <strong>Dolchi Co</strong> – where style meets comfort and every piece tells a story. We're thrilled to have you as part of our vibrant community of fashion lovers!
        </p>
        <p style="font-size: 1.1em; line-height: 1.6;">
          As a member, you'll enjoy:
        </p>
        <ul style="font-size: 1.1em; line-height: 1.6; margin-left: 20px;">
          <li>✨ Early access to new collections and exclusive drops</li>
          <li>✨ Special discounts and members-only offers</li>
          <li>✨ Personalized recommendations tailored to your style</li>
          <li>✨ Fast, secure checkout and easy order tracking</li>
        </ul>
        <p style="font-size: 1.1em; line-height: 1.6;">
          Ready to explore? <a href="https://dolchico.com" style="color: #4f46e5; text-decoration: underline;">Visit our shop</a> and discover the latest trends, timeless classics, and everything in between.
        </p>
        <p style="font-size: 1.1em; line-height: 1.6;">
          If you have any questions or need styling tips, our team is always here to help. Just reply to this email or reach out via our website chat.
        </p>
        <hr style="margin: 32px 0;" />
        <p style="font-size: 1em; color: #555;">
          Thank you for choosing Dolchi Co. We can’t wait to see how you style your next look!
        </p>
        <p style="font-size: 1em; color: #555;">
          With style,<br>
          The Dolchi Co Team
        </p>
        <div style="margin-top:32px; font-size:0.9em; color:#aaa;">
          <p>Follow us on 
            <a href="https://instagram.com/" style="color:#4f46e5;">Instagram</a> | 
            <a href="https://facebook.com/" style="color:#4f46e5;">Facebook</a>
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Email verification email
export const sendVerificationEmail = async (toEmail, userName, token) => {
  const verificationUrl = `${'https://dolchico-backend.up.railway.app'}/api/user/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Verify Your Email – Dolchi Co',
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
        <h1 style="color: #1a202c;">Verify your email, ${userName}!</h1>
        <p style="font-size: 1.1em; line-height: 1.6;">
          Thank you for registering with <strong>Dolchi Co</strong>!
        </p>
        <p style="font-size: 1.1em; line-height: 1.6;">
          Please verify your email address to activate your account:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verificationUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:1.1em;">
            Verify Email
          </a>
        </div>
        <p style="font-size: 1.1em; line-height: 1.6;">
          Or copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color:#4f46e5;">${verificationUrl}</a>
        </p>
        <hr style="margin: 32px 0;" />
        <p style="font-size: 1em; color: #555;">
          If you did not create this account, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
// Reset password email
export const sendResetPasswordEmail = async (toEmail, userName, token) => {
  const resetUrl = `${'https://dolchico.com'}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Reset Your Password – Dolchi Co',
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; background: #faf9f6; padding: 32px; border-radius: 12px;">
        <h1 style="color: #1a202c;">Reset your password, ${userName}</h1>
        <p style="font-size: 1.1em; line-height: 1.6;">
          We received a request to reset your Dolchi Co password.
        </p>
        <p style="font-size: 1.1em; line-height: 1.6;">
          Click the button below to set a new password for your account:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:1.1em;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 1.1em; line-height: 1.6;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color:#4f46e5;">${resetUrl}</a>
        </p>
        <hr style="margin: 32px 0;" />
        <p style="font-size: 1em; color: #555;">
          This link will expire for security reasons. If you did not request a password reset, you can safely ignore this email—your account will remain secure.
        </p>
        <p style="font-size: 1em; color: #555;">
          Need help? Contact our support team any time.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
