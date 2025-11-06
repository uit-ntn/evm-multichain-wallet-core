// server/routes/receipt.route.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// ✅ Đường dẫn & tên biến controller CHÍNH XÁC
const receiptController = require('../controllers/receiptController');

// ✅ Import middleware đúng đường dẫn (plural/singular tuỳ bạn đã tạo)
const { authJwt, optionalJwt } = require('../middlewares/authMiddleware');
// Nếu bạn đặt thư mục là "middleware" (singular) thì sửa dòng trên thành:
// const { authJwt, optionalJwt } = require('../middleware/auth.middleware');

// Multer cho upload file
const upload = multer({
  dest: 'uploads/',                     // thư mục tạm
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB/file
});

// === Routes ===

// Upload file PDF/JSON lên IPFS (multipart/form-data, field: "files")
router.post('/', authJwt, upload.array('files', 5), receiptController.uploadReceipts);

// Sinh PDF + JSON → upload IPFS + lưu DB
router.post('/generate', authJwt, receiptController.generateReceipt);

// Xác minh checksum SHA256 nội dung IPFS (PUBLIC/JWT)
router.get('/verify/:txHash', optionalJwt, receiptController.verifyReceipt);

// Lấy receipt theo txHash (JWT)
router.get('/:txHash', authJwt, receiptController.getByTxHash);

module.exports = router;
