const txService = require('../services/transaction.service');

const transactionController = {
  // [1] Create
  create: async (req, res) => {
    try {
      const result = await txService.createLog(req.body);
      res.status(201).json({ message: "logged", status: "PENDING", data: result });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: "TxHash exists" });
      res.status(500).json({ message: err.message });
    }
  },

  // [2] List
  list: async (req, res) => {
    try {
      const { user, chainId, status, page, pageSize } = req.query;
      const filter = {};
      
      // Ưu tiên param user nếu gọi từ route /user/:address
      const targetUser = req.params.address || user;
      if (targetUser) filter.user = targetUser.toLowerCase();
      
      if (chainId) filter.chainId = chainId;
      if (status) filter.status = status.toUpperCase();

      const result = await txService.getList(filter, parseInt(page)||1, parseInt(pageSize)||20);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // [3] Detail
  detail: async (req, res) => {
    try {
      const result = await txService.getDetail(req.params.txHash);
      if (!result) return res.status(404).json({ message: "Not Found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // [4] Update Status
  updateStatus: async (req, res) => {
    try {
      const { status, blockNumber } = req.body;
      const result = await txService.updateStatus(req.params.txHash, status, { blockNumber });
      if (!result) return res.status(404).json({ message: "Not Found" });
      res.json({ message: "updated", txHash: result.txHash });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // [6] Attach Receipt
  attachReceipt: async (req, res) => {
    try {
      const { cid } = req.body;
      if (!cid) return res.status(400).json({ message: "Missing CID" });
      
      const result = await txService.attachReceipt(req.params.txHash, cid);
      if (!result) return res.status(404).json({ message: "Not Found" });
      res.json({ message: "attached", cid });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // [5] Delete
  delete: async (req, res) => {
    try {
      const result = await txService.deleteLog(req.params.txHash);
      if (!result) return res.status(404).json({ message: "Not Found" });
      res.json({ message: "deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = transactionController;