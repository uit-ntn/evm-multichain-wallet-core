// services/order.service.js
const Order = require("../models/order.model");

const createOrder = async (payload) => {
  // payload: user, chainId, tokenIn, tokenOut, amountIn, targetPrice, deadline, nonce?, signature?
  return Order.create(payload);
};

const getById = async (id) => {
  return Order.findById(id);
};

const listOrders = async ({ user, chainId, status, limit = 20, skip = 0 } = {}) => {
  const q = {};
  if (user) q.user = user.toLowerCase();
  if (chainId) q.chainId = Number(chainId);
  if (status) q.status = status.toUpperCase();

  const [total, data] = await Promise.all([
    Order.countDocuments(q),
    Order.find(q).sort({ createdAt: -1 }).limit(limit).skip(skip),
  ]);

  return { total, data };
};

const updateOrder = async (id, patch = {}) => {
  // allow patch minimal fields
  const allowed = {};
  if (patch.targetPrice != null) allowed.targetPrice = String(patch.targetPrice);
  if (patch.deadline != null) allowed.deadline = Number(patch.deadline);
  if (patch.signature != null) allowed.signature = String(patch.signature);
  if (patch.nonce != null) allowed.nonce = String(patch.nonce);

  // status/txHash only when syncing on-chain or admin
  if (patch.status && ["OPEN","FILLED","CANCELLED","EXPIRED","FAILED"].includes(patch.status.toUpperCase())) {
    allowed.status = patch.status.toUpperCase();
  }
  if (patch.txHash != null) allowed.txHash = String(patch.txHash).toLowerCase();

  return Order.findByIdAndUpdate(id, { $set: allowed }, { new: true });
};

const cancelOrder = async (id, { txHash = "" } = {}) => {
  return Order.findByIdAndUpdate(
    id,
    { $set: { status: "CANCELLED", txHash: txHash.toLowerCase() } },
    { new: true }
  );
};

const deleteOrder = async (id) => {
  return Order.findByIdAndDelete(id);
};

module.exports = {
  createOrder,
  getById,
  listOrders,
  updateOrder,
  cancelOrder,
  deleteOrder,
};
