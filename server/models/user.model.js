/**
 * User Model
 * MongoDB collection: users
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: "Invalid Ethereum address format",
      },
    },

    // ENS name hoặc tên hiển thị tùy chọn
    displayName: {
      type: String,
      trim: true,
      default: "",
      maxlength: [50, "Display name too long"],
      validate: {
        validator: function (v) {
          // cho phép trống, ENS (.eth) hoặc chữ/number/._-
          return !v || /^[a-zA-Z0-9_.-]+(\.eth)?$/.test(v);
        },
        message: "Invalid display name format",
      },
    },

    nonce: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    stakedAmount: {
      type: String,
      default: "0",
    },

    tier: {
      type: String,
      default: "Bronze",
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

//
// ─── INDEXES ────────────────────────────────────────────────────────────────
//
userSchema.index({ address: 1 }, { unique: true });
userSchema.index({ role: 1 });
// unique-sparse cho phép trùng giá trị rỗng, nhưng không trùng khi có giá trị thật
userSchema.index({ displayName: 1 }, { unique: true, sparse: true });

//
// ─── METHODS ────────────────────────────────────────────────────────────────
//
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password; // (nếu có thêm trường password sau này)
  return user;
};

//
// ─── STATIC METHODS ─────────────────────────────────────────────────────────
//
userSchema.statics.findByAddress = function (address) {
  return this.findOne({ address: address.toLowerCase() });
};

userSchema.statics.findAdmins = function () {
  return this.find({ role: "admin" });
};

//
// ─── PRE-SAVE MIDDLEWARE ───────────────────────────────────────────────────
//
userSchema.pre("save", function (next) {
  if (this.address) this.address = this.address.toLowerCase();
  if (this.displayName) this.displayName = this.displayName.trim().toLowerCase();
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
