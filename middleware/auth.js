import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not Authorized. Login again.',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Optional: Add additional user validation
    if (!decoded.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth Error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Catch any other JWT-related errors
    res.status(401).json({ 
      success: false, 
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

export default authUser;
