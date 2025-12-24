// models/transaction.model.js
const mongoose = require("mongoose");

const isTxHash = (v) => /^0x[a-fA-F0-9]{64}$/.test(v);
const isEthAddr = (v) => /^0x[a-fA-F0-9]{40}$/.test(v);

const transactionSchema = new mongoose.Schema(
  {
    txHash: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: { validator: isTxHash, message: "Invalid txHash format" },
      index: true,
    },

    user: {
      type: String,
      required: true,
      lowercase: true,
      validate: { validator: isEthAddr, message: "Invalid user address" },
      index: true,
    },

    chainId: {
      type: Number,
      required: true,
      validate: {
        validator: (v) => [1, 11155111, 137, 80002, 56, 97].includes(v),
        message: "Invalid chainId",
      },
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["SWAP", "STAKE", "CLAIM", "LIMIT"],
      uppercase: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "FAILED"],
      default: "PENDING",
      uppercase: true,
      index: true,
    },
  },
  { timestamps: true, collection: "transactions" }
);

transactionSchema.index({ user: 1, chainId: 1, createdAt: -1 });

transactionSchema.statics.findByTxHash = function (txHash) {
  return this.findOne({ txHash: txHash.toLowerCase() });
};

transactionSchema.pre("save", function (next) {
  if (this.user) this.user = this.user.toLowerCase();
  if (this.txHash) this.txHash = this.txHash.toLowerCase();
  next();
});

module.exports = mongoose.model("Transaction", transactionSchema);