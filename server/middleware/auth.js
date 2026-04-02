import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware: Authenticate user by verifying JWT token in Authorization header
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account has been blocked' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Token verification failed' });
  }
};

/**
 * Middleware factory: Authorize user roles for access control
 * @param  {...string} roles Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

/**
 * Helper function: Generate JWT token for a given user
 * @param {Object} user User document/model instance
 * @returns {string} JWT token
 */
export const generateTokenForUser = (user) => {
  const payload = {
    id: user._id.toString(),
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};
