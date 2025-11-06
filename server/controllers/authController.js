// server/controllers/authController.js
const authService = require("../services/auth.service");

/**
 * POST /api/auth/nonce
 * Tạo/cập nhật nonce cho địa chỉ ví
 */
const nonce = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ message: "Address is required" });
    }

    const addrRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addrRegex.test(address)) {
      return res.status(422).json({ message: "Invalid address format" });
    }

    const result = await authService.createOrUpdateNonce(address);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Nonce error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * POST /api/auth/verify
 * Body: { address, signature, nonce, typedData? }
 * Xác minh chữ ký (EIP-191/EIP-712), rotate nonce và trả JWT
 */
const verify = async (req, res) => {
  try {
    const { address, signature, nonce } = req.body;

    if (!address || !signature || !nonce)
      return res
        .status(400)
        .json({ message: "Missing required fields: address, signature, nonce" });

    const result = await authService.verifySignature(address, signature, nonce);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Verify error:", error);

    if (error.message === "Invalid nonce")
      return res.status(401).json({ message: "Invalid nonce" });
    if (error.message === "Invalid signature")
      return res.status(401).json({ message: "Invalid signature" });
    if (error.message === "Invalid signature format")
      return res.status(422).json({ message: "Invalid signature format" });
    if (error.message === "User not found")
      return res.status(404).json({ message: "User not found" });

    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/auth/me
 * Lấy thông tin user hiện tại từ JWT (Authorization: Bearer <token>)
 */
const me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing Bearer token" });
    }

    const token = authHeader.slice(7);
    const currentUser = await authService.getCurrentUser(token);
    if (!currentUser) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(200).json(currentUser);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    console.error("Me error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { nonce, verify, me };
