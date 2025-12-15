// routes/order.route.js
const express = require("express");
const router = express.Router();

const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  cancelOrder,
  deleteOrder,
} = require("../controllers/orderController");

router.get("/", getAllOrders);          // ?user=&chainId=&status=&limit=&skip=
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.patch("/:id", updateOrder);
router.patch("/:id/cancel", cancelOrder);
router.delete("/:id", deleteOrder);

module.exports = router;
