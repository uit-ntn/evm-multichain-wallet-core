// models/user.model.js
const mongoose = require("mongoose");

const isEthAddr = (a) => /^0x[a-fA-F0-9]{40}$/.test(a);

const userSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: isEthAddr,
        message: "Invalid wallet address",
      },
    },
    name: { type: String, trim: true, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true, collection: "users" }
);

userSchema.index({ address: 1 }, { unique: true });

userSchema.statics.findByAddress = function (address) {
  return this.findOne({ address: address.toLowerCase() });
};

userSchema.pre("save", function (next) {
  if (this.address) this.address = this.address.toLowerCase();
  next();
});

module.exports = mongoose.model("User", userSchema);
