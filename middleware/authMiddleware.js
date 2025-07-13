export const ensureAuth = (req, res, next) => {
  // Check for session-based auth first
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Check for JWT token as fallback
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Let route-specific middleware handle JWT validation
    return next();
  }
  
  res.status(401).json({ message: 'Authentication required' });
};
