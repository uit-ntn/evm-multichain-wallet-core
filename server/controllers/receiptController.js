/** 
 * Receipt Controller
 * Xử lý các HTTP request liên quan đến biên lai (PDF/JSON → IPFS)
 */

const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config");
const { logger } = require("../adapters/logger.adapter");
const receiptService = require("../services/receipt.service");

// ===== Helpers validate =====
const isTxHash = (h) => /^0x[a-fA-F0-9]{64}$/.test(h || "");
const isEthAddr = (a) => /^0x[a-fA-F0-9]{40}$/.test(a || "");

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
    if (!isTxHash(txHash)) {
      return res.status(422).json({ error: "Invalid txHash format" });
    }
    if (!isEthAddr(owner)) {
      return res.status(422).json({ error: "Invalid owner address format" });
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

    if (error.message?.includes("File too large")) {
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
    if (!isTxHash(txHash)) {
      return res.status(422).json({ error: "Invalid txHash format" });
    }
    if (!isEthAddr(owner)) {
      return res.status(422).json({ error: "Invalid owner address format" });
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

    if (!isTxHash(txHash)) {
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

    if (!isTxHash(txHash)) {
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

/**
 * GET /api/receipts/user/:address?page=1&pageSize=20
 * Danh sách biên lai theo user (JWT) – Pagination & sort createdAt desc
 */
const getByUser = async (req, res) => {
  try {
    const { address } = req.params;
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);

    if (!isEthAddr(address)) {
      return res.status(400).json({ message: "Invalid address format" });
    }
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return res
        .status(400)
        .json({ message: "Invalid pagination params (page>=1, 1<=pageSize<=100)" });
    }

    const result = await receiptService.listByUser(address, { page, pageSize });

    return res.status(200).json({
      items: result.items,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    logger.error("Error getByUser receipts", { error: error.message });
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * GET /api/receipts/:txHash/download?type=pdf&redirect=1
 * Trả URL tải file (200 JSON) hoặc 302 redirect tới gateway IPFS
 */
const downloadReceipt = async (req, res) => {
  try {
    const { txHash } = req.params;
    const type = String(req.query.type || "pdf").toLowerCase();
    const doRedirect = String(req.query.redirect || "0") === "1";

    if (!isTxHash(txHash)) {
      return res.status(400).json({ message: "Invalid txHash format" });
    }
    if (!["pdf"].includes(type)) {
      // Hiện tại model chỉ lưu CID của PDF; mở rộng sau nếu lưu CID JSON
      return res.status(400).json({ message: "Invalid type (supported: pdf)" });
    }

    const { url, fileName } = await receiptService.getDownloadUrl(txHash, { type });
    if (!url) {
      return res.status(404).json({ message: "Receipt file not found" });
    }

    if (doRedirect) {
      return res.redirect(302, url);
    }

    return res.status(200).json({ url, fileName });
  } catch (error) {
    logger.error("Error downloadReceipt", { error: error.message });
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * POST /api/receipts/refresh
 * Re-pin/refresh trên pinning service (ADMIN/SERVICE)
 * Body: { txHash }
 */
const refreshReceipt = async (req, res) => {
  try {
    const { txHash } = req.body || {};
    if (!txHash || !isTxHash(txHash)) {
      return res.status(400).json({ message: "Invalid or missing txHash" });
    }

    // Quyền đã được kiểm tra ở route bằng middleware requireAdminOrService
    const actor = req.user?.sub || req.user?.id || "unknown";
    const role = req.user?.role || "unknown";

    const { cid, pinned, pinProvider } = await receiptService.repinByTxHash(txHash, {
      actor,
      role,
    });

    logger.info("Repin done", { txHash, cid, pinned, pinProvider, actor, role });

    return res.status(200).json({
      message: "repinned",
      cid,
      pinned,
      pinProvider,
    });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({ message: "Receipt not found" });
    }
    if (error.code === 429 || error.status === 429) {
      return res.status(429).json({ message: "Rate limited by pinning service" });
    }
    logger.error("Error refreshReceipt", { error: error.message });
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  uploadReceipts,
  generateReceipt,
  verifyReceipt,
  getByTxHash,
  getByUser,
  downloadReceipt,
  refreshReceipt, // ✅ bổ sung cho yêu cầu 6
};
