/**
 * User Model (CommonJS)
 */
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    password: { type: String, required: true, minlength: 6 },
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: { validator: (v) => /^0x[a-fA-F0-9]{40}$/.test(v) },
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true, collection: "users" }
);

userSchema.index({ address: 1 }, { unique: true });

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
