import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Wrapper function for sending emails (inspired by sendVerificationEmail's structure)
async function sendEmail(mailOptions) {
  try {
    // Verify transporter configuration
    await transporter.verify();
    console.log('Transporter verified successfully');

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', {
      message: error.message,
      stack: error.stack,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

// Test email function
async function testEmail() {
  try {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Missing EMAIL_USER or EMAIL_PASSWORD in .env file');
    }

    console.log('Verifying Nodemailer config:', {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD ? '[REDACTED]' : undefined,
    });

    const mailOptions = {
      from: `"Test" <${process.env.EMAIL_USER}>`,
      to: 'sakshamjais100@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email.',
      html: '<p>This is a test email.</p>',
    };

    await sendEmail(mailOptions);
    console.log('Test email sent successfully');
  } catch (error) {
    console.error('Test email error:', {
      message: error.message,
      stack: error.stack,
    });
  }
}

// Run the test
testEmail();