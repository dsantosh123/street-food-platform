const { promisePool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Order {
  constructor(orderData) {
    this.id = orderData.id;
    this.customerId = orderData.customer_id;
    this.vendorId = orderData.vendor_id;
    this.orderNumber = orderData.order_number;
    this.status = orderData.status;
    this.subtotal = orderData.subtotal;
    this.deliveryFee = orderData.delivery_fee;
    this.taxAmount = orderData.tax_amount;
    this.totalAmount = orderData.total_amount;
    this.paymentMethod = orderData.payment_method;
    this.paymentStatus = orderData.payment_status;
    this.deliveryAddress = orderData.delivery_address;
    this.deliveryLatitude = orderData.delivery_latitude;
    this.deliveryLongitude = orderData.delivery_longitude;
    this.specialInstructions = orderData.special_instructions;
    this.estimatedDeliveryTime = orderData.estimated_delivery_time;
    this.deliveredAt = orderData.delivered_at;
    this.createdAt = orderData.created_at;
    this.updatedAt = orderData.updated_at;
  }

  // Generate unique order number
  static generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
  }

  // Create new order
  static async create(orderData) {
    const connection = await promisePool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Generate order number
      const orderNumber = Order.generateOrderNumber();

      // Calculate estimated delivery time (30-45 minutes from now)
      const estimatedMinutes = Math.floor(Math.random() * 16) + 30; // 30-45 minutes
      const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60000);

      // Insert order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (customer_id, vendor_id, order_number, subtotal, 
         delivery_fee, tax_amount, total_amount, payment_method, delivery_address, 
         delivery_latitude, delivery_longitude, special_instructions, estimated_delivery_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderData.customerId,
          orderData.vendorId,
          orderNumber,
          orderData.subtotal,
          orderData.deliveryFee || 0,
          orderData.taxAmount || 0,
          orderData.totalAmount,
          orderData.paymentMethod || 'card',
          orderData.deliveryAddress,
          orderData.deliveryLatitude || null,
          orderData.deliveryLongitude || null,
          orderData.specialInstructions || null,
          estimatedDeliveryTime
        ]
      );

      const orderId = orderResult.insertId;

      // Insert order items
      if (orderData.items && orderData.items.length > 0) {
        const itemsQuery = `
          INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, special_requests) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        for (const item of orderData.items) {
          await connection.execute(itemsQuery, [
            orderId,
            item.menuItemId,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            item.specialRequests || null
          ]);
        }
      }

      // Add initial tracking entry
      await connection.execute(
        'INSERT INTO order_tracking (order_id, status, message) VALUES (?, ?, ?)',
        [orderId, 'pending', 'Order placed successfully']
      );

      await connection.commit();
      return await Order.findById(orderId);
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error creating order: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Find order by ID
  static async findById(id) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT o.*, u.first_name as customer_name, u.email as customer_email, 
         v.business_name as vendor_name, v.phone as vendor_phone
         FROM orders o 
         JOIN users u ON o.customer_id = u.id 
         JOIN vendors v ON o.vendor_id = v.id 
         WHERE o.id = ?`,
        [id]
      );

      if (rows.length === 0) return null;
      
      const order = new Order(rows[0]);
      order.customerName = rows[0].customer_name;
      order.customerEmail = rows[0].customer_email;
      order.vendorName = rows[0].vendor_name;
      order.vendorPhone = rows[0].vendor_phone;

      // Get order items
      order.items = await Order.getOrderItems(id);
      
      return order;
    } catch (error) {
      throw new Error(`Error finding order by ID: ${error.message}`);
    }
  }

  // Find order by order number
  static async findByOrderNumber(orderNumber) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT o.*, u.first_name as customer_name, u.email as customer_email, 
         v.business_name as vendor_name FROM orders o 
         JOIN users u ON o.customer_id = u.id 
         JOIN vendors v ON o.vendor_id = v.id 
         WHERE o.order_number = ?`,
        [orderNumber]
      );

      if (rows.length === 0) return null;
      
      const order = new Order(rows[0]);
      order.customerName = rows[0].customer_name;
      order.customerEmail = rows[0].customer_email;
      order.vendorName = rows[0].vendor_name;

      // Get order items
      order.items = await Order.getOrderItems(order.id);
      
      return order;
    } catch (error) {
      throw new Error(`Error finding order by number: ${error.message}`);
    }
  }

  // Get order items
  static async getOrderItems(orderId) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT oi.*, mi.name as item_name, mi.description, mi.image_url 
         FROM order_items oi 
         JOIN menu_items mi ON oi.menu_item_id = mi.id 
         WHERE oi.order_id = ?`,
        [orderId]
      );

      return rows;
    } catch (error) {
      throw new Error(`Error getting order items: ${error.message}`);
    }
  }

  // Update order status
  static async updateStatus(id, status, message = null) {
    try {
      await promisePool.execute(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      );

      // Add tracking entry
      await promisePool.execute(
        'INSERT INTO order_tracking (order_id, status, message) VALUES (?, ?, ?)',
        [id, status, message || `Order status updated to ${status}`]
      );

      // Update delivered_at if status is delivered
      if (status === 'delivered') {
        await promisePool.execute(
          'UPDATE orders SET delivered_at = CURRENT_TIMESTAMP WHERE id = ?',
          [id]
        );
      }

      return await Order.findById(id);
    } catch (error) {
      throw new Error(`Error updating order status: ${error.message}`);
    }
  }

  // Update payment status
  static async updatePaymentStatus(id, paymentStatus) {
    try {
      await promisePool.execute(
        'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [paymentStatus, id]
      );

      return await Order.findById(id);
    } catch (error) {
      throw new Error(`Error updating payment status: ${error.message}`);
    }
  }

  // Get orders by customer ID
  static async getByCustomerId(customerId, filters = {}) {
    try {
      let query = `
        SELECT o.*, v.business_name as vendor_name, v.average_rating as vendor_rating
        FROM orders o 
        JOIN vendors v ON o.vendor_id = v.id 
        WHERE o.customer_id = ?
      `;
      const params = [customerId];

      // Apply filters
      if (filters.status) {
        query += ' AND o.status = ?';
        params.push(filters.status);
      }

      if (filters.paymentStatus) {
        query += ' AND o.payment_status = ?';
        params.push(filters.paymentStatus);
      }

      if (filters.fromDate) {
        query += ' AND o.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND o.created_at <= ?';
        params.push(filters.toDate);
      }

      query += ' ORDER BY o.created_at DESC';

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      const orders = [];
      for (const row of rows) {
        const order = new Order(row);
        order.vendorName = row.vendor_name;
        order.vendorRating = row.vendor_rating;
        order.items = await Order.getOrderItems(order.id);
        orders.push(order);
      }
      
      return orders;
    } catch (error) {
      throw new Error(`Error getting orders by customer: ${error.message}`);
    }
  }

  // Get orders by vendor ID
  static async getByVendorId(vendorId, filters = {}) {
    try {
      let query = `
        SELECT o.*, u.first_name, u.last_name, u.phone as customer_phone
        FROM orders o 
        JOIN users u ON o.customer_id = u.id 
        WHERE o.vendor_id = ?
      `;
      const params = [vendorId];

      // Apply filters
      if (filters.status) {
        query += ' AND o.status = ?';
        params.push(filters.status);
      }

      if (filters.paymentStatus) {
        query += ' AND o.payment_status = ?';
        params.push(filters.paymentStatus);
      }

      if (filters.fromDate) {
        query += ' AND o.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND o.created_at <= ?';
        params.push(filters.toDate);
      }

      // Sorting
      if (filters.sortBy === 'amount') {
        query += ' ORDER BY o.total_amount DESC';
      } else if (filters.sortBy === 'status') {
        query += ' ORDER BY o.status, o.created_at DESC';
      } else {
        query += ' ORDER BY o.created_at DESC';
      }

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      const orders = [];
      for (const row of rows) {
        const order = new Order(row);
        order.customerName = `${row.first_name} ${row.last_name}`;
        order.customerPhone = row.customer_phone;
        order.items = await Order.getOrderItems(order.id);
        orders.push(order);
      }
      
      return orders;
    } catch (error) {
      throw new Error(`Error getting orders by vendor: ${error.message}`);
    }
  }

  // Get all orders (admin)
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT o.*, u.first_name, u.last_name, u.email as customer_email,
        v.business_name as vendor_name
        FROM orders o 
        JOIN users u ON o.customer_id = u.id 
        JOIN vendors v ON o.vendor_id = v.id 
        WHERE 1=1
      `;
      const params = [];

      // Apply filters
      if (filters.status) {
        query += ' AND o.status = ?';
        params.push(filters.status);
      }

      if (filters.paymentStatus) {
        query += ' AND o.payment_status = ?';
        params.push(filters.paymentStatus);
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
        query += ' AND o.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND o.created_at <= ?';
        params.push(filters.toDate);
      }

      query += ' ORDER BY o.created_at DESC';

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const order = new Order(row);
        order.customerName = `${row.first_name} ${row.last_name}`;
        order.customerEmail = row.customer_email;
        order.vendorName = row.vendor_name;
        return order;
      });
    } catch (error) {
      throw new Error(`Error getting all orders: ${error.message}`);
    }
  }

  // Get order tracking
  static async getTracking(orderId) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT * FROM order_tracking 
         WHERE order_id = ? 
         ORDER BY created_at ASC`,
        [orderId]
      );

      return rows;
    } catch (error) {
      throw new Error(`Error getting order tracking: ${error.message}`);
    }
  }

  // Add tracking entry
  static async addTracking(orderId, status, message, latitude = null, longitude = null) {
    try {
      await promisePool.execute(
        `INSERT INTO order_tracking (order_id, status, message, location_latitude, location_longitude) 
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, status, message, latitude, longitude]
      );

      return true;
    } catch (error) {
      throw new Error(`Error adding tracking entry: ${error.message}`);
    }
  }

  // Get order statistics
  static async getStats(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_orders,
          COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_orders,
          COUNT(CASE WHEN status = 'out_for_delivery' THEN 1 END) as out_for_delivery_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
          COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN status = 'delivered' THEN total_amount END), 0) as average_order_value
        FROM orders 
        WHERE 1=1
      `;
      const params = [];

      if (filters.vendorId) {
        query += ' AND vendor_id = ?';
        params.push(filters.vendorId);
      }

      if (filters.customerId) {
        query += ' AND customer_id = ?';
        params.push(filters.customerId);
      }

      if (filters.fromDate) {
        query += ' AND created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND created_at <= ?';
        params.push(filters.toDate);
      }

      const [stats] = await promisePool.execute(query, params);
      return stats[0];
    } catch (error) {
      throw new Error(`Error getting order stats: ${error.message}`);
    }
  }

  // Cancel order
  static async cancel(id, reason = null) {
    try {
      await promisePool.execute(
        'UPDATE orders SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ("pending", "confirmed")',
        [id]
      );

      // Add tracking entry
      await promisePool.execute(
        'INSERT INTO order_tracking (order_id, status, message) VALUES (?, ?, ?)',
        [id, 'cancelled', reason || 'Order cancelled']
      );

      return await Order.findById(id);
    } catch (error) {
      throw new Error(`Error cancelling order: ${error.message}`);
    }
  }
}

module.exports = Order;