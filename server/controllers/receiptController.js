// controllers/receiptController.js
const receiptService = require("../services/receipt.service");

exports.createReceipt = async (req, res) => {
  try {
    const { txHash, owner, meta = {}, chainId } = req.body;
    if (!txHash || !owner || !chainId) {
      return res.status(400).json({ success: false, error: "Missing: txHash, owner, chainId" });
    }
    const out = await receiptService.generateAndUploadReceipt({
      txHash,
      owner,
      meta: { ...meta, chainId },
    });
    res.status(201).json({ success: true, data: out });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.getReceiptByTxHash = async (req, res) => {
  try {
    const data = await receiptService.findByTxHash(req.params.txHash);
    if (!data) return res.status(404).json({ success: false, error: "Receipt not found" });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.listByUser = async (req, res) => {
  try {
    const { owner, page = 1, pageSize = 20 } = req.query;
    const data = await receiptService.listByUser(owner, { page: +page, pageSize: +pageSize });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.verify = async (req, res) => {
  try {
    const data = await receiptService.verifyReceiptIntegrity(req.params.txHash);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.download = async (req, res) => {
  try {
    const data = await receiptService.getDownloadUrl(req.params.txHash, { type: "pdf" });
    res.json({ success: true, ...data });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.repin = async (req, res) => {
  try {
    const data = await receiptService.repinByTxHash(req.params.txHash, { actor: "admin", role: "admin" });
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 500).json({ success: false, error: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const data = await receiptService.removeReceiptByTxHash(req.params.txHash, { actor: "admin", role: "admin" });
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 500).json({ success: false, error: e.message });
  }
};
