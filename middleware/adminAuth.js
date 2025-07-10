import jwt from 'jsonwebtoken';

const adminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: "Not Authorized. Login again." });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.email || decoded.email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ success: false, message: "Not Authorized. Admin access only." });
    }

    req.admin = decoded; // Optional: attach admin info
    next();
  } catch (error) {
    console.error('adminAuth error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export default adminAuth;
