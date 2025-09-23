import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// GET /api/debug/token
// Returns raw Authorization header token, jwt.decode output and jwt.verify result (or error)
router.get('/token', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const raw = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  const decoded = raw ? jwt.decode(raw, { complete: true }) : null;

  let verified = null;
  let verifyError = null;
  if (raw) {
    try {
      verified = jwt.verify(raw, process.env.JWT_SECRET);
    } catch (err) {
      verifyError = { name: err.name, message: err.message };
    }
  }

  return res.json({
    rawTokenPresent: !!raw,
    raw,
    decoded,
    verified,
    verifyError,
    jwtSecretConfigured: !!process.env.JWT_SECRET
  });
});

export default router;
