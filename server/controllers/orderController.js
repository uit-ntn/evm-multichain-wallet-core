/**
 * Order Controller (CommonJS)
 * Handles HTTP requests for order endpoints
 */

const { orderService } = require("../services/order.service");

const orderController = {
  async create(req, res) {
    const result = await orderService.createOrder(req.body);
    res.status(result.success ? 201 : 400).json(result);
  },

  async validateSignature(req, res) {
    const result = await orderService.validateSignature(req.body);
    res.status(result.success ? 200 : 400).json(result);
  },

  async list(req, res) {
    const result = await orderService.getOrders(req.query);
    res.status(result.success ? 200 : 400).json(result);
  },

  async getById(req, res) {
    const result = await orderService.getOrderById(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  },

  async update(req, res) {
    const result = await orderService.updateOrder(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  },

  async cancel(req, res) {
    const { address } = req.body;
    const result = await orderService.cancelOrder(req.params.id, address);
    res.status(result.success ? 200 : 400).json(result);
  },

  async expire(req, res) {
    const result = await orderService.expireOrder(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  },

  async delete(req, res) {
    const result = await orderService.deleteOrder(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  },
};

module.exports = { orderController };
