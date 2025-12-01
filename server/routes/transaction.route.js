const express = require('express');
const router = express.Router();
const txController = require('../controllers/transactionController');

// [1] Tạo Log (Gọi hàm create)
router.post('/', txController.create);

// [2] Danh sách (Gọi hàm list)
router.get('/', txController.list);

// [7] Lịch sử theo ví
router.get('/user/:address', txController.list);

// [6] Gắn CID IPFS
router.post('/:txHash/receipt', txController.attachReceipt);

// [4] Cập nhật Status
router.patch('/:txHash/status', txController.updateStatus);

// [3] Chi tiết & [9] Alias
router.get('/:txHash', txController.detail);
router.get('/tx/:txHash', txController.detail);

// [5] Xóa
router.delete('/:txHash', txController.delete);

/**
 * @openapi
 * tags:
 *   - name: Transactions
 *     description: Transaction related endpoints
 */

module.exports = router;
