const Order = require("../models/order.model");
const { verifyEIP712Signature, formatResponse } = require("../utils/helpers");
const { logger, logDatabaseQuery } = require("../adapters/logger.adapter");
const { v4: uuidv4 } = require('uuid');

// Chỉ giữ lại Chain Config để validate, không cần Contract Instance để write
const { getEnabledChains } = require("../config/chains");
const getChainConfig = (chainId) => {
  const chains = getEnabledChains();
  const chain = chains.find(c => c.chainId === parseInt(chainId));
  if (!chain) throw new Error(`Unsupported chainId: ${chainId}`);
  return chain;
};

const orderService = {
  // =====================================================
  // 1️⃣ CREATE ORDER (Task của Nguyên: Chỉ lưu Off-chain)
  // =====================================================
  async createOrder(orderData) {
    const { user, tokenIn, tokenOut, amountIn, targetPrice, deadline, signature, chainId } = orderData;
    try {
      // 1. Validation cơ bản
      const chain = getChainConfig(chainId);
      const contractAddress = chain.contracts?.limitOrder;
      
      const now = Math.floor(Date.now() / 1000);
      const deadlineTimestamp = new Date(deadline).getTime() / 1000;
      if (deadlineTimestamp <= now) throw new Error("Deadline must be in the future");

      // 2. Verify EIP-712 Signature (Quan trọng)
      const typedData = {
        domain: {
          name: "LimitOrder",
          version: "1",
          chainId: parseInt(chainId),
          verifyingContract: contractAddress,
        },
        types: {
          Order: [
            { name: "tokenIn", type: "address" },
            { name: "tokenOut", type: "address" },
            { name: "amountIn", type: "uint256" },
            { name: "targetPrice", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        message: { 
          tokenIn, tokenOut, amountIn, targetPrice, 
          deadline: deadlineTimestamp.toString() 
        },
      };

      const recovered = await verifyEIP712Signature(typedData, signature);
      if (!recovered || recovered.toLowerCase() !== user.toLowerCase()) {
        throw new Error("Invalid EIP-712 signature");
      }

      // 3. Check Duplicate
      const exists = await Order.findOne({ signature });
      if (exists) throw new Error("Signature already used");

      // 4. Lưu vào DB (KHÔNG gửi on-chain)
      const newOrder = await Order.create({
        orderId: uuidv4(), // Generate ID riêng
        user: user.toLowerCase(),
        chainId: parseInt(chainId),
        tokenIn: tokenIn.toLowerCase(),
        tokenOut: tokenOut.toLowerCase(),
        amountIn: amountIn.toString(),
        targetPrice: targetPrice.toString(),
        deadline: new Date(deadline),
        status: "OPEN",
        signature
      });

      logDatabaseQuery("orders", "create", { user, orderId: newOrder.orderId });
      
      return formatResponse(true, { 
        orderId: newOrder.orderId,
        status: "OPEN"
      }, "Order created successfully");

    } catch (err) {
      logger.error("Create order failed", { error: err.message });
      // Mapping Error Message sang Status Code cho Controller xử lý
      if (err.message.includes("Invalid EIP-712")) return { success: false, message: err.message, statusCode: 422 };
      if (err.message.includes("Signature already used")) return { success: false, message: err.message, statusCode: 409 };
      return { success: false, message: err.message, statusCode: 500 };
    }
  },

  // =====================================================
  // 9️⃣ FILL ORDER (Task của Nguyên: Bot gọi khi đã khớp)
  // =====================================================
  async fillOrder(orderId, txHashFill, botSecret) {
    try {
      // 1. Security Check
      if (process.env.BOT_SECRET_KEY && botSecret !== process.env.BOT_SECRET_KEY) {
        return { success: false, message: "Invalid Bot Secret", statusCode: 403 };
      }

      // 2. Logic Update
      const order = await Order.findOne({ orderId });
      if (!order) return { success: false, message: "Order not found", statusCode: 404 };
      if (order.status !== "OPEN") return { success: false, message: "Order not OPEN", statusCode: 409 };

      order.status = "FILLED";
      order.txHashFill = txHashFill;
      order.filledAt = new Date();
      await order.save();

      logDatabaseQuery("orders", "fill", { orderId, txHashFill });
      return formatResponse(true, { status: "FILLED", orderId }, "Order filled");

    } catch (err) {
      logger.error("Fill order failed", { error: err.message });
      return { success: false, message: err.message, statusCode: 500 };
    }
  },
  
  // NOTE: Các hàm getList, getById, update, cancel... thuộc về AN
  // Bạn có thể giữ placeholder để code không lỗi
  async getOrders(query) { /* Placeholder for An */ return { success: true, data: [] } },
  async getOrderById(id) { /* Placeholder for An */ return { success: false, statusCode: 404 } }
};

module.exports = { orderService };