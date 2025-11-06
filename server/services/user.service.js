/**
 * User Service
 * Business logic cho user management
 */
// services/user.service.js
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
    displayName: user.displayName,
    role: user.role,
  };
}

module.exports = { getUserByAddress };
