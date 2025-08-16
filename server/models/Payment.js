const { promisePool } = require('../config/database');

class Payment {
  constructor(paymentData) {
    this.id = paymentData.id;
    this.orderId = paymentData.order_id;
    this.stripePaymentIntentId = paymentData.stripe_payment_intent_id;
    this.stripeSessionId = paymentData.stripe_session_id;
    this.amount = paymentData.amount;
    this.currency = paymentData.currency;
    this.status = paymentData.status;
    this.paymentMethod = paymentData.payment_method;
    this.transactionId = paymentData.transaction_id;
    this.refundAmount = paymentData.refund_amount;
    this.createdAt = paymentData.created_at;
    this.updatedAt = paymentData.updated_at;
  }

  // Create new payment record
  static async create(paymentData) {
    try {
      const [result] = await promisePool.execute(
        `INSERT INTO payments (order_id, stripe_payment_intent_id, stripe_session_id, 
         amount, currency, status, payment_method, transaction_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentData.orderId,
          paymentData.stripePaymentIntentId || null,
          paymentData.stripeSessionId || null,
          paymentData.amount,
          paymentData.currency || 'USD',
          paymentData.status || 'pending',
          paymentData.paymentMethod || null,
          paymentData.transactionId || null
        ]
      );

      return await Payment.findById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating payment: ${error.message}`);
    }
  }

  // Find payment by ID
  static async findById(id) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT p.*, o.order_number, o.customer_id, o.vendor_id 
         FROM payments p 
         JOIN orders o ON p.order_id = o.id 
         WHERE p.id = ?`,
        [id]
      );

      if (rows.length === 0) return null;
      
      const payment = new Payment(rows[0]);
      payment.orderNumber = rows[0].order_number;
      payment.customerId = rows[0].customer_id;
      payment.vendorId = rows[0].vendor_id;
      
      return payment;
    } catch (error) {
      throw new Error(`Error finding payment by ID: ${error.message}`);
    }
  }

  // Find payment by order ID
  static async findByOrderId(orderId) {
    try {
      const [rows] = await promisePool.execute(
        'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
        [orderId]
      );

      if (rows.length === 0) return null;
      return new Payment(rows[0]);
    } catch (error) {
      throw new Error(`Error finding payment by order ID: ${error.message}`);
    }
  }

  // Find payment by Stripe payment intent ID
  static async findByStripePaymentIntentId(paymentIntentId) {
    try {
      const [rows] = await promisePool.execute(
        'SELECT * FROM payments WHERE stripe_payment_intent_id = ?',
        [paymentIntentId]
      );

      if (rows.length === 0) return null;
      return new Payment(rows[0]);
    } catch (error) {
      throw new Error(`Error finding payment by Stripe payment intent ID: ${error.message}`);
    }
  }

  // Find payment by Stripe session ID
  static async findByStripeSessionId(sessionId) {
    try {
      const [rows] = await promisePool.execute(
        'SELECT * FROM payments WHERE stripe_session_id = ?',
        [sessionId]
      );

      if (rows.length === 0) return null;
      return new Payment(rows[0]);
    } catch (error) {
      throw new Error(`Error finding payment by Stripe session ID: ${error.message}`);
    }
  }

  // Update payment status
  static async updateStatus(id, status, transactionId = null) {
    try {
      const fields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
      const values = [status];

      if (transactionId) {
        fields.push('transaction_id = ?');
        values.push(transactionId);
      }

      values.push(id);

      await promisePool.execute(
        `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return await Payment.findById(id);
    } catch (error) {
      throw new Error(`Error updating payment status: ${error.message}`);
    }
  }

  // Update payment by Stripe payment intent ID
  static async updateByStripePaymentIntentId(paymentIntentId, updateData) {
    try {
      const allowedFields = ['status', 'payment_method', 'transaction_id'];
      const fields = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(paymentIntentId);

      await promisePool.execute(
        `UPDATE payments SET ${fields.join(', ')} WHERE stripe_payment_intent_id = ?`,
        values
      );

      return await Payment.findByStripePaymentIntentId(paymentIntentId);
    } catch (error) {
      throw new Error(`Error updating payment by Stripe payment intent ID: ${error.message}`);
    }
  }

  // Process refund
  static async processRefund(id, refundAmount, reason = null) {
    try {
      await promisePool.execute(
        `UPDATE payments SET status = 'refunded', refund_amount = ?, 
         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [refundAmount, id]
      );

      // Log refund transaction (you might want to create a separate refunds table)
      // For now, we'll just update the payment record

      return await Payment.findById(id);
    } catch (error) {
      throw new Error(`Error processing refund: ${error.message}`);
    }
  }

  // Get payments by customer ID
  static async getByCustomerId(customerId, filters = {}) {
    try {
      let query = `
        SELECT p.*, o.order_number, v.business_name as vendor_name 
        FROM payments p 
        JOIN orders o ON p.order_id = o.id 
        JOIN vendors v ON o.vendor_id = v.id 
        WHERE o.customer_id = ?
      `;
      const params = [customerId];

      // Apply filters
      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      if (filters.fromDate) {
        query += ' AND p.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND p.created_at <= ?';
        params.push(filters.toDate);
      }

      query += ' ORDER BY p.created_at DESC';

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const payment = new Payment(row);
        payment.orderNumber = row.order_number;
        payment.vendorName = row.vendor_name;
        return payment;
      });
    } catch (error) {
      throw new Error(`Error getting payments by customer: ${error.message}`);
    }
  }

  // Get payments by vendor ID
  static async getByVendorId(vendorId, filters = {}) {
    try {
      let query = `
        SELECT p.*, o.order_number, u.first_name, u.last_name, u.email 
        FROM payments p 
        JOIN orders o ON p.order_id = o.id 
        JOIN users u ON o.customer_id = u.id 
        WHERE o.vendor_id = ?
      `;
      const params = [vendorId];

      // Apply filters
      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      if (filters.fromDate) {
        query += ' AND p.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND p.created_at <= ?';
        params.push(filters.toDate);
      }

      query += ' ORDER BY p.created_at DESC';

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const payment = new Payment(row);
        payment.orderNumber = row.order_number;
        payment.customerName = `${row.first_name} ${row.last_name}`;
        payment.customerEmail = row.email;
        return payment;
      });
    } catch (error) {
      throw new Error(`Error getting payments by vendor: ${error.message}`);
    }
  }

  // Get all payments (admin)
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT p.*, o.order_number, o.customer_id, o.vendor_id,
               u.first_name, u.last_name, u.email,
               v.business_name as vendor_name
        FROM payments p 
        JOIN orders o ON p.order_id = o.id 
        JOIN users u ON o.customer_id = u.id 
        JOIN vendors v ON o.vendor_id = v.id 
        WHERE 1=1
      `;
      const params = [];

      // Apply filters
      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      if (filters.vendorId) {
        query += ' AND o.vendor_id = ?';
        params.push(filters.vendorId);
      }

      if (filters.customerId) {
        query += ' AND o.customer_id = ?';
        params.push(filters.customerId);
      }

      if (filters.fromDate) {
        query += ' AND p.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND p.created_at <= ?';
        params.push(filters.toDate);
      }

      if (filters.minAmount) {
        query += ' AND p.amount >= ?';
        params.push(filters.minAmount);
      }

      if (filters.maxAmount) {
        query += ' AND p.amount <= ?';
        params.push(filters.maxAmount);
      }

      query += ' ORDER BY p.created_at DESC';

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const payment = new Payment(row);
        payment.orderNumber = row.order_number;
        payment.customerName = `${row.first_name} ${row.last_name}`;
        payment.customerEmail = row.email;
        payment.vendorName = row.vendor_name;
        return payment;
      });
    } catch (error) {
      throw new Error(`Error getting all payments: ${error.message}`);
    }
  }

  // Get payment statistics
  static async getStats(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
          COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_payments,
          COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount END), 0) as total_revenue,
          COALESCE(SUM(refund_amount), 0) as total_refunds,
          COALESCE(AVG(CASE WHEN status = 'succeeded' THEN amount END), 0) as average_payment_amount
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.vendorId) {
        query += ' AND o.vendor_id = ?';
        params.push(filters.vendorId);
      }

      if (filters.customerId) {
        query += ' AND o.customer_id = ?';
        params.push(filters.customerId);
      }

      if (filters.fromDate) {
        query += ' AND p.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND p.created_at <= ?';
        params.push(filters.toDate);
      }

      const [stats] = await promisePool.execute(query, params);
      return stats[0];
    } catch (error) {
      throw new Error(`Error getting payment stats: ${error.message}`);
    }
  }

  // Get daily revenue for a date range
  static async getDailyRevenue(fromDate, toDate, vendorId = null) {
    try {
      let query = `
        SELECT 
          DATE(p.created_at) as date,
          COUNT(*) as payment_count,
          SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END) as revenue,
          COALESCE(SUM(p.refund_amount), 0) as refunds
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE p.created_at >= ? AND p.created_at <= ?
      `;
      const params = [fromDate, toDate];

      if (vendorId) {
        query += ' AND o.vendor_id = ?';
        params.push(vendorId);
      }

      query += ' GROUP BY DATE(p.created_at) ORDER BY date';

      const [rows] = await promisePool.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Error getting daily revenue: ${error.message}`);
    }
  }

  // Get payment methods statistics
  static async getPaymentMethodStats(filters = {}) {
    try {
      let query = `
        SELECT 
          p.payment_method,
          COUNT(*) as count,
          SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END) as total_amount
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE p.payment_method IS NOT NULL
      `;
      const params = [];

      if (filters.vendorId) {
        query += ' AND o.vendor_id = ?';
        params.push(filters.vendorId);
      }

      if (filters.fromDate) {
        query += ' AND p.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND p.created_at <= ?';
        params.push(filters.toDate);
      }

      query += ' GROUP BY p.payment_method ORDER BY count DESC';

      const [rows] = await promisePool.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Error getting payment method stats: ${error.message}`);
    }
  }

  // Get total payment count for filters (useful for pagination)
  static async getCount(filters = {}) {
    try {
      let query = `
        SELECT COUNT(*) as total
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      if (filters.vendorId) {
        query += ' AND o.vendor_id = ?';
        params.push(filters.vendorId);
      }

      if (filters.customerId) {
        query += ' AND o.customer_id = ?';
        params.push(filters.customerId);
      }

      if (filters.fromDate) {
        query += ' AND p.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND p.created_at <= ?';
        params.push(filters.toDate);
      }

      const [result] = await promisePool.execute(query, params);
      return result[0].total;
    } catch (error) {
      throw new Error(`Error getting payment count: ${error.message}`);
    }
  }

  // Validate payment status
  static isValidStatus(status) {
    const validStatuses = ['pending', 'succeeded', 'failed', 'refunded', 'cancelled'];
    return validStatuses.includes(status);
  }

  // Delete payment record (soft delete - mark as cancelled)
  static async delete(id) {
    try {
      await promisePool.execute(
        'UPDATE payments SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      return true;
    } catch (error) {
      throw new Error(`Error deleting payment: ${error.message}`);
    }
  }

  // Instance method to update current payment
  async update(updateData) {
    try {
      const allowedFields = ['status', 'payment_method', 'transaction_id', 'refund_amount'];
      const fields = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
          this[key] = value; // Update instance property
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(this.id);

      await promisePool.execute(
        `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      this.updatedAt = new Date();
      return this;
    } catch (error) {
      throw new Error(`Error updating payment: ${error.message}`);
    }
  }

  // Instance method to format payment for API response
  toJSON() {
    return {
      id: this.id,
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      stripePaymentIntentId: this.stripePaymentIntentId,
      stripeSessionId: this.stripeSessionId,
      amount: parseFloat(this.amount),
      currency: this.currency,
      status: this.status,
      paymentMethod: this.paymentMethod,
      transactionId: this.transactionId,
      refundAmount: this.refundAmount ? parseFloat(this.refundAmount) : null,
      customerName: this.customerName,
      customerEmail: this.customerEmail,
      vendorName: this.vendorName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Payment;