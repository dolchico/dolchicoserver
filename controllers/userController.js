import validator from 'validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  findUserByPhone,
  createUser,
  verifyUserEmail,
  verifyUserPhone
} from '../services/userService.js';
import {
  createEmailVerificationToken,
  findEmailVerificationToken,
  deleteEmailVerificationToken
} from '../services/tokenService.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/mailService.js';

// JWT helper
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// User Registration
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Duplicate checks
    if (await findUserByEmail(email)) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }
    if (phoneNumber && await findUserByPhone(phoneNumber)) {
      return res.status(409).json({ success: false, message: 'Phone number already in use' });
    }

    // Validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    if (phoneNumber && !validator.isMobilePhone(phoneNumber + '', 'any')) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      phoneNumber: phoneNumber || null,
      emailVerified: false,
      phoneVerified: false,
      cartData: {},
    });

    // Generate and store email verification token
    const token = await createEmailVerificationToken(user.id);

    // Send verification email
    await sendVerificationEmail(user.email, user.name, token);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// User Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: "User doesn't exist" });
    }

    // Email verification check
    if (!user.emailVerified) {
      return res.status(403).json({ success: false, message: "Please verify your email before logging in." });
    }

    // Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Issue JWT
    const token = createToken(user.id);
    return res.status(200).json({ success: true, token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Email Verification Endpoint
export const verifyEmail = async (req, res) => {
  try {
    const token = req.body.token || req.query.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const record = await findEmailVerificationToken(token);
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }

    if (new Date() > record.expiresAt) {
      await deleteEmailVerificationToken(token);
      return res.status(410).json({ success: false, message: 'Verification token has expired.' });
    }

    await verifyUserEmail(record.userId);
    await deleteEmailVerificationToken(token);

    return res.status(200).json({ success: true, message: 'Email verified successfully. You may now log in.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

