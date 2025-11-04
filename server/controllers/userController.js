/**
 * User Controller
 * Xử lý các HTTP requests liên quan đến user
 */

// Đổi 'require' sang 'import'
// Thêm .js ở cuối (thường là bắt buộc trong ES Modules)
import userService from '../services/user.service.js';
import { logger } from '../adapters/logger.adapter.js';

const getAllUsers = async (req, res) => {
  try {
    // 401 Unauthorized – thiếu JWT
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    // 403 Forbidden – không phải admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Phân trang (pagination)
    let { page = 1, limit = 20 } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    // 400 Bad Request – tham số phân trang sai
    if (
      isNaN(page) || isNaN(limit) ||
      page < 1 || limit < 1 ||
      !Number.isInteger(page) || !Number.isInteger(limit) ||
      limit > 100
    ) {
      return res.status(400).json({ error: 'Bad Request: Invalid pagination parameters' });
    }

    // 429 Too Many Requests – Giả lập, trong thực tế sẽ dùng middleware rate limit, ở đây demo:
    if (req.tooManyRequests) {
      return res.status(429).json({ error: 'Too Many Requests: Rate limit exceeded' });
    }

    // Lấy dữ liệu người dùng với phân trang
    const users = await userService.getAllUsers({ page, limit });

    // 200 OK – Trả danh sách
    return res.status(200).json(users);
  } catch (error) {
    logger.error('Error getting all users', { error: error.message });
    // 500 Internal Server Error
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Đổi 'module.exports = { ... }' thành 'export default { ... }'
// File router của bạn (user.route.js) đang import `userController`
// và mong đợi nó là một object có chứa hàm `getAllUsers`.
// `export default` sẽ đảm bảo điều đó.
export default {
  getAllUsers,
};