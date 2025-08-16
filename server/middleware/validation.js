const { body, param, query, validationResult } = require('express-validator');

// Common validation rules
const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');

const phoneValidation = body('phone')
  .isMobilePhone('en-IN')
  .withMessage('Please provide a valid Indian mobile number');

const nameValidation = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Name must be between 2 and 50 characters')
  .matches(/^[a-zA-Z\s]+$/)
  .withMessage('Name should only contain letters and spaces');

// Auth validations
exports.validateRegistration = [
  nameValidation,
  emailValidation,
  passwordValidation,
  phoneValidation,
  body('role')
    .optional()
    .isIn(['customer', 'vendor'])
    .withMessage('Role must be either customer or vendor'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters')
];

exports.validateLogin = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

exports.validateUpdateProfile = [
  nameValidation,
  phoneValidation,
  body('address')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters')
];

exports.validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

exports.validateForgotPassword = [
  emailValidation
];

exports.validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Vendor validations
exports.validateVendorRegistration = [
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('address')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate'),
  body('cuisineType')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Cuisine type must be between 2 and 50 characters'),
  phoneValidation
];

exports.validateVendorUpdate = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate'),
  body('cuisineType')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Cuisine type must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number')
];

// Menu item validations
exports.validateMenuItemCreate = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 300 })
    .withMessage('Description must be between 10 and 300 characters'),
  body('price')
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Price must be between ₹1 and ₹10,000'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('preparationTime')
    .isInt({ min: 1, max: 180 })
    .withMessage('Preparation time must be between 1 and 180 minutes'),
  body('isVeg')
    .isBoolean()
    .withMessage('Vegetarian status must be true or false'),
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('Availability status must be true or false')
];

exports.validateMenuItemUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 300 })
    .withMessage('Description must be between 10 and 300 characters'),
  body('price')
    .optional()
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Price must be between ₹1 and ₹10,000'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('preparationTime')
    .optional()
    .isInt({ min: 1, max: 180 })
    .withMessage('Preparation time must be between 1 and 180 minutes'),
  body('isVeg')
    .optional()
    .isBoolean()
    .withMessage('Vegetarian status must be true or false'),
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('Availability status must be true or false')
];

// Order validations
exports.validateOrderCreate = [
  body('vendorId')
    .isInt({ min: 1 })
    .withMessage('Valid vendor ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.menuItemId')
    .isInt({ min: 1 })
    .withMessage('Valid menu item ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  body('deliveryAddress')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Delivery address must be between 10 and 200 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes must be less than 200 characters')
];

exports.validateOrderStatusUpdate = [
  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'])
    .withMessage('Invalid order status')
];

// Payment validations
exports.validatePaymentIntent = [
  body('orderId')
    .isInt({ min: 1 })
    .withMessage('Valid order ID is required'),
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .optional()
    .isIn(['inr', 'usd'])
    .withMessage('Currency must be INR or USD')
];

exports.validateRefund = [
  body('amount')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Refund amount must be greater than 0'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason must be less than 200 characters')
];

// Review validations
exports.validateReviewCreate = [
  body('orderId')
    .isInt({ min: 1 })
    .withMessage('Valid order ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment must be less than 500 characters')
];

// Parameter validations
exports.validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required')
];

// Query validations
exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

exports.validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  query('isVeg')
    .optional()
    .isBoolean()
    .withMessage('Vegetarian filter must be true or false'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number')
];

exports.validateLocation = [
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate'),
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 50 })
    .withMessage('Radius must be between 0.1 and 50 km')
];

// Custom validation middleware to handle errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Sanitize input
exports.sanitizeInput = (req, res, next) => {
  // Remove any potential XSS characters
  for (let key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+="[^"]*"/gi, '');
    }
  }
  next();
};