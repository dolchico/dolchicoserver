import jwt from 'jsonwebtoken';

export const ensureAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // 'id' should be a field in your JWT payload
      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }
  return res.status(401).json({ message: 'Authentication required' });
};
