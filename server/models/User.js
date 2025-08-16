const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.email = userData.email;
    this.password = userData.password;
    this.firstName = userData.first_name;
    this.lastName = userData.last_name;
    this.phone = userData.phone;
    this.role = userData.role;
    this.profileImage = userData.profile_image;
    this.isActive = userData.is_active;
    this.emailVerified = userData.email_verified;
    this.createdAt = userData.created_at;
    this.updatedAt = userData.updated_at;
  }

  // Create new user
  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const [result] = await promisePool.execute(
        `INSERT INTO users (email, password, first_name, last_name, phone, role, profile_image) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.email,
          hashedPassword,
          userData.firstName,
          userData.lastName,
          userData.phone || null,
          userData.role || 'customer',
          userData.profileImage || null
        ]
      );

      return await User.findById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const [rows] = await promisePool.execute(
        'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
        [id]
      );

      if (rows.length === 0) return null;
      return new User(rows[0]);
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const [rows] = await promisePool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (rows.length === 0) return null;
      return new User(rows[0]);
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Update user
  static async update(id, updateData) {
    try {
      const allowedFields = ['first_name', 'last_name', 'phone', 'profile_image', 'email_verified'];
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
        `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      return await User.findById(id);
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Update password
  static async updatePassword(id, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await promisePool.execute(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, id]
      );

      return true;
    } catch (error) {
      throw new Error(`Error updating password: ${error.message}`);
    }
  }

  // Delete user (soft delete)
  static async delete(id) {
    try {
      await promisePool.execute(
        'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      return true;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // Get all users with pagination
  static async getAll(page = 1, limit = 10, role = null) {
    try {
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM users WHERE is_active = TRUE';
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE is_active = TRUE';
      const params = [];
      const countParams = [];

      if (role) {
        query += ' AND role = ?';
        countQuery += ' AND role = ?';
        params.push(role);
        countParams.push(role);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [users] = await promisePool.execute(query, params);
      const [countResult] = await promisePool.execute(countQuery, countParams);

      return {
        users: users.map(user => new User(user)),
        total: countResult[0].total,
        page,
        limit,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error(`Error getting users: ${error.message}`);
    }
  }

  // Search users
  static async search(searchTerm, role = null, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT * FROM users 
        WHERE is_active = TRUE 
        AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
      `;
      let countQuery = `
        SELECT COUNT(*) as total FROM users 
        WHERE is_active = TRUE 
        AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const params = [searchPattern, searchPattern, searchPattern];
      const countParams = [searchPattern, searchPattern, searchPattern];

      if (role) {
        query += ' AND role = ?';
        countQuery += ' AND role = ?';
        params.push(role);
        countParams.push(role);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [users] = await promisePool.execute(query, params);
      const [countResult] = await promisePool.execute(countQuery, countParams);

      return {
        users: users.map(user => new User(user)),
        total: countResult[0].total,
        page,
        limit,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      throw new Error(`Error searching users: ${error.message}`);
    }
  }

  // Get user stats
  static async getStats() {
    try {
      const [stats] = await promisePool.execute(`
        SELECT 
          role,
          COUNT(*) as count,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count,
          COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_count
        FROM users 
        GROUP BY role
      `);

      const [totalStats] = await promisePool.execute(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
          COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_last_30_days
        FROM users
      `);

      return {
        byRole: stats,
        overall: totalStats[0]
      };
    } catch (error) {
      throw new Error(`Error getting user stats: ${error.message}`);
    }
  }

  // Convert to JSON (exclude password)
  toJSON() {
    const userObj = { ...this };
    delete userObj.password;
    return userObj;
  }
}

module.exports = User;