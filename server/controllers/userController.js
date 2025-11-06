/**
 * User Controller
 * Xử lý các HTTP requests liên quan đến user
 */

// controllers/user.controller.js
const userService = require("../services/user.service");

/**
 * GET /api/users/:address
 * Lấy chi tiết user theo địa chỉ ví
 */
const getUser = async (req, res) => {
  try {
    const { address } = req.params;

    // Kiểm tra định dạng địa chỉ ví
    const addrRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addrRegex.test(address)) {
      return res.status(400).json({ message: "Invalid address format" });
    }

    const user = await userService.getUserByAddress(address);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("User get error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { getUser };
