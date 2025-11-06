/**
 * User Routes
 * Định nghĩa các routes cho users
 */

// routes/user.route.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// PUBLIC: lấy chi tiết user theo ví
router.get("/:address", userController.getUser);

module.exports = router;
