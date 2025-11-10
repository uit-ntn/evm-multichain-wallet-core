/**
 * Order Controller (CommonJS)
 * Handles HTTP requests for order endpoints
 * Maps service responses to proper HTTP status codes
 */

const { orderService } = require("../services/order.service");
const { logger } = require("../adapters/logger.adapter");

const orderController = {
  // =====================================================
  // 1️⃣ CREATE ORDER - POST /api/orders
  // =====================================================
  async create(req, res) {
    try {
      const result = await orderService.createOrder(req.body);
      
      // Use status code from service if provided, otherwise default mapping
      const statusCode = result.statusCode || (result.success ? 201 : 400);
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error("Order create controller error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  // =====================================================
  // 2️⃣ VALIDATE SIGNATURE - POST /api/orders/validate-signature
  // =====================================================
  async validateSignature(req, res) {
    try {
      const result = await orderService.validateSignature(req.body);
      
      const statusCode = result.statusCode || (result.success ? 200 : 422);
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error("Validate signature controller error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  // =====================================================
  // 3️⃣ LIST ORDERS - GET /api/orders
  // =====================================================
  async list(req, res) {
    try {
      const result = await orderService.getOrders(req.query);
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error("Order list controller error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  // =====================================================
  // 4️⃣ GET ORDER BY ID - GET /api/orders/:id
  // =====================================================
  async getById(req, res) {
    try {
      const result = await orderService.getOrderById(req.params.id);
      
      const statusCode = result.success ? 200 : 404;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error("Order getById controller error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  // =====================================================
  // 5️⃣ UPDATE ORDER - PATCH /api/orders/:id
  // =====================================================
  async update(req, res) {
    try {
      // Get user from auth middleware (if implemented)
      const userAddress = req.user?.address || req.body.user;
      
      const result = await orderService.updateOrder(req.params.id, req.body, userAddress);
      
      const statusCode = result.statusCode || (result.success ? 200 : 400);
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error("Order update controller error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  // =====================================================
  // 6️⃣ CANCEL ORDER - PATCH /api/orders/:id/cancel
  // =====================================================
  async cancel(req, res) {
    try {
      const { user, address } = req.body;
      const userAddress = user || address || req.user?.address;
      
      if (!userAddress) {
        return res.status(400).json({
          success: false,
          message: "Missing user address in request body"
        });
      }

      const result = await orderService.cancelOrder(req.params.id, userAddress);
      
      const statusCode = result.statusCode || (result.success ? 200 : 400);
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error("Order cancel controller error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  // =====================================================
  // 7️⃣ EXPIRE ORDER - PATCH /api/orders/:id/expire (Admin/Cron)
  // =====================================================
  async expire(req, res) {
    try {
      // TODO: Add admin role check
      const isAdmin = req.user?.role === 'admin' || req.headers['x-admin-secret'] === process.env.ADMIN_SECRET;
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Forbidden - admin access required"
        });
      }

      const result = await orderService.expireOrder(req.params.id);
      
      const statusCode = result.statusCode || (result.success ? 200 : 400);
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error("Order expire controller error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  // =====================================================
  // 8️⃣ DELETE ORDER - DELETE /api/orders/:id
  // =====================================================
  async delete(req, res) {
    try {
      const userAddress = req.user?.address || req.body.user;
      const isAdmin = req.user?.role === 'admin' || req.headers['x-admin-secret'] === process.env.ADMIN_SECRET;

      const result = await orderService.deleteOrder(req.params.id, userAddress, isAdmin);
      
      const statusCode = result.statusCode || (result.success ? 200 : 400);
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error("Order delete controller error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  // =====================================================
  // 9️⃣ FILL ORDER - POST /api/orders/fill (Bot/Listener)
  // =====================================================
  async fill(req, res) {
    try {
      const { orderId, txHashFill, secret } = req.body;
      
      if (!orderId || !txHashFill) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: orderId, txHashFill"
        });
      }

      const result = await orderService.fillOrder(orderId, txHashFill, secret);
      
      const statusCode = result.statusCode || (result.success ? 200 : 400);
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error("Order fill controller error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },
};

module.exports = { orderController };
