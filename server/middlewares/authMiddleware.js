const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'smriti-jwt-secret-production-grade-2026';

/**
 * Middleware: Verify Bearer JWT Token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token missing or malformed. Format: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authorization token'
      });
    }

    // Attach user payload
    req.userId = decoded.id;
    req.userRole = decoded.role;

    // Optionally populate user if DB is accessible
    try {
      const user = await User.findById(decoded.id).select('-password -otp');
      if (user) {
        req.user = user;
        req.userRole = user.role || req.userRole;
      } else {
        req.user = { _id: decoded.id, id: decoded.id, role: decoded.role };
      }
    } catch {
      // In case MongoDB isn't connected or for Supabase-token fallback
      req.user = { _id: decoded.id, id: decoded.id, role: decoded.role };
    }

    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error);
    return res.status(500).json({ success: false, message: 'Authentication internal error' });
  }
};

/**
 * Middleware: Enforce Role Gatekeeper
 * @param {string[]} allowedRoles - List of authorized roles
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.userRole && (!req.user || !req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: No role found in request context'
      });
    }

    const currentRole = req.userRole || req.user.role;
    if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Authorized roles: [${allowedRoles.join(', ')}]. Current role: ${currentRole}`
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
  JWT_SECRET
};
