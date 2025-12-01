const express = require('express');
const express = require("express");
const { orderController } = require("../controllers/orderController");


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
/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Create a new order
 *     responses:
 *       201:
 *         description: Order created
 */

/**
 * @openapi
 * /api/orders/validate-signature:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Validate order signature
 *     responses:
 *       200:
 *         description: Signature valid
 */

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: List orders (with pagination)
 *     responses:
 *       200:
 *         description: Returns list of orders
 */

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get order by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order object
 */

/**
 * @openapi
 * /api/orders/{id}:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Update an order
 *     responses:
 *       200:
 *         description: Updated order
 */

/**
 * @openapi
 * /api/orders/{id}/cancel:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Cancel an order
 *     responses:
 *       200:
 *         description: Order cancelled
 */

/**
 * @openapi
 * /api/orders/{id}/expire:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Mark order as expired
 *     responses:
 *       200:
 *         description: Order expired
 */

/**
 * @openapi
 * /api/orders/{id}:
 *   delete:
 *     tags:
 *       - Orders
 *     summary: Delete an order
 *     responses:
 *       204:
 *         description: Order deleted
 */

module.exports = router;