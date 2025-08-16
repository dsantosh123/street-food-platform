const { promisePool } = require('../config/database');

class Vendor {
  constructor(vendorData) {
    this.id = vendorData.id;
    this.userId = vendorData.user_id;
    this.businessName = vendorData.business_name;
    this.description = vendorData.description;
    this.cuisineType = vendorData.cuisine_type;
    this.address = vendorData.address;
    this.latitude = vendorData.latitude;
    this.longitude = vendorData.longitude;
    this.phone = vendorData.phone;
    this.openingTime = vendorData.opening_time;
    this.closingTime = vendorData.closing_time;
    this.deliveryRadius = vendorData.delivery_radius;
    this.minimumOrder = vendorData.minimum_order;
    this.deliveryFee = vendorData.delivery_fee;
    this.averageRating = vendorData.average_rating;
    this.totalReviews = vendorData.total_reviews;
    this.isFeatured = vendorData.is_featured;
    this.isVerified = vendorData.is_verified;
    this.status = vendorData.status;
    this.createdAt = vendorData.created_at;
    this.updatedAt = vendorData.updated_at;
  }

  // Create new vendor
  static async create(vendorData) {
    try {
      const [result] = await promisePool.execute(
        `INSERT INTO vendors (user_id, business_name, description, cuisine_type, address, 
         latitude, longitude, phone, opening_time, closing_time, delivery_radius, 
         minimum_order, delivery_fee) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorData.userId,
          vendorData.businessName,
          vendorData.description || null,
          vendorData.cuisineType || null,
          vendorData.address,
          vendorData.latitude || null,
          vendorData.longitude || null,
          vendorData.phone || null,
          vendorData.openingTime || '09:00:00',
          vendorData.closingTime || '22:00:00',
          vendorData.deliveryRadius || 5.0,
          vendorData.minimumOrder || 0.0,
          vendorData.deliveryFee || 0.0
        ]
      );

      return await Vendor.findById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating vendor: ${error.message}`);
    }
  }

  // Find vendor by ID
  static async findById(id) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT v.*, u.first_name, u.last_name, u.email, u.profile_image 
         FROM vendors v 
         JOIN users u ON v.user_id = u.id 
         WHERE v.id = ?`,
        [id]
      );

      if (rows.length === 0) return null;
      
      const vendor = new Vendor(rows[0]);
      vendor.ownerName = `${rows[0].first_name} ${rows[0].last_name}`;
      vendor.ownerEmail = rows[0].email;
      vendor.ownerImage = rows[0].profile_image;
      
      return vendor;
    } catch (error) {
      throw new Error(`Error finding vendor by ID: ${error.message}`);
    }
  }

  // Find vendor by user ID
  static async findByUserId(userId) {
    try {
      const [rows] = await promisePool.execute(
        'SELECT * FROM vendors WHERE user_id = ?',
        [userId]
      );

      if (rows.length === 0) return null;
      return new Vendor(rows[0]);
    } catch (error) {
      throw new Error(`Error finding vendor by user ID: ${error.message}`);
    }
  }

  // Update vendor
  static async update(id, updateData) {
    try {
      const allowedFields = [
        'business_name', 'description', 'cuisine_type', 'address', 
        'latitude', 'longitude', 'phone', 'opening_time', 'closing_time',
        'delivery_radius', 'minimum_order', 'delivery_fee', 'status'
      ];
      
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
        `UPDATE vendors SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      return await Vendor.findById(id);
    } catch (error) {
      throw new Error(`Error updating vendor: ${error.message}`);
    }
  }

  // Delete vendor
  static async delete(id) {
    try {
      await promisePool.execute(
        'UPDATE vendors SET status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      return true;
    } catch (error) {
      throw new Error(`Error deleting vendor: ${error.message}`);
    }
  }

  // Get all vendors with filters
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT v.*, u.first_name, u.last_name, u.email 
        FROM vendors v 
        JOIN users u ON v.user_id = u.id 
        WHERE 1=1
      `;
      const params = [];

      // Apply filters
      if (filters.status) {
        query += ' AND v.status = ?';
        params.push(filters.status);
      }

      if (filters.cuisineType) {
        query += ' AND v.cuisine_type = ?';
        params.push(filters.cuisineType);
      }

      if (filters.isVerified !== undefined) {
        query += ' AND v.is_verified = ?';
        params.push(filters.isVerified);
      }

      if (filters.isFeatured !== undefined) {
        query += ' AND v.is_featured = ?';
        params.push(filters.isFeatured);
      }

      if (filters.minRating) {
        query += ' AND v.average_rating >= ?';
        params.push(filters.minRating);
      }

      // Location-based filtering
      if (filters.latitude && filters.longitude && filters.radius) {
        query += `
          AND (6371 * acos(cos(radians(?)) * cos(radians(v.latitude)) * 
          cos(radians(v.longitude) - radians(?)) + sin(radians(?)) * 
          sin(radians(v.latitude)))) <= ?
        `;
        params.push(filters.latitude, filters.longitude, filters.latitude, filters.radius);
      }

      // Sorting
      if (filters.sortBy === 'rating') {
        query += ' ORDER BY v.average_rating DESC';
      } else if (filters.sortBy === 'distance' && filters.latitude && filters.longitude) {
        query += `
          ORDER BY (6371 * acos(cos(radians(?)) * cos(radians(v.latitude)) * 
          cos(radians(v.longitude) - radians(?)) + sin(radians(?)) * 
          sin(radians(v.latitude))))
        `;
        params.push(filters.latitude, filters.longitude, filters.latitude);
      } else {
        query += ' ORDER BY v.is_featured DESC, v.average_rating DESC, v.created_at DESC';
      }

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const vendor = new Vendor(row);
        vendor.ownerName = `${row.first_name} ${row.last_name}`;
        vendor.ownerEmail = row.email;
        return vendor;
      });
    } catch (error) {
      throw new Error(`Error getting vendors: ${error.message}`);
    }
  }

  // Search vendors
  static async search(searchTerm, filters = {}) {
    try {
      let query = `
        SELECT v.*, u.first_name, u.last_name, u.email 
        FROM vendors v 
        JOIN users u ON v.user_id = u.id 
        WHERE v.status = 'active' 
        AND (v.business_name LIKE ? OR v.cuisine_type LIKE ? OR v.description LIKE ?)
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const params = [searchPattern, searchPattern, searchPattern];

      // Apply additional filters
      if (filters.cuisineType) {
        query += ' AND v.cuisine_type = ?';
        params.push(filters.cuisineType);
      }

      if (filters.minRating) {
        query += ' AND v.average_rating >= ?';
        params.push(filters.minRating);
      }

      query += ' ORDER BY v.is_featured DESC, v.average_rating DESC';

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const vendor = new Vendor(row);
        vendor.ownerName = `${row.first_name} ${row.last_name}`;
        return vendor;
      });
    } catch (error) {
      throw new Error(`Error searching vendors: ${error.message}`);
    }
  }

  // Get nearby vendors
  static async getNearby(latitude, longitude, radius = 10) {
    try {
      const query = `
        SELECT v.*, u.first_name, u.last_name,
        (6371 * acos(cos(radians(?)) * cos(radians(v.latitude)) * 
        cos(radians(v.longitude) - radians(?)) + sin(radians(?)) * 
        sin(radians(v.latitude)))) AS distance
        FROM vendors v 
        JOIN users u ON v.user_id = u.id 
        WHERE v.status = 'active' 
        AND v.latitude IS NOT NULL 
        AND v.longitude IS NOT NULL
        HAVING distance <= ?
        ORDER BY distance, v.average_rating DESC
      `;

      const [rows] = await promisePool.execute(query, [latitude, longitude, latitude, radius]);
      
      return rows.map(row => {
        const vendor = new Vendor(row);
        vendor.distance = parseFloat(row.distance).toFixed(2);
        vendor.ownerName = `${row.first_name} ${row.last_name}`;
        return vendor;
      });
    } catch (error) {
      throw new Error(`Error getting nearby vendors: ${error.message}`);
    }
  }

  // Update vendor rating
  static async updateRating(vendorId) {
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

  // Get vendor statistics
  static async getStats(vendorId) {
    try {
      const [stats] = await promisePool.execute(`
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as completed_orders,
          COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) as cancelled_orders,
          COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount END), 0) as total_revenue,
          COUNT(DISTINCT mi.id) as total_menu_items,
          COUNT(DISTINCT r.id) as total_reviews,
          COALESCE(AVG(r.rating), 0) as average_rating
        FROM vendors v
        LEFT JOIN orders o ON v.id = o.vendor_id
        LEFT JOIN menu_items mi ON v.id = mi.vendor_id AND mi.is_available = TRUE
        LEFT JOIN reviews r ON v.id = r.vendor_id AND r.is_verified = TRUE
        WHERE v.id = ?
        GROUP BY v.id
      `, [vendorId]);

      return stats[0] || {};
    } catch (error) {
      throw new Error(`Error getting vendor stats: ${error.message}`);
    }
  }

  // Get featured vendors
  static async getFeatured(limit = 10) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT v.*, u.first_name, u.last_name 
         FROM vendors v 
         JOIN users u ON v.user_id = u.id 
         WHERE v.is_featured = TRUE AND v.status = 'active' 
         ORDER BY v.average_rating DESC, v.total_reviews DESC 
         LIMIT ?`,
        [limit]
      );

      return rows.map(row => {
        const vendor = new Vendor(row);
        vendor.ownerName = `${row.first_name} ${row.last_name}`;
        return vendor;
      });
    } catch (error) {
      throw new Error(`Error getting featured vendors: ${error.message}`);
    }
  }
}

module.exports = Vendor;