/**
 * Receipt Controller
 * Xử lý các HTTP request liên quan đến biên lai (PDF/JSON → IPFS)
 */

const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config");
const { logger } = require("../adapters/logger.adapter");
const receiptService = require("../services/receipt.service");

/**
 * POST /api/receipts
 * Upload biên lai (PDF/JSON) lên IPFS (multipart/form-data)
 */
const uploadReceipts = async (req, res) => {
  try {
    // 🧩 1. Xác thực JWT
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    let payload;
    try {
      payload = jwt.verify(authHeader.split(" ")[1], jwtConfig.secret);
    } catch {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // 🧩 2. Kiểm tra dữ liệu đầu vào
    const files = req.files;
    const { txHash, owner } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Missing file" });
    }
    if (!txHash || !owner) {
      return res.status(400).json({ error: "Missing txHash or owner" });
    }

    // 🧩 3. Kiểm tra định dạng file
    const allowedTypes = ["application/pdf", "application/json"];
    for (const f of files) {
      if (!allowedTypes.includes(f.mimetype)) {
        return res
          .status(415)
          .json({ error: `Unsupported Media Type: ${f.originalname}` });
      }
    }

    // 🧩 4. Upload từng file lên IPFS
    const uploads = [];
    for (const f of files) {
      const uploaded = await receiptService.uploadToIPFS(f.path, f.originalname);
      uploads.push(uploaded);
    }

    // 🧩 5. Trả kết quả
    return res.status(201).json({
      txHash,
      owner,
      files: uploads.map((u) => ({
        cid: u.cid,
        url: u.url,
      })),
    });
  } catch (error) {
    logger.error("Error uploading receipts", { error: error.message });

    if (error.message.includes("File too large")) {
      return res.status(413).json({ error: "Payload Too Large" });
    }

    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * POST /api/receipts/generate
 * Sinh PDF + JSON → upload lên IPFS + lưu vào DB
 */
const generateReceipt = async (req, res) => {
  try {
    // 🧩 Xác thực JWT
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing JWT token" });
    }

    let payload;
    try {
      payload = jwt.verify(authHeader.split(" ")[1], jwtConfig.secret);
    } catch {
      return res.status(401).json({ error: "Invalid JWT token" });
    }

    // 🧩 Lấy dữ liệu request
    const { txHash, owner, meta } = req.body;
    if (!txHash || !owner || !meta) {
      return res
        .status(400)
        .json({ error: "Missing txHash, owner, or metadata" });
    }

    const result = await receiptService.generateAndUploadReceipt({
      txHash,
      owner,
      meta,
    });

    return res.status(201).json(result);
  } catch (error) {
    logger.error("Error generating receipt", { error: error.message });
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /api/receipts/verify/:txHash
 * Xác minh tính toàn vẹn của biên lai (checksum SHA256 ↔ IPFS)
 */
const verifyReceipt = async (req, res) => {
  try {
    const { txHash } = req.params;

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({ error: "Invalid txHash format" });
    }

    const result = await receiptService.verifyReceiptIntegrity(txHash);

    if (!result || result.error) {
      return res
        .status(404)
        .json({ error: result?.error || "Receipt not found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    logger.error("Error verifying receipt", { error: error.message });
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /api/receipts/:txHash
 * Lấy thông tin biên lai theo hash giao dịch
 */
const getByTxHash = async (req, res) => {
  try {
    const { txHash } = req.params;

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(422).json({ message: "Invalid txHash format" });
    }

    const receipt = await receiptService.findByTxHash(txHash);

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    return res.status(200).json(receipt);
  } catch (error) {
    logger.error("Error getByTxHash", { error: error.message });
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  uploadReceipts,
  generateReceipt,
  verifyReceipt,
  getByTxHash,
};
