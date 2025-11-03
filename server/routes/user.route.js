/**
 * User Routes
 * Định nghĩa các routes cho users
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users - Get all users
router.get('/', userController.getAllUsers);

// POST /api/users - Upsert user by address (controller will validate JWT)
if (userController && typeof userController.upsertUser === 'function') {
  router.post('/', userController.upsertUser);
} else {
  console.warn('User controller missing handler: upsertUser');
  router.post('/', (req, res) => res.status(501).json({ message: 'Upsert handler not implemented' }));
}

// Liệt kê user (chỉ admin)
router.get('/', userController.getAllUsers);

module.exports = router;
