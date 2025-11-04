/**
 * User Routes
 * Định nghĩa các routes cho users
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Get all users
router.get('/', userController.getAllUsers);

// Upsert user by address (controller will validate JWT)
if (userController && typeof userController.upsertUser === 'function') {
  router.post('/', userController.upsertUser);
} else {
  console.warn('User controller missing handler: upsertUser');
  router.post('/', (req, res) => res.status(501).json({ message: 'Upsert handler not implemented' }));
}

// Liệt kê user (chỉ admin)
router.get('/', userController.getAllUsers);

// Xoá user (chỉ admin)
router.delete("/:address", userController.deleteUser);

module.exports = router;
