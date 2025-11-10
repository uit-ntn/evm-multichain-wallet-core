/**
 * Order Model (CommonJS)
 * MongoDB collection: orders
 */
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
      lowercase: true,
      validate: {
        validator(v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: "Invalid Ethereum address format",
      },
    },
    chainId: {
      type: Number,
      required: true,
      validate: {
        validator(v) {
          const valid = [1, 11155111, 137, 80002, 56, 97];
          return valid.includes(v);
        },
        message: "Invalid chain ID",
      },
    },
    tokenIn: {
      type: String,
      required: true,
      lowercase: true,
      validate: { validator: (v) => /^0x[a-fA-F0-9]{40}$/.test(v) },
    },
    tokenOut: {
      type: String,
      required: true,
      lowercase: true,
      validate: { validator: (v) => /^0x[a-fA-F0-9]{40}$/.test(v) },
    },
    amountIn: {
      type: String,
      required: true,
      validate: { validator: (v) => /^\d+$/.test(v) && v !== "0" },
    },
    targetPrice: {
      type: String,
      required: true,
      validate: { validator: (v) => /^\d+(\.\d+)?$/.test(v) && parseFloat(v) > 0 },
    },
    status: {
      type: String,
      required: true,
      enum: ["OPEN", "FILLED", "CANCELLED", "EXPIRED"],
      default: "OPEN",
    },
    signature: {
      type: String,
      required: true,
      unique: true,
      validate: { validator: (v) => /^0x[a-fA-F0-9]{130}$/.test(v) },
    },
    txHashFill: {
      type: String,
      default: null,
      validate: { validator: (v) => !v || /^0x[a-fA-F0-9]{64}$/.test(v) },
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    filledAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "orders" }
);

orderSchema.index({ signature: 1 }, { unique: true });
orderSchema.index({ user: 1, chainId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ expiresAt: 1 });

orderSchema.virtual("isExpired").get(function () {
  return this.expiresAt && new Date() > this.expiresAt;
});

orderSchema.methods.cancel = function () {
  this.status = "CANCELLED";
  this.cancelledAt = new Date();
  return this.save();
};

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
