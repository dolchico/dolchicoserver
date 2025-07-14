/* ----------  external deps  ---------- */
import validator from 'validator';
import bcrypt    from 'bcrypt';
import jwt       from 'jsonwebtoken';

/* ----------  internal services  ---------- */
import {
  findUserByEmail,
  findUserByPhone,
  createUser,
  verifyUserEmail,
  verifyUserPhone,
} from '../services/userService.js';

import {
  createEmailVerificationToken,
  findEmailVerificationToken,
  deleteEmailVerificationToken,
} from '../services/tokenService.js';

import { generateOTP, verifyOTP } from '../services/otpService.js';
import { sendOTP }                from '../services/smsService.js';
import { sendVerificationEmail }  from '../services/mailService.js';

/* ----------  helpers  ---------- */
const issueJwt = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/* ===================================================================== */
/* 1. USER REGISTRATION – email is required, phone is optional           */
/* ===================================================================== */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    /* duplicates ------------------------------------------------------ */
    if (await findUserByEmail(email))
      return res.status(409).json({ success: false, message: 'User already exists.' });

    if (phoneNumber && (await findUserByPhone(phoneNumber)))
      return res.status(409).json({ success: false, message: 'Phone number already in use.' });

    /* validation ------------------------------------------------------ */
    if (!validator.isEmail(email))
      return res.status(400).json({ success: false, message: 'Invalid e-mail address.' });

    if (!password || password.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

    if (phoneNumber && !validator.isMobilePhone(String(phoneNumber), 'any'))
      return res.status(400).json({ success: false, message: 'Invalid phone number.' });

    /* persistence ----------------------------------------------------- */
    const hashed = await bcrypt.hash(password, 10);

    const user = await createUser({
      name,
      email,
      password: hashed,
      phoneNumber: phoneNumber || null,
      emailVerified: false,
      phoneVerified: false,
      cartData: {},
    });

    /* e-mail verification -------------------------------------------- */
    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, user.name, token);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Check your e-mail to verify your account.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ===================================================================== */
/* 2. EMAIL / PASSWORD LOGIN                                             */
/* ===================================================================== */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user)
      return res.status(401).json({ success: false, message: 'User not found.' });

    if (!user.emailVerified)
      return res.status(403).json({ success: false, message: 'Verify your e-mail before logging in.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    return res.status(200).json({ success: true, token: issueJwt(user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ===================================================================== */
/* 3. EMAIL-VERIFICATION ENDPOINT                                        */
/* ===================================================================== */
export const verifyEmail = async (req, res) => {
  try {
    const token = req.body.token || req.query.token;
    if (!token)
      return res.status(400).json({ success: false, message: 'Verification token required.' });

    const record = await findEmailVerificationToken(token);
    if (!record)
      return res.status(400).json({ success: false, message: 'Invalid or expired token.' });

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

/* ===================================================================== */
/* 4. PHONE-BASED OTP LOGIN                                              */
/* ===================================================================== */

/* 4-a: request OTP (rate-limited in routes) */
export const requestPhoneLoginOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    const user = await findUserByPhone(phoneNumber);
    if (!user)
      return res.status(404).json({ success: false, message: 'No user with this phone number.' });

    const otp = await generateOTP(user.id);
    await sendOTP(phoneNumber, otp);

    return res.status(200).json({ success: true, message: 'OTP sent to your phone.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* 4-b: resend OTP (same logic as request) */
export const resendPhoneLoginOTP = requestPhoneLoginOTP;

/* 4-c: verify OTP & log in */
export const verifyPhoneLoginOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    const user = await findUserByPhone(phoneNumber);
    if (!user)
      return res.status(404).json({ success: false, message: 'No user with this phone number.' });

    const ok = await verifyOTP(user.id, otp);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP.' });

    /* first-time phone login → mark verified */
    if (!user.phoneVerified) await verifyUserPhone(user.id);

    return res.status(200).json({ success: true, token: issueJwt(user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
