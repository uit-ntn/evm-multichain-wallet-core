// routes/receipt.route.js
const express = require("express");
const router = express.Router();
const c = require("../controllers/receiptController");

router.get("/", c.listByUser);                 // ?owner=0x...&page=&pageSize=
router.post("/", c.createReceipt);             // { txHash, owner, chainId, meta }

router.get("/tx/:txHash", c.getReceiptByTxHash);
router.get("/verify/:txHash", c.verify);
router.get("/download/:txHash", c.download);

router.post("/repin/:txHash", c.repin);
router.delete("/:txHash", c.remove);

module.exports = router;
