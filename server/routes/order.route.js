const express = require("express");
const { orderController } = require("../controllers/orderController");


const router = express.Router();

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
router.post("/", orderController.create);

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
router.post("/validate-signature", orderController.validateSignature);

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
router.get("/", orderController.list);

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
router.get("/:id", orderController.getById);

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
router.patch("/:id", orderController.update);

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
router.patch("/:id/cancel", orderController.cancel);

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
router.patch("/:id/expire", orderController.expire);

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
router.delete("/:id", orderController.delete);

module.exports = router;
