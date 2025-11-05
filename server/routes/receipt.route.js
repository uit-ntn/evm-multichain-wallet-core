/**
 * Receipt Routes
 * Định nghĩa các routes cho IPFS receipts
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const { uploadReceipts, generateReceipt, verifyReceipt } = require("../controllers/receiptController");
const { defaultRateLimit } = require("../middlewares/rateLimiter");

const router = express.Router();

// Cấu hình lưu file tạm
const upload = multer({
  dest: path.join(__dirname, "../../uploads/tmp"),
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
});

// POST /api/receipts (PDF + JSON)
router.post("/", defaultRateLimit, upload.array("files", 2), uploadReceipts);

// POST /api/receipts/generate
router.post("/generate", defaultRateLimit, generateReceipt);

// GET /api/receipts/verify/:txHash
router.get("/verify/:txHash", defaultRateLimit, verifyReceipt);

module.exports = router;
