/**
 * User Model
 * MongoDB collection: users
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Validate Ethereum address format (0x + 40 hex chars)
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
  },

  displayName: {
    type: String,
    trim: true,
    default: ''
  },

  nonce: {
    type: String,
    default: ''
  },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  stakedAmount: {
    type: String,
    default: '0'
  },

  tier: {
    type: String,
    default: 'Bronze'
  }
}, {
  timestamps: true, // Tự động tạo createdAt và updatedAt
  collection: 'users'
});

// Indexes
userSchema.index({ address: 1 }, { unique: true });
userSchema.index({ role: 1 });

// Methods
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password; // Không trả về password trong response
  return user;
};

// Static methods
userSchema.statics.findByAddress = function(address) {
  return this.findOne({ address: address.toLowerCase() });
};

userSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin' });
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  if (this.address) {
    this.address = this.address.toLowerCase();
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
