-- Insert sample data for testing
USE street_food_platform;

-- Insert admin user (password: admin123)
INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified) VALUES
('admin@streetfood.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin', TRUE, TRUE);

-- Insert sample customers (password: password123)
INSERT INTO users (email, password, first_name, last_name, phone, role, is_active, email_verified) VALUES
('john.doe@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', '+91-9876543210', 'customer', TRUE, TRUE),
('jane.smith@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', '+91-9876543211', 'customer', TRUE, TRUE),
('mike.wilson@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike', 'Wilson', '+91-9876543212', 'customer', TRUE, TRUE);

-- Insert sample vendors (password: vendor123)
INSERT INTO users (email, password, first_name, last_name, phone, role, is_active, email_verified) VALUES
('vendor1@streetfood.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Raj', 'Kumar', '+91-9876543213', 'vendor', TRUE, TRUE),
('vendor2@streetfood.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Priya', 'Sharma', '+91-9876543214', 'vendor', TRUE, TRUE),
('vendor3@streetfood.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ahmed', 'Khan', '+91-9876543215', 'vendor', TRUE, TRUE);

-- Insert vendor categories
INSERT INTO vendor_categories (name, description, icon) VALUES
('North Indian', 'Traditional North Indian cuisine', 'north-indian'),
('South Indian', 'Authentic South Indian dishes', 'south-indian'),
('Chinese', 'Indo-Chinese street food', 'chinese'),
('Punjabi', 'Rich Punjabi flavors', 'punjabi'),
('Street Snacks', 'Quick bites and snacks', 'snacks'),
('Beverages', 'Fresh juices and drinks', 'beverages'),
('Sweets', 'Traditional Indian sweets', 'sweets');

-- Insert vendor information
INSERT INTO vendors (user_id, business_name, description, cuisine_type, address, latitude, longitude, opening_time, closing_time, delivery_radius, minimum_order, delivery_fee, is_featured, is_verified, status) VALUES
(5, 'Raj\'s Chaat Corner', 'Authentic street food with traditional flavors. Serving the best chaat and snacks since 1995.', 'North Indian', 'Shop 12, MG Road, Pune, Maharashtra 411001', 18.5204, 73.8567, '10:00:00', '22:00:00', 8.0, 100.00, 30.00, TRUE, TRUE, 'active'),
(6, 'South Spice Express', 'Delicious South Indian breakfast and meals. Fresh dosas, idlis, and filter coffee.', 'South Indian', 'Lane 5, Koregaon Park, Pune, Maharashtra 411001', 18.5362, 73.8847, '07:00:00', '21:00:00', 6.0, 80.00, 25.00, TRUE, TRUE, 'active'),
(7, 'Khan\'s Biryani House', 'Aromatic biryanis and kebabs made with authentic spices and love.', 'Mughlai', 'FC Road, Near College, Pune, Maharashtra 411004', 18.5074, 73.8077, '12:00:00', '23:00:00', 10.0, 150.00, 40.00, FALSE, TRUE, 'active');

-- Map vendors to categories
INSERT INTO vendor_category_mapping (vendor_id, category_id) VALUES
(1, 1), (1, 5), -- Raj's Chaat Corner - North Indian, Street Snacks
(2, 2), -- South Spice Express - South Indian
(3, 1), (3, 4); -- Khan's Biryani House - North Indian, Punjabi

-- Insert sample menu items
INSERT INTO menu_items (vendor_id, name, description, price, category, is_vegetarian, is_vegan, is_spicy, prep_time, calories, is_available) VALUES
-- Raj's Chaat Corner items
(1, 'Pani Puri', 'Crispy puris filled with spicy tangy water, chutneys and fillings', 60.00, 'Chaat', TRUE, TRUE, TRUE, 5, 150, TRUE),
(1, 'Bhel Puri', 'Mumbai style bhel with sev, chutneys and vegetables', 80.00, 'Chaat', TRUE, TRUE, FALSE, 8, 200, TRUE),
(1, 'Aloo Tikki Burger', 'Spiced potato patty burger with mint chutney', 120.00, 'Burgers', TRUE, FALSE, FALSE, 12, 350, TRUE),
(1, 'Masala Chai', 'Traditional Indian spiced tea', 25.00, 'Beverages', TRUE, FALSE, FALSE, 3, 50, TRUE),

-- South Spice Express items
(2, 'Masala Dosa', 'Crispy crepe filled with spiced potato curry', 100.00, 'Main Course', TRUE, TRUE, FALSE, 15, 300, TRUE),
(2, 'Idli Sambhar', '3 pieces steamed rice cakes with sambhar and chutney', 80.00, 'Breakfast', TRUE, TRUE, FALSE, 10, 250, TRUE),
(2, 'Medu Vada', 'Crispy lentil donuts with sambhar and chutney', 90.00, 'Snacks', TRUE, TRUE, TRUE, 12, 280, TRUE),
(2, 'Filter Coffee', 'Authentic South Indian filter coffee', 40.00, 'Beverages', TRUE, FALSE, FALSE, 5, 80, TRUE),

-- Khan's Biryani House items
(3, 'Chicken Biryani', 'Aromatic basmati rice with tender chicken pieces', 280.00, 'Main Course', FALSE, FALSE, TRUE, 25, 550, TRUE),
(3, 'Mutton Biryani', 'Rich mutton biryani with authentic spices', 350.00, 'Main Course', FALSE, FALSE, TRUE, 30, 650, TRUE),
(3, 'Veg Biryani', 'Fragrant vegetable biryani with paneer and vegetables', 220.00, 'Main Course', TRUE, FALSE, FALSE, 20, 450, TRUE),
(3, 'Chicken Seekh Kebab', 'Grilled minced chicken kebabs with spices', 180.00, 'Starters', FALSE, FALSE, TRUE, 18, 320, TRUE);

-- Insert customer addresses
INSERT INTO customer_addresses (customer_id, label, address_line1, city, state, postal_code, latitude, longitude, is_default) VALUES
(2, 'Home', '123 Residency Road, Pune', 'Pune', 'Maharashtra', '411001', 18.5196, 73.8553, TRUE),
(2, 'Office', '456 Tech Park, Hinjewadi', 'Pune', 'Maharashtra', '411057', 18.5912, 73.7389, FALSE),
(3, 'Home', '789 Model Colony, Pune', 'Pune', 'Maharashtra', '411016', 18.5089, 73.8380, TRUE),
(4, 'Home', '321 Baner Road, Pune', 'Pune', 'Maharashtra', '411045', 18.5679, 73.7797, TRUE);

-- Insert sample coupons
INSERT INTO coupons (code, title, description, discount_type, discount_value, minimum_order, maximum_discount, usage_limit, is_active, valid_until) VALUES
('WELCOME10', 'Welcome Offer', 'Get 10% off on your first order', 'percentage', 10.00, 100.00, 50.00, 1000, TRUE, '2024-12-31 23:59:59'),
('SAVE50', 'Flat ₹50 Off', 'Save ₹50 on orders above ₹200', 'fixed', 50.00, 200.00, 50.00, 500, TRUE, '2024-12-31 23:59:59'),
('BIRYANI20', 'Biryani Special', '20% off on all biryani orders', 'percentage', 20.00, 150.00, 100.00, 200, TRUE, '2024-12-31 23:59:59');

-- Insert sample orders
INSERT INTO orders (customer_id, vendor_id, order_number, status, subtotal, delivery_fee, tax_amount, total_amount, payment_method, payment_status, delivery_address, delivery_latitude, delivery_longitude, estimated_delivery_time) VALUES
(2, 1, 'ORD001', 'delivered', 220.00, 30.00, 22.00, 272.00, 'card', 'paid', '123 Residency Road, Pune, Maharashtra 411001', 18.5196, 73.8553, '2024-01-15 19:30:00'),
(3, 2, 'ORD002', 'preparing', 270.00, 25.00, 27.00, 322.00, 'card', 'paid', '789 Model Colony, Pune, Maharashtra 411016', 18.5089, 73.8380, '2024-01-16 20:15:00');

-- Insert order items
INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price) VALUES
(1, 1, 2, 60.00, 120.00), -- 2 Pani Puri
(1, 3, 1, 120.00, 120.00), -- 1 Aloo Tikki Burger
(2, 5, 2, 100.00, 200.00), -- 2 Masala Dosa
(2, 8, 2, 40.00, 80.00); -- 2 Filter Coffee

-- Insert sample reviews
INSERT INTO reviews (customer_id, vendor_id, order_id, rating, comment, is_verified) VALUES
(2, 1, 1, 5, 'Amazing food quality and quick delivery! The pani puri was fresh and tasty.', TRUE),
(3, 2, 2, 4, 'Good South Indian food. Dosa was crispy and sambhar was flavorful.', TRUE);

-- Update vendor ratings based on reviews
UPDATE vendors SET average_rating = 5.0, total_reviews = 1 WHERE id = 1;
UPDATE vendors SET average_rating = 4.0, total_reviews = 1 WHERE id = 2;