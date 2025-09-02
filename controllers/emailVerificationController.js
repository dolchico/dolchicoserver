// controllers/emailVerificationController.js
import { findEmailVerificationToken, markEmailTokenUsed } from '../services/tokenService.js';
import { verifyUserEmail, findUserById } from '../services/userService.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dolchico.com';

export async function verifyEmailByLink(req, res) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid verification token.' });
    }

    const record = await findEmailVerificationToken(token);
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid verification link.' });
    }
    if (record.usedAt) {
      return res.status(400).json({ success: false, message: 'Link already used.' });
    }
    if (record.expiresAt <= new Date()) {
      return res.status(400).json({ success: false, message: 'Link expired.' });
    }

    const user = await findUserById(record.userId);
    if (!user || !user.email) {
      return res.status(400).json({ success: false, message: 'User not found.' });
    }

    await verifyUserEmail(record.userId);
    await markEmailTokenUsed(token);

    return res.redirect(302, `${FRONTEND_URL}/verifyemail/success`);
  } catch (err) {
    console.error('verifyEmailByLink error:', err);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
}
