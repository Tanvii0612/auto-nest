/**
 * middleware/authMiddleware.js
 * Protects routes by verifying the JWT sent in the Authorization header.
 * Usage: add `protect` to any route that needs a logged-in user.
 *        add `adminOnly` after `protect` for admin-only routes.
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — verifies JWT and attaches user to req.user
 * The frontend must send: Authorization: Bearer <token>
 */
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided',
    });
  }

  try {
    // Verify the token using our secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (exclude password)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists',
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — invalid or expired token',
    });
  }
};

/**
 * adminOnly — must be used AFTER protect middleware
 * Blocks access if user is not an admin
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied — admin only',
  });
};

module.exports = { protect, adminOnly };
