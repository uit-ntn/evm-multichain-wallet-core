const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  chainId: {
    type: Number,
    required: true,
    index: true
  },
  txHash: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    // Cập nhật Enum theo Database Dictionary
    enum: ['SWAP', 'LIMIT_ORDER', 'APPROVE', 'STAKE', 'UNSTAKE', 'TRANSFER', 'CLAIM'],
    required: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'FAILED'],
    default: 'PENDING',
    uppercase: true,
    index: true
  },
  tokenIn: { type: String, lowercase: true, trim: true },
  tokenOut: { type: String, lowercase: true, trim: true },
  
  // Lưu string để bảo toàn độ chính xác BigInt
  amountIn: { type: String, default: '0' },
  amountOut: { type: String, default: '0' },
  
  // Task #6: IPFS Receipt CID
  cid: { 
    type: String, 
    default: null,
    trim: true
  },
  
  blockNumber: { type: Number },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'transactions'
});

// Indexes tối ưu cho Tra cứu lịch sử & Admin
transactionSchema.index({ user: 1, chainId: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);