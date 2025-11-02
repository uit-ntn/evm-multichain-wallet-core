/**
 * Order Model
 * MongoDB collection: orders
 */

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
        const validChainIds = [1, 11155111, 137, 80002, 56, 97];
        return validChainIds.includes(v);
      },
      message: 'Invalid chain ID'
    }
  },
  
  tokenIn: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid token address format'
    }
  },
  
  tokenOut: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid token address format'
    }
  },
  
  amountIn: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d+$/.test(v) && v !== '0';
      },
      message: 'Amount must be a positive number string'
    }
  },
  
  targetPrice: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d+(\.\d+)?$/.test(v) && parseFloat(v) > 0;
      },
      message: 'Target price must be a positive number'
    }
  },
  
  status: {
    type: String,
    required: true,
    enum: ['OPEN', 'FILLED', 'CANCELLED', 'EXPIRED'],
    default: 'OPEN',
    uppercase: true
  },
  
  signature: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        // EIP-712 signature format (0x + 130 hex chars)
        return /^0x[a-fA-F0-9]{130}$/.test(v);
      },
      message: 'Invalid EIP-712 signature format'
    }
  },
  
  txHashFill: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid transaction hash format'
    }
  },
  
  // Additional fields for better order management
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  
  filledAt: {
    type: Date,
    default: null
  },
  
  cancelledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'orders'
});

// Indexes
orderSchema.index({ signature: 1 }, { unique: true });
orderSchema.index({ user: 1, chainId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ tokenIn: 1, tokenOut: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ expiresAt: 1 });

// Compound indexes for efficient queries
orderSchema.index({ user: 1, status: 1, createdAt: -1 });
orderSchema.index({ chainId: 1, status: 1, tokenIn: 1, tokenOut: 1 });

// Virtual for checking if order is expired
orderSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Static methods
orderSchema.statics.findByUser = function(userAddress, options = {}) {
  const { chainId, status, tokenIn, tokenOut, limit = 20, skip = 0 } = options;
  
  const query = { user: userAddress.toLowerCase() };
  if (chainId) query.chainId = chainId;
  if (status) query.status = status.toUpperCase();
  if (tokenIn) query.tokenIn = tokenIn.toLowerCase();
  if (tokenOut) query.tokenOut = tokenOut.toLowerCase();
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

orderSchema.statics.findOpenOrders = function(chainId, tokenPair) {
  const query = { 
    status: 'OPEN',
    expiresAt: { $gt: new Date() }
  };
  
  if (chainId) query.chainId = chainId;
  if (tokenPair) {
    query.tokenIn = tokenPair.tokenIn.toLowerCase();
    query.tokenOut = tokenPair.tokenOut.toLowerCase();
  }
  
  return this.find(query).sort({ targetPrice: 1, createdAt: 1 });
};

orderSchema.statics.findBySignature = function(signature) {
  return this.findOne({ signature: signature.toLowerCase() });
};

orderSchema.statics.findExpiredOrders = function() {
  return this.find({
    status: 'OPEN',
    expiresAt: { $lte: new Date() }
  });
};

// Instance methods
orderSchema.methods.fill = function(txHash) {
  this.status = 'FILLED';
  this.txHashFill = txHash.toLowerCase();
  this.filledAt = new Date();
  return this.save();
};

orderSchema.methods.cancel = function() {
  this.status = 'CANCELLED';
  this.cancelledAt = new Date();
  return this.save();
};

orderSchema.methods.expire = function() {
  this.status = 'EXPIRED';
  return this.save();
};

// Pre-save middleware
orderSchema.pre('save', function(next) {
  if (this.user) {
    this.user = this.user.toLowerCase();
  }
  if (this.tokenIn) {
    this.tokenIn = this.tokenIn.toLowerCase();
  }
  if (this.tokenOut) {
    this.tokenOut = this.tokenOut.toLowerCase();
  }
  if (this.signature) {
    this.signature = this.signature.toLowerCase();
  }
  if (this.txHashFill) {
    this.txHashFill = this.txHashFill.toLowerCase();
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
