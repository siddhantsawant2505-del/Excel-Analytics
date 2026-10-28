import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware: Authenticate user by verifying JWT token in Authorization header
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    
    if (!token) {
      return res.status(401).json({ message: 'No authorization token provided' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      return res.status(500).json({ message: 'Authentication configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token: user not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account has been blocked' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    return res.status(401).json({ message: 'Token verification failed' });
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
 * Helper function: Generate JWT token for a given user or user ID
 * @param {Object|string} user User document or user id
 * @returns {string} JWT token
 */
export const generateTokenForUser = (user) => {
  const userId = typeof user === 'object' && user !== null ? user._id?.toString() || user.id : user;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

export const generateToken = generateTokenForUser;
