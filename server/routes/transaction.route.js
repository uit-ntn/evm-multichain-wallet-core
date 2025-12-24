// routes/transaction.route.js
const express = require("express");
const router = express.Router();

const {
  getAllTransactions,
  getTransactionByHash,
  createTransaction,
  updateTransactionStatus,
  deleteTransaction,
} = require("../controllers/transactionController");

router.get("/", getAllTransactions);            // query filters
router.get("/:txHash", getTransactionByHash);
router.post("/", createTransaction);
router.patch("/:txHash", updateTransactionStatus);
router.delete("/:txHash", deleteTransaction);

module.exports = router;
