/**
 * User Controller
 * Xử lý các HTTP requests liên quan đến user
 */

const userService = require("../services/user.service");

/**
 * GET /api/users/:address
 * Lấy chi tiết user theo địa chỉ ví
 * Auth: PUBLIC
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

/**
 * PATCH /api/users/display-name
 * Cập nhật tên hiển thị (ENS/custom)
 * Auth: JWT REQUIRED
 */
const updateDisplayName = async (req, res) => {
  try {
    const { address, displayName } = req.body;
    const user = req.user; // Lấy thông tin user từ middleware verifyJWT

    // Kiểm tra quyền truy cập (chỉ chủ ví mới được cập nhật)
    if (!user || user.address.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await userService.updateDisplayName(address, displayName);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Update displayName error:", error.message);

    // Phân loại lỗi theo rubric
    if (error.message.includes("empty"))
      return res.status(400).json({ message: error.message });
    if (error.message.includes("Invalid"))
      return res.status(422).json({ message: error.message });
    if (error.message.includes("too long"))
      return res.status(400).json({ message: error.message });
    if (error.message === "User not found")
      return res.status(404).json({ message: "User not found" });

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { getUser, updateDisplayName };
