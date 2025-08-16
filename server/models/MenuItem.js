const { promisePool } = require('../config/database');

class MenuItem {
  constructor(itemData) {
    this.id = itemData.id;
    this.vendorId = itemData.vendor_id;
    this.name = itemData.name;
    this.description = itemData.description;
    this.price = itemData.price;
    this.category = itemData.category;
    this.imageUrl = itemData.image_url;
    this.isVegetarian = itemData.is_vegetarian;
    this.isVegan = itemData.is_vegan;
    this.isSpicy = itemData.is_spicy;
    this.prepTime = itemData.prep_time;
    this.calories = itemData.calories;
    this.ingredients = itemData.ingredients;
    this.allergens = itemData.allergens;
    this.isAvailable = itemData.is_available;
    this.createdAt = itemData.created_at;
    this.updatedAt = itemData.updated_at;
  }

  // Create new menu item
  static async create(itemData) {
    try {
      const [result] = await promisePool.execute(
        `INSERT INTO menu_items (vendor_id, name, description, price, category, 
         image_url, is_vegetarian, is_vegan, is_spicy, prep_time, calories, 
         ingredients, allergens) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemData.vendorId,
          itemData.name,
          itemData.description || null,
          itemData.price,
          itemData.category || null,
          itemData.imageUrl || null,
          itemData.isVegetarian || false,
          itemData.isVegan || false,
          itemData.isSpicy || false,
          itemData.prepTime || null,
          itemData.calories || null,
          itemData.ingredients || null,
          itemData.allergens || null
        ]
      );

      return await MenuItem.findById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating menu item: ${error.message}`);
    }
  }

  // Find menu item by ID
  static async findById(id) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT mi.*, v.business_name, v.is_verified 
         FROM menu_items mi 
         JOIN vendors v ON mi.vendor_id = v.id 
         WHERE mi.id = ?`,
        [id]
      );

      if (rows.length === 0) return null;
      
      const item = new MenuItem(rows[0]);
      item.vendorName = rows[0].business_name;
      item.vendorVerified = rows[0].is_verified;
      
      return item;
    } catch (error) {
      throw new Error(`Error finding menu item by ID: ${error.message}`);
    }
  }

  // Get menu items by vendor ID
  static async getByVendorId(vendorId, filters = {}) {
    try {
      let query = 'SELECT * FROM menu_items WHERE vendor_id = ?';
      const params = [vendorId];

      // Apply filters
      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.isAvailable !== undefined) {
        query += ' AND is_available = ?';
        params.push(filters.isAvailable);
      }

      if (filters.isVegetarian !== undefined) {
        query += ' AND is_vegetarian = ?';
        params.push(filters.isVegetarian);
      }

      if (filters.isVegan !== undefined) {
        query += ' AND is_vegan = ?';
        params.push(filters.isVegan);
      }

      if (filters.maxPrice) {
        query += ' AND price <= ?';
        params.push(filters.maxPrice);
      }

      if (filters.minPrice) {
        query += ' AND price >= ?';
        params.push(filters.minPrice);
      }

      // Sorting
      if (filters.sortBy === 'price_low') {
        query += ' ORDER BY price ASC';
      } else if (filters.sortBy === 'price_high') {
        query += ' ORDER BY price DESC';
      } else if (filters.sortBy === 'name') {
        query += ' ORDER BY name ASC';
      } else {
        query += ' ORDER BY created_at DESC';
      }

      const [rows] = await promisePool.execute(query, params);
      return rows.map(row => new MenuItem(row));
    } catch (error) {
      throw new Error(`Error getting menu items by vendor: ${error.message}`);
    }
  }

  // Update menu item
  static async update(id, updateData) {
    try {
      const allowedFields = [
        'name', 'description', 'price', 'category', 'image_url',
        'is_vegetarian', 'is_vegan', 'is_spicy', 'prep_time', 
        'calories', 'ingredients', 'allergens', 'is_available'
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
        `UPDATE menu_items SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      return await MenuItem.findById(id);
    } catch (error) {
      throw new Error(`Error updating menu item: ${error.message}`);
    }
  }

  // Delete menu item
  static async delete(id) {
    try {
      await promisePool.execute(
        'DELETE FROM menu_items WHERE id = ?',
        [id]
      );
      return true;
    } catch (error) {
      throw new Error(`Error deleting menu item: ${error.message}`);
    }
  }

  // Search menu items
  static async search(searchTerm, filters = {}) {
    try {
      let query = `
        SELECT mi.*, v.business_name, v.is_verified, v.average_rating 
        FROM menu_items mi 
        JOIN vendors v ON mi.vendor_id = v.id 
        WHERE mi.is_available = TRUE 
        AND v.status = 'active'
        AND (mi.name LIKE ? OR mi.description LIKE ? OR mi.category LIKE ?)
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const params = [searchPattern, searchPattern, searchPattern];

      // Apply filters
      if (filters.category) {
        query += ' AND mi.category = ?';
        params.push(filters.category);
      }

      if (filters.isVegetarian) {
        query += ' AND mi.is_vegetarian = TRUE';
      }

      if (filters.isVegan) {
        query += ' AND mi.is_vegan = TRUE';
      }

      if (filters.maxPrice) {
        query += ' AND mi.price <= ?';
        params.push(filters.maxPrice);
      }

      if (filters.minPrice) {
        query += ' AND mi.price >= ?';
        params.push(filters.minPrice);
      }

      if (filters.vendorId) {
        query += ' AND mi.vendor_id = ?';
        params.push(filters.vendorId);
      }

      // Location-based filtering for vendors
      if (filters.latitude && filters.longitude && filters.radius) {
        query += `
          AND (6371 * acos(cos(radians(?)) * cos(radians(v.latitude)) * 
          cos(radians(v.longitude) - radians(?)) + sin(radians(?)) * 
          sin(radians(v.latitude)))) <= ?
        `;
        params.push(filters.latitude, filters.longitude, filters.latitude, filters.radius);
      }

      // Sorting
      if (filters.sortBy === 'price_low') {
        query += ' ORDER BY mi.price ASC';
      } else if (filters.sortBy === 'price_high') {
        query += ' ORDER BY mi.price DESC';
      } else if (filters.sortBy === 'rating') {
        query += ' ORDER BY v.average_rating DESC';
      } else {
        query += ' ORDER BY v.is_featured DESC, v.average_rating DESC, mi.created_at DESC';
      }

      // Pagination
      if (filters.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }

      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        const item = new MenuItem(row);
        item.vendorName = row.business_name;
        item.vendorVerified = row.is_verified;
        item.vendorRating = row.average_rating;
        return item;
      });
    } catch (error) {
      throw new Error(`Error searching menu items: ${error.message}`);
    }
  }

  // Get popular menu items
  static async getPopular(limit = 20) {
    try {
      const query = `
        SELECT mi.*, v.business_name, v.is_verified, v.average_rating,
        COUNT(oi.id) as order_count
        FROM menu_items mi 
        JOIN vendors v ON mi.vendor_id = v.id 
        LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
        WHERE mi.is_available = TRUE AND v.status = 'active'
        GROUP BY mi.id
        ORDER BY order_count DESC, v.average_rating DESC
        LIMIT ?
      `;

      const [rows] = await promisePool.execute(query, [limit]);
      
      return rows.map(row => {
        const item = new MenuItem(row);
        item.vendorName = row.business_name;
        item.vendorVerified = row.is_verified;
        item.vendorRating = row.average_rating;
        item.orderCount = row.order_count;
        return item;
      });
    } catch (error) {
      throw new Error(`Error getting popular menu items: ${error.message}`);
    }
  }

  // Get menu categories by vendor
  static async getCategoriesByVendor(vendorId) {
    try {
      const [rows] = await promisePool.execute(
        `SELECT DISTINCT category, COUNT(*) as item_count 
         FROM menu_items 
         WHERE vendor_id = ? AND is_available = TRUE AND category IS NOT NULL
         GROUP BY category 
         ORDER BY category`,
        [vendorId]
      );

      return rows;
    } catch (error) {
      throw new Error(`Error getting categories by vendor: ${error.message}`);
    }
  }

  // Get all categories
  static async getAllCategories() {
    try {
      const [rows] = await promisePool.execute(
        `SELECT DISTINCT category, COUNT(*) as item_count 
         FROM menu_items mi 
         JOIN vendors v ON mi.vendor_id = v.id 
         WHERE mi.is_available = TRUE AND v.status = 'active' AND category IS NOT NULL
         GROUP BY category 
         ORDER BY item_count DESC, category`
      );

      return rows;
    } catch (error) {
      throw new Error(`Error getting all categories: ${error.message}`);
    }
  }

  // Update availability
  static async updateAvailability(id, isAvailable) {
    try {
      await promisePool.execute(
        'UPDATE menu_items SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isAvailable, id]
      );

      return await MenuItem.findById(id);
    } catch (error) {
      throw new Error(`Error updating menu item availability: ${error.message}`);
    }
  }

  // Bulk update availability for vendor
  static async bulkUpdateAvailability(vendorId, itemIds, isAvailable) {
    try {
      const placeholders = itemIds.map(() => '?').join(',');
      const params = [isAvailable, vendorId, ...itemIds];

      await promisePool.execute(
        `UPDATE menu_items SET is_available = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE vendor_id = ? AND id IN (${placeholders})`,
        params
      );

      return true;
    } catch (error) {
      throw new Error(`Error bulk updating menu items: ${error.message}`);
    }
  }
}

module.exports = MenuItem;