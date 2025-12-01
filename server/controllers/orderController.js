const { orderService } = require("../services/order.service");
const { logger } = require("../adapters/logger.adapter");

const orderController = {
  // [1] Create Order
  create: async (req, res) => {
    try {
      const result = await orderService.createOrder(req.body);
      const code = result.statusCode || (result.success ? 201 : 400);
      res.status(code).json(result);
    } catch (error) {
      logger.error("Order create error", { error: error.message });
      res.status(500).json({ message: error.message });
    }
  },

  // [9] Fill Order (Bot)
  fill: async (req, res) => {
    try {
      const { orderId, txHashFill } = req.body;
      const secret = req.headers['x-bot-secret']; 
      
      if (!orderId || !txHashFill) return res.status(400).json({ message: "Missing data" });

      const result = await orderService.fillOrder(orderId, txHashFill, secret);
      const code = result.statusCode || (result.success ? 200 : 500);
      res.status(code).json(result);
    } catch (error) {
      logger.error("Order fill error", { error: error.message });
      res.status(500).json({ message: error.message });
    }
  },
  
  // Placeholder cho các hàm của An (để tránh lỗi nếu Route gọi tới)
  list: async (req, res) => res.json({ message: "List orders (TODO by An)" }),
  getById: async (req, res) => res.json({ message: "Get order detail (TODO by An)" }),
  update: async (req, res) => res.json({ message: "Update order (TODO by An)" }),
  cancel: async (req, res) => res.json({ message: "Cancel order (TODO by An)" }),
  expire: async (req, res) => res.json({ message: "Expire order (TODO by An)" }),
  delete: async (req, res) => res.json({ message: "Delete order (TODO by An)" }),
  validateSignature: async (req, res) => res.json({ message: "Validate sig (TODO by An)" })
};

// --- [QUAN TRỌNG] Sửa dòng này ---
module.exports = orderController; 
// Không dùng: module.exports = { orderController };