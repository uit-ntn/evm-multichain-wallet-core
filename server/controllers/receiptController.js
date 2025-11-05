/**
 * Receipt Controller
 * Xử lý các HTTP requests liên quan đến IPFS receipts
 */

const receiptService = require('../services/receipt.service');
const { logger } = require('../adapters/logger.adapter');
const jwt = require("jsonwebtoken");
const { uploadToIPFS } = require("../services/receipt.service");
const { jwt: jwtConfig } = require("../config");

/**
 * Receipt Controller
 * Upload biên lai (PDF/JSON) lên IPFS
 */
const uploadReceipt = async (req, res) => {
  try {
    // ✅ 1. Kiểm tra JWT
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, jwtConfig.secret);
    } catch {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // ✅ 2. Kiểm tra multipart form
    if (!req.file) {
      return res.status(400).json({ error: "Missing file" });
    }

    const { txHash, owner } = req.body;
    if (!txHash || !owner) {
      return res.status(400).json({ error: "Missing txHash or owner" });
    }

    // ✅ 3. Kiểm tra định dạng
    const allowedTypes = ["application/pdf", "application/json"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(415).json({ error: "Unsupported Media Type" });
    }

    // ✅ 4. Upload lên IPFS
    const { cid, url } = await uploadToIPFS(req.file.path, req.file.originalname);

    // ✅ 5. Trả kết quả
    return res.status(201).json({ cid, url, txHash });
  } catch (error) {
    console.error("Upload receipt error:", error);
    if (error.message.includes("limit file size")) {
      return res.status(413).json({ error: "Payload Too Large" });
    }
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { uploadReceipt };
