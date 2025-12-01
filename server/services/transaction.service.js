const Transaction = require('../models/transaction.model');

module.exports = {
  async createLog(data) {
    return await Transaction.create(data);
  },

  async getList(filter, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter)
    ]);
    return { items: transactions, total, page, limit };
  },

  async getDetail(txHash) {
    return await Transaction.findOne({ txHash: txHash.toLowerCase() });
  },

  async updateStatus(txHash, status, extraData = {}) {
    return await Transaction.findOneAndUpdate(
      { txHash: txHash.toLowerCase() },
      { status: status.toUpperCase(), ...extraData },
      { new: true }
    );
  },

  async attachReceipt(txHash, cid) {
    return await Transaction.findOneAndUpdate(
      { txHash: txHash.toLowerCase() },
      { cid },
      { new: true }
    );
  },

  async deleteLog(txHash) {
    return await Transaction.findOneAndDelete({ txHash: txHash.toLowerCase() });
  }
};