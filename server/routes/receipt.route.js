// server/routes/receipt.route.js 
const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');

// ✅ Đường dẫn & tên biến controller KHỚP với file của bạn (không dấu chấm)
const receiptController = require('../controllers/receiptController');

// ✅ Import middleware đúng đường dẫn của bạn
const { authJwt, optionalJwt } = require('../middlewares/authMiddleware');

// Multer cho upload file
const upload = multer({
  dest: 'uploads/',                      // thư mục tạm (project root)
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB/file
});

// ===== Admin/Service guard cho endpoint quản trị =====
const requireAdminOrService = (req, res, next) => {
  const role = (req.user?.role || '').toString().toLowerCase();
  if (!['admin', 'service'].includes(role)) {
    return res.status(403).json({ message: 'Forbidden: admin/service only' });
  }
  return next();
};

// ===== Admin-only guard (cho DELETE) =====
const requireAdmin = (req, res, next) => {
  const role = (req.user?.role || '').toString().toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: admin only' });
  }
  return next();
};

// ===== Rate limit riêng cho DELETE (tránh lạm dụng) =====
const deleteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 10,             // tối đa 10 req/phút
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too Many Requests' }
});

// === Routes ===

// Upload file PDF/JSON lên IPFS (multipart/form-data, field: "files")
router.post('/', authJwt, upload.array('files', 5), receiptController.uploadReceipts);

// Sinh PDF + JSON → upload IPFS + lưu DB
router.post('/generate', authJwt, receiptController.generateReceipt);

// Xác minh checksum SHA256 nội dung IPFS (PUBLIC/JWT)
router.get('/verify/:txHash', optionalJwt, receiptController.verifyReceipt);

// ✅ Danh sách biên lai theo user (JWT) + phân trang
// GET /api/receipts/user/:address?page=1&pageSize=20
router.get('/user/:address', authJwt, receiptController.getByUser);

// ✅ Re-pin/refresh (ADMIN/SERVICE) — POST /api/receipts/refresh
router.post('/refresh', authJwt, requireAdminOrService, receiptController.refreshReceipt);

// ✅ URL tải file (pdf) – 200 {url} hoặc 302 redirect (JWT)
// GET /api/receipts/:txHash/download?type=pdf&redirect=1
router.get('/:txHash/download', authJwt, receiptController.downloadReceipt);

// ✅ DELETE (ADMIN) — gỡ biên lai (unpin + xoá/đánh dấu theo config)
router.delete('/:txHash', authJwt, requireAdmin, deleteLimiter, receiptController.deleteReceipt);

// Lấy receipt theo txHash (JWT) – đặt CUỐI để không “ăn” route /user/:address và /:txHash/download
router.get('/:txHash', authJwt, receiptController.getByTxHash);

module.exports = router;
