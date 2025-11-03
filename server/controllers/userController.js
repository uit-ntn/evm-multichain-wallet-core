/**
 * User Controller
 * Xử lý các HTTP requests liên quan đến user
 */

const jwt = require('jsonwebtoken');
const userService = require('../services/user.service');
const { logger } = require('../adapters/logger.adapter');
const { jwt: jwtConfig } = require('../config');

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
    const users = await userService.getAllUsers({ page, limit }); // cần sửa service nếu chưa có hỗ trợ phân trang

    // 200 OK – Trả danh sách
    return res.status(200).json(users);
  } catch (error) {
    logger.error('Error getting all users', { error: error.message });
    // 500 Internal Server Error
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/users - Upsert user by address (authenticated user)
 * - Requires Authorization: Bearer <token>
 * - Body: { address?: string, displayName?: string }
 * - Uses address from JWT as authoritative; if address provided in body must match token address.
 */
const upsertUser = async (req, res) => {
  try {
    // Verify token from Authorization header if req.user not already populated
    let tokenPayload = null;
    if (!req.user) {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
      }
      const token = authHeader.split(' ')[1];
      try {
        tokenPayload = jwt.verify(token, jwtConfig.secret);
      } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    } else {
      tokenPayload = req.user;
    }

    const requesterAddress = (tokenPayload.address || '').toLowerCase();
    if (!requesterAddress) {
      return res.status(401).json({ error: 'Unauthorized: token missing address' });
    }

    // Read body; prefer address from token; if body.address present it must match token address
    const { address: bodyAddress, displayName } = req.body || {};
    if (bodyAddress && bodyAddress.toLowerCase() !== requesterAddress) {
      return res.status(403).json({ error: 'Forbidden: address in body does not match token' });
    }

    const address = requesterAddress;

    // Validate address format
    const addrRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addrRegex.test(address)) {
      return res.status(422).json({ error: 'Unprocessable Entity: invalid address format' });
    }

    // Validate displayName if provided
    let cleanDisplayName = undefined;
    if (typeof displayName !== 'undefined') {
      if (displayName === null) {
        cleanDisplayName = '';
      } else if (typeof displayName !== 'string') {
        return res.status(422).json({ error: 'Unprocessable Entity: displayName must be a string' });
      } else {
        const name = displayName.trim();
        // Allow letters, numbers, dots, hyphens, underscores and spaces; length 1-50
        const nameRegex = /^[\w.\- ]{1,50}$/u;
        if (name.length === 0 || !nameRegex.test(name)) {
          return res.status(422).json({ error: 'Unprocessable Entity: displayName not valid' });
        }
        cleanDisplayName = name;
      }
    }

    // Call service to upsert
    const result = await userService.upsertUserByAddress({ address, displayName: cleanDisplayName, role: tokenPayload.role || 'user' });

    // Log creation event on new user (audit)
    if (result.created) {
      logger.info('User upsert: created', { address: result.user.address, displayName: result.user.displayName });
    } else {
      logger.info('User upsert: updated', { address: result.user.address, displayName: result.user.displayName });
    }

    // Return 201 if created, 200 if updated
    return res.status(result.created ? 201 : 200).json({ user: result.user, created: result.created });
  } catch (error) {
    // Handle known error codes from service
    if (error && error.code === 'DISPLAYNAME_TAKEN') {
      return res.status(409).json({ error: 'Conflict: displayName already in use' });
    }
    if (error && error.code === 'DUPLICATE_KEY') {
      return res.status(409).json({ error: 'Conflict: duplicate key' });
    }
    console.error("🔥 Error upserting user:", error);
logger.error('Error upserting user', { error });
return res.status(500).json({ error: error.message || 'Internal server error' });

  }
};

module.exports = {
  getAllUsers,
  upsertUser,
};
