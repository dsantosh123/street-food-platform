const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT Token
exports.authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const [users] = await db.execute(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account deactivated'
      });
    }

    // Add user info to request
    req.user = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Check user role
exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    
    // Allow if user has required role
    if (roles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  };
};

// Check if user is admin
exports.requireAdmin = exports.requireRole(['admin']);

// Check if user is vendor
exports.requireVendor = exports.requireRole(['vendor', 'admin']);

// Check if user is customer
exports.requireCustomer = exports.requireRole(['customer', 'admin']);

// Check if user is vendor or admin
exports.requireVendorOrAdmin = exports.requireRole(['vendor', 'admin']);

// Check if user owns the resource or is admin
exports.requireOwnershipOrAdmin = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      const userId = req.user.userId;
      const resourceId = req.params.id;

      let query;
      let params;

      switch (resourceType) {
        case 'order':
          query = 'SELECT customer_id FROM orders WHERE id = ?';
          params = [resourceId];
          break;
        case 'vendor':
          query = 'SELECT user_id FROM vendors WHERE id = ?';
          params = [resourceId];
          break;
        case 'menu_item':
          query = 'SELECT v.user_id FROM menu_items m JOIN vendors v ON m.vendor_id = v.id WHERE m.id = ?';
          params = [resourceId];
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type'
          });
      }

      const [results] = await db.execute(query, params);

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      const ownerId = results[0].customer_id || results[0].user_id;

      if (ownerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Optional authentication (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await db.execute(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length > 0 && users[0].status === 'active') {
      req.user = {
        userId: users[0].id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role
      };
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};