/**
 * User Routes
 * Định nghĩa các routes cho users
 */

import express from 'express';
// Bạn có thể cần thêm .js ở cuối, tùy thuộc vào cấu hình project
import userController from '../controllers/userController.js'; 

const router = express.Router();

// GET /api/users - Get all users
router.get('/', userController.getAllUsers);

// Thay thế "module.exports" bằng "export default"
export default router;