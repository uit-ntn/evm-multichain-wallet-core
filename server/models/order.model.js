// models/order.model.js
const mongoose = require("mongoose");

const isEthAddr = (a) => /^0x[a-fA-F0-9]{40}$/.test(a);

const orderSchema = new mongoose.Schema(
  {
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
        message: "Invalid chain ID",
      },
      index: true,
    },

    // limit order params (off-chain payload)
    tokenIn: {
      type: String,
      required: true,
      lowercase: true,
      validate: { validator: isEthAddr, message: "Invalid tokenIn address" },
    },
    tokenOut: {
      type: String,
      required: true,
      lowercase: true,
      validate: { validator: isEthAddr, message: "Invalid tokenOut address" },
    },

    amountIn: { type: String, required: true },     // wei string
    targetPrice: { type: String, required: true },  // normalized string
    deadline: { type: Number, required: true },     // unix seconds

    // optional for EIP-712 / anti replay
    nonce: { type: String, default: "" },
    signature: { type: String, default: "" },

    status: {
      type: String,
      enum: ["OPEN", "FILLED", "CANCELLED", "EXPIRED", "FAILED"],
      default: "OPEN",
      uppercase: true,
      index: true,
    },

    // optional on-chain proof when filled/cancelled
    txHash: { type: String, lowercase: true, default: "" },
  },
  { timestamps: true, collection: "orders" }
);

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ chainId: 1, status: 1, createdAt: -1 });

orderSchema.pre("save", function (next) {
  if (this.user) this.user = this.user.toLowerCase();
  if (this.tokenIn) this.tokenIn = this.tokenIn.toLowerCase();
  if (this.tokenOut) this.tokenOut = this.tokenOut.toLowerCase();
  if (this.txHash) this.txHash = this.txHash.toLowerCase();
  next();
});

module.exports = mongoose.model("Order", orderSchema);
