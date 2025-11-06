/**
 * User Routes
 * Định nghĩa các routes cho users
 */

// server/routes/user.route.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController"); 
const { verifyJWT } = require("../middlewares/authMiddleware");

/**
 * @route GET /api/users/:address
 * @desc  Lấy chi tiết user theo địa chỉ ví (PUBLIC)
 * @access Public
 */
router.get("/:address", userController.getUser);

/**
 * @route PATCH /api/users/display-name
 * @desc  Cập nhật tên hiển thị (ENS/custom)
 * @access Private (JWT)
 */
router.patch("/display-name", verifyJWT, userController.updateDisplayName);

/**
 * @route PATCH /api/users/role
 * @desc  Đổi vai trò user (ADMIN only)
 * @access Private (JWT, role = admin)
 */
router.patch("/role", verifyJWT, userController.updateUserRole);

module.exports = router;
