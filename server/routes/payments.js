const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, requireCustomer, requireAdmin } = require('../middleware/auth');
const { 
  validatePaymentIntent, 
  validateRefund, 
  validateId, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');

// Create payment intent
router.post('/create-payment-intent', 
  authenticateToken,
  requireCustomer,
  validatePaymentIntent,
  handleValidationErrors,
  paymentController.createPaymentIntent
);

// Confirm payment
router.post('/confirm-payment',
  authenticateToken,
  requireCustomer,
  paymentController.confirmPayment
);

// Stripe webhook (no auth required)
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// Get payment history for current user
router.get('/history',
  authenticateToken,
  requireCustomer,
  validatePagination,
  handleValidationErrors,
  paymentController.getPaymentHistory
);

// Get specific payment details
router.get('/:id',
  authenticateToken,
  requireCustomer,
  validateId,
  handleValidationErrors,
  paymentController.getPaymentDetails
);

// Initiate refund (customer can request, admin can process)
router.post('/:id/refund',
  authenticateToken,
  validateId,
  validateRefund,
  handleValidationErrors,
  paymentController.refundPayment
);

module.exports = router;