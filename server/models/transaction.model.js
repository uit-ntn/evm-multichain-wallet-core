/**
 * Transaction Model
 * MongoDB collection: transactions
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
  },
  
  chainId: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        // Validate common chain IDs
        const validChainIds = [1, 11155111, 137, 80002, 56, 97]; // Mainnet, Sepolia, Polygon, Amoy, BSC, BSC Testnet
        return validChainIds.includes(v);
      },
      message: 'Invalid chain ID'
    }
  },
  
  txHash: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid transaction hash format'
    }
  },
  
  type: {
    type: String,
    required: true,
    enum: ['SWAP', 'LIMIT', 'APPROVE', 'STAKE', 'UNSTAKE', 'TRANSFER'],
    uppercase: true
  },
  
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'CONFIRMED', 'FAILED'],
    default: 'PENDING',
    uppercase: true
  },
  
  tokenIn: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid token address format'
    }
  },
  
  tokenOut: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid token address format'
    }
  },
  
  amountIn: {
    type: String, // Store as string to handle big numbers
    validate: {
      validator: function(v) {
        return !v || /^\d+$/.test(v); // Only digits
      },
      message: 'Amount must be a valid number string'
    }
  },
  
  amountOut: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d+$/.test(v);
      },
      message: 'Amount must be a valid number string'
    }
  },
  
  cid: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        // Basic IPFS CID validation (v0 and v1)
        return !v || /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|[a-z2-7]{59})$/.test(v);
      },
      message: 'Invalid IPFS CID format'
    }
  }
}, {
  timestamps: true,
  collection: 'transactions'
});

// Indexes
transactionSchema.index({ txHash: 1 }, { unique: true });
transactionSchema.index({ user: 1, chainId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

// Compound index for efficient queries
transactionSchema.index({ user: 1, status: 1, createdAt: -1 });

// Static methods
transactionSchema.statics.findByUser = function(userAddress, options = {}) {
  const { chainId, status, type, limit = 20, skip = 0 } = options;
  
  const query = { user: userAddress.toLowerCase() };
  if (chainId) query.chainId = chainId;
  if (status) query.status = status.toUpperCase();
  if (type) query.type = type.toUpperCase();
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

transactionSchema.statics.findByTxHash = function(txHash) {
  return this.findOne({ txHash: txHash.toLowerCase() });
};

transactionSchema.statics.findPending = function(chainId) {
  const query = { status: 'PENDING' };
  if (chainId) query.chainId = chainId;
  
  return this.find(query).sort({ createdAt: 1 });
};

// Pre-save middleware
transactionSchema.pre('save', function(next) {
  if (this.user) {
    this.user = this.user.toLowerCase();
  }
  if (this.txHash) {
    this.txHash = this.txHash.toLowerCase();
  }
  if (this.tokenIn) {
    this.tokenIn = this.tokenIn.toLowerCase();
  }
  if (this.tokenOut) {
    this.tokenOut = this.tokenOut.toLowerCase();
  }
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
