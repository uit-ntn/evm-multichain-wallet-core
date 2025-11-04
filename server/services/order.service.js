import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import Order from "../models/order.model.js";
import { logger, logDatabaseQuery, logBlockchainTransaction } from "../adapters/logger.adapter.js";
import { getContractWithSigner } from "../adapters/blockchain.adapter.js";
import { formatResponse, verifyEIP712Signature } from "../utils/helpers.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const abiPath = path.resolve(__dirname, "../../artifacts/contracts/LimitOrder.sol/LimitOrder.json");
const LimitOrderABI = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;

const CONTRACT_NAME = "limitOrder";
const CHAIN_ID = 11155111; // Sepolia

export const orderService = {
  /** Create new order (on-chain + DB) */
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
      if (!recovered || recovered !== user.toLowerCase())
        throw new Error("Invalid EIP-712 signature or signer mismatch");

      const contract = getContractWithSigner(CHAIN_ID, CONTRACT_NAME, LimitOrderABI);
      const tx = await contract.createOrder(tokenIn, tokenOut, amountIn, amountIn, targetPrice, deadline);
      const receipt = await tx.wait();

      logBlockchainTransaction(CHAIN_ID, receipt.hash, "SUCCESS", receipt.gasUsed?.toString());

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

  async validateSignature(payload) {
    try {
      const { typedData, signature } = payload;
      const recovered = await verifyEIP712Signature(typedData, signature);
      if (!recovered) throw new Error("Invalid signature");
      return formatResponse(true, { recovered });
    } catch (err) {
      return formatResponse(false, err.message);
    }
  },

  async getOrders(query) {
    const { user, status, page = 1, limit = 20 } = query;
    try {
      const skip = (page - 1) * limit;
      const filter = {};
      if (user) filter.user = user.toLowerCase();
      if (status) filter.status = status.toUpperCase();

      const total = await Order.countDocuments(filter);
      const orders = await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
      return formatResponse(true, { total, page, limit, orders });
    } catch (err) {
      return formatResponse(false, err.message);
    }
  },

  async getOrderById(id) {
    try {
      const order = await Order.findById(id);
      if (!order) throw new Error("Order not found");
      return formatResponse(true, order);
    } catch (err) {
      return formatResponse(false, err.message);
    }
  },

  async updateOrder(id, updates) {
    try {
      const order = await Order.findById(id);
      if (!order) throw new Error("Order not found");
      if (order.status !== "OPEN") throw new Error("Cannot update non-OPEN order");
      Object.assign(order, updates);
      await order.save();
      return formatResponse(true, order, "Order updated");
    } catch (err) {
      return formatResponse(false, err.message);
    }
  },

  async cancelOrder(id, user) {
    try {
      const order = await Order.findById(id);
      if (!order) throw new Error("Order not found");
      if (order.user !== user.toLowerCase()) throw new Error("Not order owner");
      if (order.status !== "OPEN") throw new Error("Order not OPEN");

      const contract = getContractWithSigner(CHAIN_ID, CONTRACT_NAME, LimitOrderABI);
      const tx = await contract.cancelOrder(id);
      const receipt = await tx.wait();

      await order.cancel();
      logBlockchainTransaction(CHAIN_ID, receipt.hash, "CANCELLED");
      return formatResponse(true, { txHash: receipt.hash, order }, "Order cancelled");
    } catch (err) {
      return formatResponse(false, err.message);
    }
  },

  async expireOrder(id) {
    try {
      const order = await Order.findById(id);
      if (!order) throw new Error("Order not found");
      if (order.status !== "OPEN") throw new Error("Order not OPEN");
      await order.expire();
      return formatResponse(true, order, "Order marked as expired");
    } catch (err) {
      return formatResponse(false, err.message);
    }
  },

  async deleteOrder(id) {
    try {
      const result = await Order.findByIdAndDelete(id);
      if (!result) throw new Error("Order not found or already deleted");
      return formatResponse(true, result, "Order deleted");
    } catch (err) {
      return formatResponse(false, err.message);
    }
  },
};
