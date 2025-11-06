/**
 * Auth Service
 * Xử lý logic liên quan đến xác thực người dùng (Web3 signature, JWT)
 */
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user.model");
const { jwt: jwtConfig } = require("../config");
require("dotenv").config();

/* ===== JWT config với fallback an toàn ===== */
const JWT_SECRET =
  (jwtConfig && jwtConfig.secret) ||
  process.env.JWT_SECRET ||
  "dev-secret";

const JWT_EXPIRES_IN =
  (jwtConfig && jwtConfig.expiresIn) ||
  process.env.JWT_EXPIRES_IN ||
  "7d";

/* ===== Helpers ===== */
// Sinh nonce ngẫu nhiên (v6 / v5 / fallback crypto)
const generateNonce = () => {
  try {
    if (typeof ethers.randomBytes === "function" && typeof ethers.hexlify === "function") {
      return ethers.hexlify(ethers.randomBytes(16)); // v6
    }
    if (ethers.utils?.randomBytes && ethers.utils?.hexlify) {
      return ethers.utils.hexlify(ethers.utils.randomBytes(16)); // v5
    }
  } catch (_) {}
  return `0x${crypto.randomBytes(16).toString("hex")}`; // fallback
};

/* ===== Core Services ===== */

/**
 * Tạo hoặc cập nhật nonce cho user
 * @param {string} address
 */
const createOrUpdateNonce = async (address) => {
  const addr = address.toLowerCase();
  let user = await User.findOne({ address: addr });

  const next = generateNonce();
  const now = new Date();

  if (!user) {
    user = await User.create({
      address: addr,
      displayName: address,
      nonce: next,
      nonceIssuedAt: now,
      role: "user",
      stakedAmount: "0",
      tier: "Bronze",
    });
  } else {
    user.nonce = next;
    user.nonceIssuedAt = now;
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

  // Kiểm tra nonce (cơ bản)
  if (user.nonce !== nonce) {
    const e = new Error("Invalid nonce");
    e.code = 401;
    throw e;
  }

  // Thông điệp EIP-191
  const message = `Welcome to EVM Multichain Wallet!\n\nNonce: ${nonce}`;

  let recovered;
  try {
    if (typeof ethers.verifyMessage === "function") {
      recovered = ethers.verifyMessage(message, signature); // v6
    } else if (ethers.utils?.verifyMessage) {
      recovered = ethers.utils.verifyMessage(message, signature); // v5
    } else {
      const e = new Error("No verifyMessage available in ethers library");
      e.code = 422;
      throw e;
    }
  } catch (_) {
    const e = new Error("Invalid signature format");
    e.code = 422;
    throw e;
  }

  if (!recovered || recovered.toLowerCase() !== addr) {
    const e = new Error("Invalid signature");
    e.code = 401;
    throw e;
  }

  // Rotate nonce & ghi thời điểm dùng (chống replay cơ bản)
  user.lastNonce = user.nonce;
  user.nonceUsedAt = new Date();
  user.nonce = generateNonce();
  user.nonceIssuedAt = new Date();
  await user.save();

  // Tạo JWT
  const token = jwt.sign(
    {
      address: user.address,
      role: user.role,
      displayName: user.displayName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      address: user.address,
      displayName: user.displayName,
      role: user.role,
      tier: user.tier,
      stakedAmount: user.stakedAmount,
    },
  };
};

/**
 * Lấy thông tin user hiện tại từ JWT (cho GET /api/auth/me)
 * @param {string} token
 */
const getCurrentUser = async (token) => {
  const payload = jwt.verify(token, JWT_SECRET); // throw nếu invalid/expired
  const address = String(payload.address || "").toLowerCase();
  if (!address) return null;

  const user = await User.findOne({ address });
  if (!user) return null;

  return {
    address: user.address,
    displayName: user.displayName,
    role: user.role,
    tier: user.tier,
    stakedAmount: user.stakedAmount,
  };
};

module.exports = {
  createOrUpdateNonce,
  verifySignature,
  getCurrentUser,
};
