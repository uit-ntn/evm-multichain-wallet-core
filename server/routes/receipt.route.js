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

/**
 * @openapi
 * /api/receipts:
 *   post:
 *     tags:
 *       - Receipts
 *     summary: Upload receipt files (multipart/form-data)
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Files uploaded and receipts created
 */
router.post('/', authJwt, upload.array('files', 5), receiptController.uploadReceipts);

/**
 * @openapi
 * /api/receipts/generate:
 *   post:
 *     tags:
 *       - Receipts
 *     summary: Generate receipt (PDF + JSON) and upload to IPFS
 *     responses:
 *       201:
 *         description: Generated receipt
 */
router.post('/generate', authJwt, receiptController.generateReceipt);

/**
 * @openapi
 * /api/receipts/verify/{txHash}:
 *   get:
 *     tags:
 *       - Receipts
 *     summary: Verify receipt checksum by txHash
 *     parameters:
 *       - in: path
 *         name: txHash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
router.get('/verify/:txHash', optionalJwt, receiptController.verifyReceipt);

/**
 * @openapi
 * /api/receipts/user/{address}:
 *   get:
 *     tags:
 *       - Receipts
 *     summary: Get receipts by user address
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns paginated receipts
 */
router.get('/user/:address', authJwt, receiptController.getByUser);

/**
 * @openapi
 * /api/receipts/refresh:
 *   post:
 *     tags:
 *       - Receipts
 *     summary: Refresh/re-pin receipts (admin/service)
 *     responses:
 *       200:
 *         description: Refresh started
 */
router.post('/refresh', authJwt, requireAdminOrService, receiptController.refreshReceipt);

/**
 * @openapi
 * /api/receipts/{txHash}/download:
 *   get:
 *     tags:
 *       - Receipts
 *     summary: Download receipt file (PDF)
 *     parameters:
 *       - in: path
 *         name: txHash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns file URL or redirect
 */
router.get('/:txHash/download', authJwt, receiptController.downloadReceipt);

/**
 * @openapi
 * /api/receipts/{txHash}:
 *   delete:
 *     tags:
 *       - Receipts
 *     summary: Delete/unpin a receipt (admin)
 *     parameters:
 *       - in: path
 *         name: txHash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Receipt deleted
 */
router.delete('/:txHash', authJwt, requireAdmin, deleteLimiter, receiptController.deleteReceipt);

// Lấy receipt theo txHash (JWT) – đặt CUỐI để không “ăn” route /user/:address và /:txHash/download
router.get('/:txHash', authJwt, receiptController.getByTxHash);

module.exports = router;

