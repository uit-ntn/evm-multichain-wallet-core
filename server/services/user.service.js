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

/**
 * Đổi vai trò (role) của user
 * @param {string} adminAddress - địa chỉ admin đang thực hiện
 * @param {string} targetAddress - địa chỉ ví user cần đổi
 * @param {string} newRole - vai trò mới ('user' hoặc 'admin')
 * @returns {object} - { message, address, role }
 */
async function updateUserRole(adminAddress, targetAddress, newRole) {
  const allowedRoles = ["user", "admin"];
  if (!allowedRoles.includes(newRole)) {
    throw new Error("Invalid role");
  }

  const normalizedTarget = targetAddress.toLowerCase();
  const normalizedAdmin = adminAddress.toLowerCase();

  // Tìm user cần đổi vai trò
  const user = await User.findOne({ address: normalizedTarget });
  if (!user) throw new Error("User not found");

  // Cập nhật role và lưu audit trail
  user.role = newRole;
  user.updatedBy = normalizedAdmin;
  user.lastRoleChangeAt = new Date();
  await user.save();

  // Log để admin dễ theo dõi trong terminal
  console.log(
    `[AUDIT] ${normalizedAdmin} changed role of ${normalizedTarget} -> ${newRole} at ${new Date().toISOString()}`
  );

  return {
    message: "updated",
    address: user.address,
    role: user.role,
  };
}

module.exports = {
  getUserByAddress,
  updateDisplayName,
  updateUserRole, 
};
