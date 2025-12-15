// models/receipt.model.js
const mongoose = require("mongoose");

const isTxHash = (v) => /^0x[a-fA-F0-9]{64}$/.test(v);
const isEthAddr = (v) => /^0x[a-fA-F0-9]{40}$/.test(v);

const receiptSchema = new mongoose.Schema(
  {
    txHash: { type: String, required: true, unique: true, lowercase: true, validate: { validator: isTxHash, message: "Invalid txHash" }, index: true },
    owner: { type: String, required: true, lowercase: true, validate: { validator: isEthAddr, message: "Invalid owner" }, index: true },

    chainId: { type: Number, required: true, index: true },

    // store both cids
    pdfCid: { type: String, required: true },
    jsonCid: { type: String, default: "" },

    fileName: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: "application/pdf" },

    status: { type: String, enum: ["PINNED", "FAILED"], default: "PINNED" },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true, collection: "receipts" }
);

receiptSchema.virtual("ipfsUrlPdf").get(function () {
  const gw = process.env.IPFS_PUBLIC_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
  return `${gw}${this.pdfCid}`;
});

receiptSchema.virtual("ipfsUrlJson").get(function () {
  const gw = process.env.IPFS_PUBLIC_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
  return this.jsonCid ? `${gw}${this.jsonCid}` : null;
});

receiptSchema.statics.findByTxHash = function (txHash) {
  return this.findOne({ txHash: txHash.toLowerCase() });
};

receiptSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Receipt", receiptSchema);
