const { promisePool } = require('../config/database');

class Review {
  constructor(reviewData) {
    this.id = reviewData.id;
    this.customerId = reviewData.customer_id;
    this.vendorId = reviewData.vendor_id;
    this.orderId = reviewData.order_id;
    this.rating = reviewData.rating;
    this.comment = reviewData.comment;
    this.response = reviewData.response;
    this.isVerified = reviewData.is_verified;
    this.createdAt = reviewData.created_at;
    this.updatedAt = reviewData.updated_at;
  }

  // Create new review
  static async create(reviewData) {
    try {
      // Check if customer has already reviewed this vendor for this order
      if (reviewData.orderId) {
        const [existing] = await promisePool.execute(
          'SELECT id FROM reviews WHERE customer_id = ? AND vendor_id = ? AND order_id = ?',
          [reviewData.customerId, reviewData.vendorId, reviewData.orderId]
        );

        if (existing.length > 0) {
          throw new Error('You have already reviewed this order');
        }
      }

      const [result] = await promisePool.execute(
        `INSERT INTO reviews (customer_id, vendor_id, order_id, rating, comment) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          reviewData.customerId,
          reviewData.vendorId,
          reviewData.orderId || null,
          reviewData.rating,
          reviewData.comment || null
        ]
      );

      // Update vendor rating
      await Review.updateVendorRating(reviewData.vendorId);

      return await Review.findById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating review: ${error.message}`);
    }
  }

  // Find review by ID
  static async findById(id) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT r.*, u.first_name, u.last_name, u.profile_image,
         v.business_name, o.order_number
         FROM reviews r 
         JOIN users u ON r.customer_id = u.id 
         JOIN vendors v ON r.vendor_id = v.id 
         LEFT JOIN orders o ON r.order_id = o.id 
         WHERE r.id = ?`,
        [id]
      );

      if (rows.length === 0) return null;
      
      const review = new Review(rows[0]);
      review.customerName = `${rows[0].first_name} ${rows[0].last_name}`;
      review.customerImage = rows[0].profile_image;
      review.vendorName = rows[0].business_name;
      review.orderNumber = rows[0].order_number;
      
      return review;
    } catch (error) {
      throw new Error(`Error finding review by ID: ${error.message}`);
    }
  }

  // Get reviews by vendor ID
  static async getByVendorId(vendorId, filters = {}) {
    try {
      let query = `
        SELECT r.*, u.first_name, u.last_name, u.profile_image, o.order_number
        FROM reviews r 
        JOIN users u ON r.customer_id = u.id 
        LEFT JOIN orders o ON r.order_id = o.id 
        WHERE r.vendor_id = ?
      `;
      const params = [vendorId];

      // Apply filters
      if (filters.rating) {
        query += ' AND r.rating = ?';
        params.push(filters.rating);
      }

      if (filters.isVerified !== undefined) {
        query += ' AND r.is_verified = ?';
        params.push(filters.isVerified);
      }

      if (filters.hasComment !== undefined) {
        if (filters.hasComment) {
          query += ' AND r.comment IS NOT NULL AND r.comment != ""';
        } else {
          query += ' AND (r.comment IS NULL OR r.comment = "")';
        }
      }

      // Sorting
      if (filters.sortBy === 'rating_high') {
        query += ' ORDER BY r.rating DESC, r.created_at DESC';
      } else if (filters.sortBy === 'rating_low') {
        query += ' ORDER BY r.rating ASC, r.created_at DESC';
      } else {
        query += ' ORDER BY r.created_at DESC';
      }

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const review = new Review(row);
        review.customerName = `${row.first_name} ${row.last_name}`;
        review.customerImage = row.profile_image;
        review.orderNumber = row.order_number;
        return review;
      });
    } catch (error) {
      throw new Error(`Error getting reviews by vendor: ${error.message}`);
    }
  }

  // Get reviews by customer ID
  static async getByCustomerId(customerId, filters = {}) {
    try {
      let query = `
        SELECT r.*, v.business_name, o.order_number
        FROM reviews r 
        JOIN vendors v ON r.vendor_id = v.id 
        LEFT JOIN orders o ON r.order_id = o.id 
        WHERE r.customer_id = ?
      `;
      const params = [customerId];

      // Apply filters
      if (filters.rating) {
        query += ' AND r.rating = ?';
        params.push(filters.rating);
      }

      if (filters.vendorId) {
        query += ' AND r.vendor_id = ?';
        params.push(filters.vendorId);
      }

      query += ' ORDER BY r.created_at DESC';

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const review = new Review(row);
        review.vendorName = row.business_name;
        review.orderNumber = row.order_number;
        return review;
      });
    } catch (error) {
      throw new Error(`Error getting reviews by customer: ${error.message}`);
    }
  }

  // Get all reviews (admin)
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT r.*, u.first_name, u.last_name, u.email,
        v.business_name, o.order_number
        FROM reviews r 
        JOIN users u ON r.customer_id = u.id 
        JOIN vendors v ON r.vendor_id = v.id 
        LEFT JOIN orders o ON r.order_id = o.id 
        WHERE 1=1
      `;
      const params = [];

      // Apply filters
      if (filters.rating) {
        query += ' AND r.rating = ?';
        params.push(filters.rating);
      }

      if (filters.vendorId) {
        query += ' AND r.vendor_id = ?';
        params.push(filters.vendorId);
      }

      if (filters.customerId) {
        query += ' AND r.customer_id = ?';
        params.push(filters.customerId);
      }

      if (filters.isVerified !== undefined) {
        query += ' AND r.is_verified = ?';
        params.push(filters.isVerified);
      }

      if (filters.fromDate) {
        query += ' AND r.created_at >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND r.created_at <= ?';
        params.push(filters.toDate);
      }

      query += ' ORDER BY r.created_at DESC';

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const review = new Review(row);
        review.customerName = `${row.first_name} ${row.last_name}`;
        review.customerEmail = row.email;
        review.vendorName = row.business_name;
        review.orderNumber = row.order_number;
        return review;
      });
    } catch (error) {
      throw new Error(`Error getting all reviews: ${error.message}`);
    }
  }

  // Update review
  static async update(id, updateData) {
    try {
      const allowedFields = ['rating', 'comment'];
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

      values.push(id);

      await promisePool.execute(
        `UPDATE reviews SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      // Update vendor rating if rating was changed
      if (updateData.rating !== undefined) {
        const review = await Review.findById(id);
        await Review.updateVendorRating(review.vendorId);
      }

      return await Review.findById(id);
    } catch (error) {
      throw new Error(`Error updating review: ${error.message}`);
    }
  }

  // Add vendor response
  static async addResponse(id, response) {
    try {
      await promisePool.execute(
        'UPDATE reviews SET response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [response, id]
      );

      return await Review.findById(id);
    } catch (error) {
      throw new Error(`Error adding response to review: ${error.message}`);
    }
  }

  // Verify review
  static async verify(id, isVerified = true) {
    try {
      await promisePool.execute(
        'UPDATE reviews SET is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isVerified, id]
      );

      // Update vendor rating
      const review = await Review.findById(id);
      await Review.updateVendorRating(review.vendorId);

      return await Review.findById(id);
    } catch (error) {
      throw new Error(`Error verifying review: ${error.message}`);
    }
  }

  // Delete review
  static async delete(id) {
    try {
      // Get review details before deletion for rating update
      const review = await Review.findById(id);
      
      await promisePool.execute(
        'DELETE FROM reviews WHERE id = ?',
        [id]
      );

      // Update vendor rating
      if (review) {
        await Review.updateVendorRating(review.vendorId);
      }

      return true;
    } catch (error) {
      throw new Error(`Error deleting review: ${error.message}`);
    }
  }

  // Update vendor rating based on reviews
  static async updateVendorRating(vendorId) {
    try {
      const [ratingData] = await promisePool.execute(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews 
         FROM reviews 
         WHERE vendor_id = ? AND is_verified = TRUE`,
        [vendorId]
      );

      const averageRating = ratingData[0].avg_rating || 0;
      const totalReviews = ratingData[0].total_reviews || 0;

      await promisePool.execute(
        'UPDATE vendors SET average_rating = ?, total_reviews = ? WHERE id = ?',
        [parseFloat(averageRating).toFixed(2), totalReviews, vendorId]
      );

      return { averageRating, totalReviews };
    } catch (error) {
      throw new Error(`Error updating vendor rating: ${error.message}`);
    }
  }

  // Get review statistics
  static async getStats(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_reviews,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
          COUNT(CASE WHEN is_verified = TRUE THEN 1 END) as verified_reviews,
          COUNT(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 END) as reviews_with_comments,
          COALESCE(AVG(rating), 0) as average_rating
        FROM reviews 
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
      throw new Error(`Error getting review stats: ${error.message}`);
    }
  }

  // Get recent reviews
  static async getRecent(limit = 10, vendorId = null) {
    try {
      let query = `
        SELECT r.*, u.first_name, u.last_name, u.profile_image,
        v.business_name
        FROM reviews r 
        JOIN users u ON r.customer_id = u.id 
        JOIN vendors v ON r.vendor_id = v.id 
        WHERE r.is_verified = TRUE
      `;
      const params = [];

      if (vendorId) {
        query += ' AND r.vendor_id = ?';
        params.push(vendorId);
      }

      query += ' ORDER BY r.created_at DESC LIMIT ?';
      params.push(limit);

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const review = new Review(row);
        review.customerName = `${row.first_name} ${row.last_name}`;
        review.customerImage = row.profile_image;
        review.vendorName = row.business_name;
        return review;
      });
    } catch (error) {
      throw new Error(`Error getting recent reviews: ${error.message}`);
    }
  }

  // Check if customer can review (has completed order)
  static async canCustomerReview(customerId, vendorId, orderId = null) {
    try {
      let query = `
        SELECT COUNT(*) as completed_orders
        FROM orders 
        WHERE customer_id = ? AND vendor_id = ? AND status = 'delivered'
      `;
      const params = [customerId, vendorId];

      if (orderId) {
        query += ' AND id = ?';
        params.push(orderId);
      }

      const [result] = await promisePool.execute(query, params);
      return result[0].completed_orders > 0;
    } catch (error) {
      throw new Error(`Error checking review eligibility: ${error.message}`);
    }
  }
}

module.exports = Review;