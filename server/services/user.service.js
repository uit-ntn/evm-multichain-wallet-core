/**
 * User Service
 * Business logic cho user management
 */

// Đổi 'require' sang 'import' (thêm .js)
import User from '../models/user.model.js';
import { logger } from '../adapters/logger.adapter.js';

/**
 * Lấy tất cả users với tùy chọn phân trang
 * @param {object} options - Tùy chọn phân trang
 * @param {number} options.page - Trang hiện tại
 * @param {number} options.limit - Số lượng item trên mỗi trang
 */
const getAllUsers = async (options) => {
  try {
    const { page, limit } = options;

    // Tính toán số lượng document cần bỏ qua (skip)
    const skip = (page - 1) * limit;

    // Áp dụng skip và limit vào query
    const users = await User.find({})
      .select('-password') // Không trả về password
      .skip(skip)           // Bỏ qua các trang trước
      .limit(limit);        // Giới hạn số lượng kết quả

    return users;
  } catch (error) {
    logger.error('Error getting all users', { error: error.message });
    throw error;
  }
};

// Đổi 'module.exports' thành 'export default'
export default {
  getAllUsers,
};