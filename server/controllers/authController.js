/**
 * Auth Controller
 * Xử lý các HTTP request liên quan đến xác thực (Web3 login)
 */

const authService = require("../services/auth.service");

/**
 * POST /api/auth/nonce
 * Tạo nonce để FE ký message
 */
const nonce = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address)
      return res.status(400).json({ message: "Address is required" });

    const addrRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addrRegex.test(address))
      return res.status(422).json({ message: "Invalid address format" });

    const result = await authService.createOrUpdateNonce(address);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Nonce error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/auth/verify
 * Xác minh chữ ký người dùng và trả JWT
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

module.exports = { nonce, verify };
