const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const Order = require("../models/order.model");
const { logger, logDatabaseQuery, logBlockchainTransaction } = require("../adapters/logger.adapter");
const { getContractWithSigner } = require("../adapters/blockchain.adapter");
const { formatResponse, verifyEIP712Signature } = require("../utils/helpers");

const abiPath = path.resolve(__dirname, "../../artifacts/contracts/LimitOrder.sol/LimitOrder.json");
const LimitOrderABI = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;

const CONTRACT_NAME = "limitOrder";
const CHAIN_ID = 11155111;

const orderService = {
  // =====================================================
  // 1️⃣ CREATE ORDER
  // =====================================================
  async createOrder(orderData) {
    const { user, tokenIn, tokenOut, amountIn, targetPrice, deadline, signature } = orderData;
    try {
      const typedData = {
        domain: {
          name: "LimitOrder",
          version: "1",
          chainId: CHAIN_ID,
          verifyingContract: process.env.LIMIT_ORDER_ADDRESS_SEPOLIA,
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
        message: { tokenIn, tokenOut, amountIn, targetPrice, deadline },
      };

      const recovered = await verifyEIP712Signature(typedData, signature);
      if (!recovered || recovered !== user.toLowerCase()) throw new Error("Invalid signature");

      const contract = getContractWithSigner(CHAIN_ID, CONTRACT_NAME, LimitOrderABI);
      const tx = await contract.createOrder(tokenIn, tokenOut, amountIn, amountIn, targetPrice, deadline);
      const receipt = await tx.wait();

      logBlockchainTransaction(CHAIN_ID, receipt.hash, "SUCCESS");

      const newOrder = await Order.create({
        user,
        chainId: CHAIN_ID,
        tokenIn,
        tokenOut,
        amountIn,
        targetPrice,
        status: "OPEN",
        signature,
      });

      logDatabaseQuery("orders", "create", { user, tokenIn, tokenOut });
      return formatResponse(true, { txHash: receipt.hash, order: newOrder }, "Order created successfully");
    } catch (err) {
      logger.error("Create order failed", { error: err.message });
      return formatResponse(false, err.message);
    }
  },

  // =====================================================
  // 2️⃣ VALIDATE SIGNATURE
  // =====================================================
  async validateSignature(orderData) {
    const { user, tokenIn, tokenOut, amountIn, targetPrice, deadline, signature } = orderData;
    try {
      const typedData = {
        domain: {
          name: "LimitOrder",
          version: "1",
          chainId: CHAIN_ID,
          verifyingContract: process.env.LIMIT_ORDER_ADDRESS_SEPOLIA,
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
        message: { tokenIn, tokenOut, amountIn, targetPrice, deadline },
      };

      const recovered = await verifyEIP712Signature(typedData, signature);
      if (!recovered) return formatResponse(false, null, "Failed to recover signer");

      const isValid = recovered.toLowerCase() === user.toLowerCase();
      return formatResponse(isValid, { recovered }, isValid ? "Signature is valid" : "Invalid signature");
    } catch (err) {
      logger.error("Validate signature failed", { error: err.message });
      return formatResponse(false, err.message);
    }
  },

  // =====================================================
  // 3️⃣ GET ALL ORDERS
  // =====================================================
  async getOrders(query) {
    try {
      const filter = {};
      if (query.user) filter.user = query.user.toLowerCase();
      if (query.status) filter.status = query.status.toUpperCase();
      if (query.chainId) filter.chainId = Number(query.chainId);

      const orders = await Order.find(filter).sort({ createdAt: -1 });
      logDatabaseQuery("orders", "find", filter);
      return formatResponse(true, orders, "Orders fetched successfully");
    } catch (err) {
      logger.error("Get orders failed", { error: err.message });
      return formatResponse(false, err.message);
    }
  },

  // =====================================================
  // 4️⃣ GET ORDER BY ID
  // =====================================================
  async getOrderById(id) {
    try {
      const order = await Order.findById(id);
      if (!order) return formatResponse(false, null, "Order not found");

      logDatabaseQuery("orders", "findById", { id });
      return formatResponse(true, order, "Order fetched successfully");
    } catch (err) {
      logger.error("Get order by id failed", { error: err.message });
      return formatResponse(false, err.message);
    }
  },

  // =====================================================
  // 5️⃣ UPDATE ORDER
  // =====================================================
  async updateOrder(id, updates) {
    try {
      const order = await Order.findByIdAndUpdate(id, updates, { new: true });
      if (!order) return formatResponse(false, null, "Order not found");

      logDatabaseQuery("orders", "update", { id, updates });
      return formatResponse(true, order, "Order updated successfully");
    } catch (err) {
      logger.error("Update order failed", { error: err.message });
      return formatResponse(false, err.message);
    }
  },

  // =====================================================
  // 6️⃣ CANCEL ORDER
  // =====================================================
  async cancelOrder(id, address) {
    try {
      const order = await Order.findById(id);
      if (!order) return formatResponse(false, null, "Order not found");
      if (order.status !== "OPEN") return formatResponse(false, null, "Order cannot be cancelled");
      if (order.user.toLowerCase() !== address.toLowerCase()) return formatResponse(false, null, "Unauthorized");

      order.status = "CANCELLED";
      order.cancelledAt = new Date();
      await order.save();

      logDatabaseQuery("orders", "cancel", { id, address });
      return formatResponse(true, order, "Order cancelled successfully");
    } catch (err) {
      logger.error("Cancel order failed", { error: err.message });
      return formatResponse(false, err.message);
    }
  },

  // =====================================================
  // 7️⃣ EXPIRE ORDER
  // =====================================================
  async expireOrder(id) {
    try {
      const order = await Order.findById(id);
      if (!order) return formatResponse(false, null, "Order not found");
      if (order.status !== "OPEN") return formatResponse(false, null, "Order cannot be expired");

      order.status = "EXPIRED";
      order.expiresAt = new Date();
      await order.save();

      logDatabaseQuery("orders", "expire", { id });
      return formatResponse(true, order, "Order expired successfully");
    } catch (err) {
      logger.error("Expire order failed", { error: err.message });
      return formatResponse(false, err.message);
    }
  },

  // =====================================================
  // 8️⃣ DELETE ORDER
  // =====================================================
  async deleteOrder(id) {
    try {
      const order = await Order.findByIdAndDelete(id);
      if (!order) return formatResponse(false, null, "Order not found");

      logDatabaseQuery("orders", "delete", { id });
      return formatResponse(true, order, "Order deleted successfully");
    } catch (err) {
      logger.error("Delete order failed", { error: err.message });
      return formatResponse(false, err.message);
    }
  },
};

module.exports = { orderService };
