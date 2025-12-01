const express = require('express');
const router = express.Router();
// Import trực tiếp (vì bên controller đã export trực tiếp)
const orderController = require('../controllers/orderController');

// Debug log để kiểm tra (sẽ hiện trong terminal khi chạy lại)
console.log("Loaded OrderController:", orderController);

// Nguyên phụ trách:
router.post('/', orderController.create);
router.post('/fill', orderController.fill);

// Các route của An (Placeholder - Giữ lại để code không lỗi)
router.get('/', orderController.list);
router.get('/:id', orderController.getById);
router.patch('/:id', orderController.update);
router.patch('/:id/cancel', orderController.cancel);
router.patch('/:id/expire', orderController.expire);
router.delete('/:id', orderController.delete);
router.post('/validate-signature', orderController.validateSignature);

module.exports = router;