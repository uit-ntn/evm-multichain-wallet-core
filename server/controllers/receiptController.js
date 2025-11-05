/**
 * Receipt Controller
 * Xử lý HTTP request liên quan đến biên lai (PDF/JSON → IPFS)
 */

const { uploadToIPFS } = require("../services/receipt.service");
const { logger } = require("../adapters/logger.adapter");
const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config");

/**
 * POST /api/receipts
 * Upload biên lai (PDF/JSON) lên IPFS (multipart/form-data)
 */
const uploadReceipts = async (req, res) => {
  try {
    // 🧩 1. Xác thực JWT
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "Unauthorized: Missing token" });

    let token;
    try {
      token = jwt.verify(authHeader.split(" ")[1], jwtConfig.secret);
    } catch {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // 🧩 2. Kiểm tra dữ liệu đầu vào
    const files = req.files;
    const { txHash, owner } = req.body;

    if (!files || files.length === 0)
      return res.status(400).json({ error: "Missing file" });
    if (!txHash || !owner)
      return res.status(400).json({ error: "Missing txHash or owner" });

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
      const uploaded = await uploadToIPFS(f.path, f.originalname);
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

    if (error.message.includes("File too large"))
      return res.status(413).json({ error: "Payload Too Large" });

    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { uploadReceipts };
