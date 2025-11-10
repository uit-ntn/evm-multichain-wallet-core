const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const Order = require("../models/order.model");
const { logger, logDatabaseQuery, logBlockchainTransaction } = require("../adapters/logger.adapter");
const { getContractWithSigner } = require("../adapters/blockchain.adapter");
const { formatResponse, verifyEIP712Signature } = require("../utils/helpers");
const { getEnabledChains } = require("../config/chains");

const abiPath = path.resolve(__dirname, "../../artifacts/contracts/LimitOrder.sol/LimitOrder.json");
const LimitOrderABI = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;

const CONTRACT_NAME = "limitOrder";

// ===== MULTICHAIN SUPPORT =====
const getChainConfig = (chainId) => {
  const chains = getEnabledChains();
  const chain = chains.find(c => c.chainId === parseInt(chainId));
  if (!chain) throw new Error(`Unsupported chainId: ${chainId}`);
  return chain;
};

const getContractAddress = (chainId) => {
  const chain = getChainConfig(chainId);
  const address = chain.contracts?.limitOrder;
  if (!address || address === "0x...") {
    throw new Error(`LimitOrder contract not deployed on chain ${chainId}`);
  }
  return address;
};

const orderService = {
  // =====================================================
  // 1️⃣ CREATE ORDER (HYBRID - Off-chain validation + On-chain submission)
  // =====================================================
  async createOrder(orderData) {
    const { user, tokenIn, tokenOut, amountIn, targetPrice, deadline, signature, chainId } = orderData;
    try {
      // Validate chainId support
      const chain = getChainConfig(chainId);
      const contractAddress = getContractAddress(chainId);

      // Validate deadline
      const deadlineTimestamp = new Date(deadline).getTime() / 1000;
      const now = Math.floor(Date.now() / 1000);
      if (deadlineTimestamp <= now) {
        throw new Error("Deadline must be in the future");
      }

      // EIP-712 signature validation
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
        message: { tokenIn, tokenOut, amountIn, targetPrice, deadline: deadlineTimestamp.toString() },
      };

      const recovered = await verifyEIP712Signature(typedData, signature);
      if (!recovered || recovered.toLowerCase() !== user.toLowerCase()) {
        throw new Error("Invalid signature");
      }

      // Check for duplicate signature (prevent replay)
      const existingOrder = await Order.findOne({ signature });
      if (existingOrder) {
        throw new Error("Signature already used");
      }

      // Submit to blockchain
      const contract = getContractWithSigner(chainId, CONTRACT_NAME, LimitOrderABI);
      const tx = await contract.createOrder(tokenIn, tokenOut, amountIn, amountIn, targetPrice, deadlineTimestamp);
      const receipt = await tx.wait();

      logBlockchainTransaction(chainId, receipt.hash, "SUCCESS");

      // Save to database
      const newOrder = await Order.create({
        user: user.toLowerCase(),
        chainId: parseInt(chainId),
        tokenIn: tokenIn.toLowerCase(),
        tokenOut: tokenOut.toLowerCase(),
        amountIn: amountIn.toString(),
        targetPrice: targetPrice.toString(),
        deadline: new Date(deadline),
        status: "OPEN",
        signature,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      logDatabaseQuery("orders", "create", { user, chainId, tokenIn, tokenOut });
      return formatResponse(true, { 
        orderId: newOrder._id,
        txHash: receipt.hash, 
        status: "OPEN",
        order: newOrder 
      }, "Order created successfully");
    } catch (err) {
      logger.error("Create order failed", { error: err.message, chainId, user });
      
      // Map errors to proper HTTP status codes
      if (err.message.includes("Invalid signature")) {
        return formatResponse(false, "Invalid EIP-712 signature", null, 422);
      }
      if (err.message.includes("Signature already used")) {
        return formatResponse(false, "Signature already used", null, 409);
      }
      if (err.message.includes("Deadline must be in the future")) {
        return formatResponse(false, "Invalid deadline", null, 400);
      }
      if (err.message.includes("Unsupported chainId")) {
        return formatResponse(false, err.message, null, 400);
      }
      
      return formatResponse(false, err.message, null, 500);
    }
  },

  // =====================================================
  // 2️⃣ VALIDATE SIGNATURE (OFF-CHAIN - Debug utility)
  // =====================================================
  async validateSignature(orderData) {
    const { user, tokenIn, tokenOut, amountIn, targetPrice, deadline, signature, chainId } = orderData;
    try {
      // Validate required fields
      if (!user || !tokenIn || !tokenOut || !amountIn || !targetPrice || !deadline || !signature || !chainId) {
        return formatResponse(false, null, "Missing required fields", 400);
      }

      // Get chain configuration
      const chain = getChainConfig(chainId);
      const contractAddress = getContractAddress(chainId);

      // Convert deadline to timestamp if needed
      const deadlineTimestamp = typeof deadline === 'string' 
        ? Math.floor(new Date(deadline).getTime() / 1000)
        : deadline;

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
          tokenIn, 
          tokenOut, 
          amountIn: amountIn.toString(), 
          targetPrice: targetPrice.toString(), 
          deadline: deadlineTimestamp.toString() 
        },
      };

      const recovered = await verifyEIP712Signature(typedData, signature);
      if (!recovered) {
        return formatResponse(false, null, "Failed to recover signer from signature", 422);
      }

      const isValid = recovered.toLowerCase() === user.toLowerCase();
      const statusCode = isValid ? 200 : 422;
      
      return formatResponse(
        isValid, 
        { 
          valid: isValid,
          signer: recovered,
          expectedSigner: user,
          chainId: parseInt(chainId),
          contractAddress 
        }, 
        isValid ? "Signature is valid" : "Invalid signature: signer mismatch",
        statusCode
      );
    } catch (err) {
      logger.error("Validate signature failed", { error: err.message, chainId, user });
      
      if (err.message.includes("Unsupported chainId")) {
        return formatResponse(false, err.message, null, 400);
      }
      
      return formatResponse(false, err.message, null, 422);
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
  // 6️⃣ CANCEL ORDER (HYBRID - Database + Blockchain)
  // =====================================================
  async cancelOrder(id, address) {
    try {
      const order = await Order.findById(id);
      if (!order) return formatResponse(false, null, "Order not found", 404);
      
      if (order.status !== "OPEN") {
        return formatResponse(false, null, `Order cannot be cancelled. Current status: ${order.status}`, 409);
      }
      
      if (order.user.toLowerCase() !== address.toLowerCase()) {
        return formatResponse(false, null, "Unauthorized - not order owner", 403);
      }

      // Optional: Cancel on blockchain if needed
      // For now, just update database status
      // TODO: Implement blockchain cancellation if contract supports it
      
      order.status = "CANCELLED";
      order.cancelledAt = new Date();
      await order.save();

      logDatabaseQuery("orders", "cancel", { id, address, chainId: order.chainId });
      
      return formatResponse(true, { 
        message: "cancelled",
        id: order._id,
        status: "CANCELLED"
      }, "Order cancelled successfully");
    } catch (err) {
      logger.error("Cancel order failed", { error: err.message, id, address });
      return formatResponse(false, err.message, null, 500);
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
  // 8️⃣ DELETE ORDER (OFF-CHAIN - Admin or owner only)
  // =====================================================
  async deleteOrder(id, userAddress = null, isAdmin = false) {
    try {
      const order = await Order.findById(id);
      if (!order) return formatResponse(false, null, "Order not found", 404);

      // Check permissions
      if (!isAdmin && order.user.toLowerCase() !== userAddress?.toLowerCase()) {
        return formatResponse(false, null, "Forbidden - not order owner or admin", 403);
      }

      // Prevent deletion of filled orders
      if (order.status === "FILLED") {
        return formatResponse(false, null, "Cannot delete filled orders", 409);
      }

      await Order.findByIdAndDelete(id);

      logDatabaseQuery("orders", "delete", { id, userAddress, isAdmin });
      return formatResponse(true, { 
        message: "deleted",
        id: order._id 
      }, "Order deleted successfully");
    } catch (err) {
      logger.error("Delete order failed", { error: err.message, id });
      return formatResponse(false, err.message, null, 500);
    }
  },

  // =====================================================
  // 9️⃣ FILL ORDER (OFF-CHAIN - Bot/Listener triggered)
  // =====================================================
  async fillOrder(orderId, txHashFill, botSecret = null) {
    try {
      // Optional: Validate bot secret
      if (process.env.BOT_SECRET && botSecret !== process.env.BOT_SECRET) {
        return formatResponse(false, null, "Invalid bot secret", 403);
      }

      const order = await Order.findById(orderId);
      if (!order) return formatResponse(false, null, "Order not found", 404);

      if (order.status !== "OPEN") {
        return formatResponse(false, null, `Cannot fill order. Current status: ${order.status}`, 409);
      }

      // Update order status
      order.status = "FILLED";
      order.filledAt = new Date();
      order.txHashFill = txHashFill;
      await order.save();

      logDatabaseQuery("orders", "fill", { orderId, txHashFill });
      
      return formatResponse(true, {
        status: "FILLED",
        orderId: order._id,
        txHashFill
      }, "Order marked as filled");
    } catch (err) {
      logger.error("Fill order failed", { error: err.message, orderId });
      return formatResponse(false, err.message, null, 500);
    }
  },
};

module.exports = { orderService };
