// controllers/orderController.js
const orderService = require("../services/order.service");

exports.getAllOrders = async (req, res) => {
  try {
    const { user, chainId, status, limit = 20, skip = 0 } = req.query;
    const result = await orderService.listOrders({
      user,
      chainId: chainId ? parseInt(chainId) : undefined,
      status,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await orderService.getById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { user, chainId, tokenIn, tokenOut, amountIn, targetPrice, deadline, nonce, signature } = req.body;

    if (!user || !chainId || !tokenIn || !tokenOut || !amountIn || !targetPrice || !deadline) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const order = await orderService.createOrder({
      user,
      chainId,
      tokenIn,
      tokenOut,
      amountIn: String(amountIn),
      targetPrice: String(targetPrice),
      deadline: Number(deadline),
      nonce: nonce ? String(nonce) : "",
      signature: signature ? String(signature) : "",
    });

    res.status(201).json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const order = await orderService.updateOrder(req.params.id, req.body);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { txHash = "" } = req.body;
    const order = await orderService.cancelOrder(req.params.id, { txHash });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await orderService.deleteOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
