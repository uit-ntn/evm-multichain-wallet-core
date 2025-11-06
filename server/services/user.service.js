/**
 * User Service
 * Business logic cho user management
 */

const User = require("../models/user.model");

/**
 * Tìm user theo địa chỉ ví
 * @param {string} address
 * @returns {object|null}
 */
async function getUserByAddress(address) {
  const normalized = address.toLowerCase();
  const user = await User.findOne({ address: normalized }).lean();

  if (!user) return null;

  return {
    address: user.address,
    displayName: user.displayName || "",
    role: user.role,
  };
}

/**
 * Cập nhật tên hiển thị (ENS/custom)
 * @param {string} address - địa chỉ ví user
 * @param {string} displayName - tên hiển thị mới
 * @returns {object} - { message, displayName }
 */
async function updateDisplayName(address, displayName) {
  // Kiểm tra dữ liệu đầu vào
  if (!displayName || displayName.trim() === "") {
    throw new Error("Display name cannot be empty");
  }

  const normalizedDisplayName = displayName.trim();

  // Kiểm tra định dạng (ENS/custom)
  const regex = /^[a-zA-Z0-9_.-]+(\.eth)?$/;
  if (!regex.test(normalizedDisplayName)) {
    throw new Error("Invalid display name format");
  }

  // Kiểm tra độ dài
  if (normalizedDisplayName.length > 50) {
    throw new Error("Display name too long");
  }

  // Chuẩn hóa địa chỉ ví
  const normalizedAddress = address.toLowerCase();

  // Cập nhật user trong DB
  const updatedUser = await User.findOneAndUpdate(
    { address: normalizedAddress },
    { displayName: normalizedDisplayName },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw new Error("User not found");
  }

  return {
    message: "updated",
    displayName: updatedUser.displayName,
  };
}

module.exports = {
  getUserByAddress,
  updateDisplayName,
};
