/**
 * Auth Service
 * Xử lý logic liên quan đến xác thực người dùng (Web3 signature, JWT)
 */

const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { jwt: jwtConfig } = require("../config");

// Sinh nonce ngẫu nhiên
// Ethers v5 syntax
const generateNonce = () => ethers.utils.hexlify(ethers.utils.randomBytes(16));


/**
 * Tạo hoặc cập nhật nonce cho user
 * @param {string} address - địa chỉ ví
 */
const createOrUpdateNonce = async (address) => {
  const addr = address.toLowerCase();

  let user = await User.findOne({ address: addr });

  if (!user) {
    user = await User.create({
      address: addr,
      displayName: address,
      nonce: generateNonce(),
      role: "user",
      stakedAmount: "0",
      tier: "Bronze",
    });
  } else {
    // ⚡ Luôn cập nhật nonce mới mỗi lần request
    user.nonce = generateNonce();
    await user.save();
  }

  return { address: user.address, nonce: user.nonce };
};

/**
 * Xác minh chữ ký và sinh JWT
 * @param {string} address
 * @param {string} signature
 * @param {string} nonce
 */
const verifySignature = async (address, signature, nonce) => {
  const addr = address.toLowerCase();

  const user = await User.findOne({ address: addr });
  if (!user) throw new Error("User not found");

  if (user.nonce !== nonce) throw new Error("Invalid nonce");

  const message = `Welcome to EVM Multichain Wallet!\n\nNonce: ${nonce}`;
  let recovered;

  try {
    if (typeof ethers.verifyMessage === "function") {
      recovered = ethers.verifyMessage(message, signature);
    } else if (ethers.utils && typeof ethers.utils.verifyMessage === "function") {
      recovered = ethers.utils.verifyMessage(message, signature);
    } else {
      throw new Error("No verifyMessage available in ethers library");
    }
  } catch (err) {
    throw new Error("Invalid signature format");
  }

  if (!recovered || recovered.toLowerCase() !== addr) {
    throw new Error("Invalid signature");
  }

  // ✅ Rotate nonce sau khi verify thành công
  user.nonce = generateNonce();
  await user.save();

  // ✅ Tạo JWT
  const token = jwt.sign(
    {
      address: user.address,
      role: user.role,
      displayName: user.displayName,
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn || "7d" }
  );

  return {
    token,
    user: {
      address: user.address,
      displayName: user.displayName,
      role: user.role,
    },
  };
};

module.exports = {
  createOrUpdateNonce,
  verifySignature,
};
