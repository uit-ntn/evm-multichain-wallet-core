// controllers/transactionController.js
const txService = require("../services/transaction.service");

// GET /api/transactions?user=&chainId=&type=&status=&limit=&skip=
exports.getAllTransactions = async (req, res) => {
  try {
    const { user, chainId, type, status, limit = 20, skip = 0 } = req.query;

    const result = await txService.list({
      user,
      chainId: chainId != null ? parseInt(chainId) : undefined,
      type,
      status,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/transactions/:txHash
exports.getTransactionByHash = async (req, res) => {
  try {
    const tx = await txService.getByHash(req.params.txHash);
    if (!tx) return res.status(404).json({ success: false, error: "Transaction not found" });
    res.json({ success: true, data: tx });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// POST /api/transactions
exports.createTransaction = async (req, res) => {
  try {
    const { txHash, user, chainId, type, status } = req.body;
    if (!txHash || !user || chainId == null || !type) {
      return res.status(400).json({ success: false, error: "Missing fields: txHash, user, chainId, type" });
    }

    const tx = await txService.create({ txHash, user, chainId, type, status });
    res.status(201).json({ success: true, data: tx });
  } catch (e) {
    // duplicate
    if (e.code === 11000) return res.status(400).json({ success: false, error: "Transaction already exists" });
    res.status(500).json({ success: false, error: e.message });
  }
};

// PATCH /api/transactions/:txHash  { status }
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: "status is required" });

    const tx = await txService.updateStatus(req.params.txHash, status);
    if (!tx) return res.status(404).json({ success: false, error: "Transaction not found" });

    res.json({ success: true, data: tx });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

// DELETE /api/transactions/:txHash
exports.deleteTransaction = async (req, res) => {
  try {
    const tx = await txService.remove(req.params.txHash);
    if (!tx) return res.status(404).json({ success: false, error: "Transaction not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
