/**
 * Receipt Model
 * MongoDB collection: receipts
 */

const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  txHash: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid transaction hash format'
    }
  },
  
  cid: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // IPFS CID validation (v0 and v1)
        return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|[a-z2-7]{59})$/.test(v);
      },
      message: 'Invalid IPFS CID format'
    }
  },
  
  fileName: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Allow PDF, JSON, TXT files
        return /\.(pdf|json|txt)$/i.test(v);
      },
      message: 'File must be PDF, JSON, or TXT format'
    }
  },
  
  owner: {
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
  
  // Additional fields for better receipt management
  chainId: {
    type: Number,
    validate: {
      validator: function(v) {
        const validChainIds = [1, 11155111, 137, 80002, 56, 97];
        return validChainIds.includes(v);
      },
      message: 'Invalid chain ID'
    }
  },
  
  fileSize: {
    type: Number, // Size in bytes
    min: 0
  },
  
  mimeType: {
    type: String,
    enum: ['application/pdf', 'application/json', 'text/plain'],
    default: 'application/json'
  },
  
  status: {
    type: String,
    enum: ['UPLOADING', 'PINNED', 'FAILED'],
    default: 'UPLOADING'
  },
  
  metadata: {
    transactionType: String,
    blockNumber: Number,
    gasUsed: String,
    gasPrice: String,
    value: String,
    from: String,
    to: String
  }
}, {
  timestamps: true,
  collection: 'receipts'
});

// Indexes
receiptSchema.index({ txHash: 1 }, { unique: true });
receiptSchema.index({ owner: 1 });
receiptSchema.index({ cid: 1 });
receiptSchema.index({ status: 1 });
receiptSchema.index({ createdAt: -1 });

// Compound indexes
receiptSchema.index({ owner: 1, chainId: 1, createdAt: -1 });

// Virtual for IPFS gateway URL
receiptSchema.virtual('ipfsUrl').get(function() {
  const gateway = process.env.IPFS_PUBLIC_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
  return `${gateway}${this.cid}`;
});

// Static methods
receiptSchema.statics.findByOwner = function(ownerAddress, options = {}) {
  const { chainId, limit = 20, skip = 0 } = options;
  
  const query = { owner: ownerAddress.toLowerCase() };
  if (chainId) query.chainId = chainId;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

receiptSchema.statics.findByTxHash = function(txHash) {
  return this.findOne({ txHash: txHash.toLowerCase() });
};

receiptSchema.statics.findByCid = function(cid) {
  return this.findOne({ cid });
};

receiptSchema.statics.findPendingUploads = function() {
  return this.find({ status: 'UPLOADING' });
};

receiptSchema.statics.findFailedUploads = function() {
  return this.find({ status: 'FAILED' });
};

// Instance methods
receiptSchema.methods.markAsPinned = function() {
  this.status = 'PINNED';
  return this.save();
};

receiptSchema.methods.markAsFailed = function(error) {
  this.status = 'FAILED';
  this.metadata = { ...this.metadata, error: error.message };
  return this.save();
};

receiptSchema.methods.updateMetadata = function(newMetadata) {
  this.metadata = { ...this.metadata, ...newMetadata };
  return this.save();
};

// Pre-save middleware
receiptSchema.pre('save', function(next) {
  if (this.txHash) {
    this.txHash = this.txHash.toLowerCase();
  }
  if (this.owner) {
    this.owner = this.owner.toLowerCase();
  }
  if (this.metadata && this.metadata.from) {
    this.metadata.from = this.metadata.from.toLowerCase();
  }
  if (this.metadata && this.metadata.to) {
    this.metadata.to = this.metadata.to.toLowerCase();
  }
  next();
});

// Transform toJSON to include virtual fields
receiptSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Receipt = mongoose.model('Receipt', receiptSchema);

module.exports = Receipt;
