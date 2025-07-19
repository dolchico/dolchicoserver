
import validator from 'validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// --------- Internal services ----------
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

import { generateOTP, verifyOTP } from '../services/otpService.js';
import { sendOTP } from '../services/smsService.js';
import { sendVerificationEmail } from '../services/mailService.js';
import { updateProfile, findUserById } from '../services/userService.js';

// --------- Helper JWT issuer ----------
const issueJwt = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/* ===========================================================================
   1. User Registration (email required, phone optional) 
============================================================================ */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (await findUserByEmail(email)) {
      return res.status(409).json({ success: false, message: 'User already exists.' });
    }

    if (phoneNumber && await findUserByPhone(phoneNumber)) {
      return res.status(409).json({ success: false, message: 'Phone number already in use.' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid e-mail address.' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    if (phoneNumber && !validator.isMobilePhone(String(phoneNumber), 'any')) {
      return res.status(400).json({ success: false, message: 'Invalid phone number.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await createUser({
      name,
      email,
      password: hashed,
      phoneNumber: phoneNumber ?? null,
      emailVerified: false,
      phoneVerified: false,
      cartData: {}
    });

    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, user.name, token);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Check your e-mail to verify your account.'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ===========================================================================
   2. Email / Password Login
============================================================================ */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ success: false, message: 'Verify your e-mail before logging in.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    return res.status(200).json({ success: true, token: issueJwt(user.id) });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ===========================================================================
   3. Email Verification Endpoint
============================================================================ */
export const verifyEmail = async (req, res) => {
  try {
    const token = req.body.token || req.query.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token required.' });
    }

    const record = await findEmailVerificationToken(token);
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    }

    if (new Date() > record.expiresAt) {
      await deleteEmailVerificationToken(token);
      return res.status(410).json({ success: false, message: 'Verification token expired.' });
    }

    await verifyUserEmail(record.userId);
    await deleteEmailVerificationToken(token);

    return res.status(200).json({ success: true, message: 'E-mail verified. You may now log in.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ===========================================================================
   4. Phone-based OTP Login
============================================================================ */

/* 4a: Request OTP (rate-limited in routes) */
export const requestPhoneLoginOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await findUserByPhone(phoneNumber);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user with this phone number.' });
    }

    const otp = await generateOTP(user.id);
    await sendOTP(phoneNumber, otp);

    return res.status(200).json({ success: true, message: 'OTP sent to your phone.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* 4b: Resend OTP */
export const resendPhoneLoginOTP = requestPhoneLoginOTP;

/* 4c: Verify OTP & login */
export const verifyPhoneLoginOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    const user = await findUserByPhone(phoneNumber);

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user with this phone number.' });
    }

    const ok = await verifyOTP(user.id, otp);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    if (!user.phoneVerified) {
      await verifyUserPhone(user.id);
    }

    return res.status(200).json({ success: true, token: issueJwt(user.id) });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


export const updateUserProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ success: false, message: 'No update fields provided.' });
    }

    const userId = req.user.id;

    // Prepare the update fields
    const updateFields = { ...req.body };

    if (updateFields.email !== undefined) {
      updateFields.emailVerified = false;
    }
    if (updateFields.phoneNumber !== undefined) {
      updateFields.phoneVerified = false;
    }

    await updateProfile(userId, updateFields);

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) {
    let msg = err.message || 'Profile update failed';
    if (err.code === 'P2002') {
      msg = 'Email or phone number already exists.';
    }
    res.status(400).json({ success: false, message: msg });
  }
};
