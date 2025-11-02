/**
 * User Routes
 * Định nghĩa các routes cho users
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users - Get all users
router.get('/', userController.getAllUsers);

module.exports = router;
