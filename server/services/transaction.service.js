// services/transaction.service.js
const Transaction = require("../models/transaction.model");

/**
 * FE gọi sau khi gửi tx on-chain (lưu PENDING)
 */
const create = async ({ txHash, user, chainId, type, status = "PENDING" }) => {
  const existed = await Transaction.findByTxHash(txHash);
  if (existed) return existed;

  return Transaction.create({
    txHash,
    user,
    chainId,
    type,
    status,
  });
};

const getByHash = async (txHash) => {
  return Transaction.findByTxHash(txHash);
};

const list = async ({ user, chainId, type, status, limit = 20, skip = 0 } = {}) => {
  const q = {};
  if (user) q.user = user.toLowerCase();
  if (chainId != null) q.chainId = Number(chainId);
  if (type) q.type = type.toUpperCase();
  if (status) q.status = status.toUpperCase();

  const [total, data] = await Promise.all([
    Transaction.countDocuments(q),
    Transaction.find(q).sort({ createdAt: -1 }).limit(limit).skip(skip),
  ]);

  return { total, data };
};

/**
 * Listener/admin gọi cập nhật status
 */
const updateStatus = async (txHash, status) => {
  const allowed = ["PENDING", "CONFIRMED", "FAILED"];
  const s = String(status || "").toUpperCase();
  if (!allowed.includes(s)) throw new Error("Invalid status");

  return Transaction.findOneAndUpdate(
    { txHash: txHash.toLowerCase() },
    { $set: { status: s } },
    { new: true }
  );
};

const remove = async (txHash) => {
  return Transaction.findOneAndDelete({ txHash: txHash.toLowerCase() });
};

module.exports = { create, getByHash, list, updateStatus, remove };
