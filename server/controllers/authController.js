/**
 * Auth Controller
 * Xử lý các HTTP requests liên quan đến authentication
 */

/*
 * Tạo nonce cho địa chỉ ví để chuẩn bị đăng nhập (ký message)
 */

const { ethers } = require("ethers");
const jwt = require('jsonwebtoken');
const User = require("../models/user.model");
const { jwt: jwtConfig } = require('../config');

// Hàm sinh nonce ngẫu nhiên
const generateNonce = () => ethers.hexlify(ethers.randomBytes(16));

module.exports = {
  nonce: async (req, res, next) => {
    try {
      const { address } = req.body;

      // Kiểm tra đầu vào
      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }

      const addrRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!addrRegex.test(address)) {
        return res.status(422).json({ message: "Invalid address format" });
      }

      // Tìm hoặc tạo mới user
      let user = await User.findOne({ address: address.toLowerCase() });

      if (!user) {
        user = await User.create({
          address: address.toLowerCase(),
          displayName: address,
          nonce: generateNonce(),
          role: "user",
          stakedAmount: "0",
          tier: "Bronze",
        });
      }

      // Nếu chưa có nonce thì tạo mới
      if (!user.nonce) {
        user.nonce = generateNonce();
        await user.save();
      }

      // Trả về kết quả
      return res.status(200).json({
        address: user.address,
        nonce: user.nonce,
      });
    } catch (error) {
      console.error("Nonce error:", error);
      res.status(500).json({ message: error.message });
    }
  },
  // Login endpoint (legacy) - returns nonce (alias of /nonce)
  login: async (req, res, next) => {
    try {
      // Delegate to nonce logic
      return module.exports.nonce(req, res, next);
    } catch (error) {
      next(error);
    }
  },

/*
   *Verify signature and return JWT
*/
  verify: async (req, res, next) => {
    try {
      const { address, signature, nonce } = req.body;

      if (!address || !signature || !nonce) {
        return res.status(400).json({ message: 'Missing required fields: address, signature, nonce' });
      }

      const addrRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!addrRegex.test(address)) {
        return res.status(422).json({ message: 'Invalid address format' });
      }

      // Find user
      let user = await User.findOne({ address: address.toLowerCase() });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check nonce
      if (user.nonce !== nonce) {
        return res.status(401).json({ message: 'Invalid nonce' });
      }

      // Recreate signed message (must match exactly what frontend signed)
      const message = `Welcome to EVM Multichain Wallet!\n\nNonce: ${nonce}`;

      // Recover address from signature. Support both ethers v6 (ethers.verifyMessage)
      // and ethers v5 (ethers.utils.verifyMessage).
      let recovered;
      try {
        if (typeof ethers.verifyMessage === 'function') {
          recovered = ethers.verifyMessage(message, signature);
        } else if (ethers.utils && typeof ethers.utils.verifyMessage === 'function') {
          recovered = ethers.utils.verifyMessage(message, signature);
        } else {
          throw new Error('No verifyMessage available in ethers library');
        }
      } catch (err) {
        console.error('Signature verification error:', err);
        return res.status(401).json({ message: 'Invalid signature' });
      }

      if (!recovered || recovered.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ message: 'Invalid signature' });
      }

      // Rotate nonce
      user.nonce = generateNonce();
      await user.save();

      // Sign JWT
      const token = jwt.sign({ address: user.address, role: user.role, displayName: user.displayName }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn || '7d' });

      return res.status(200).json({ token, user: { address: user.address, displayName: user.displayName, role: user.role } });
    } catch (error) {
      console.error('Verify error:', error);
      next(error);
    }
  }
};
