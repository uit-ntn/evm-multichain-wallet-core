/**
 * Receipt Routes
 * Định nghĩa các routes cho IPFS receipts
 */

const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const multer = require("multer");
const path = require("path");
const { uploadReceipt } = require("../controllers/receipt.controller");
const { defaultRateLimit } = require("../middlewares/rateLimiter");

// Cấu hình lưu file tạm
const upload = multer({
  dest: path.join(__dirname, "../../uploads/tmp"),
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
});

// POST /api/receipts
router.post("/", defaultRateLimit, upload.single("file"), uploadReceipt);

module.exports = router;

