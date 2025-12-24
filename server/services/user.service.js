// services/user.service.js
const User = require("../models/user.model");

const createOrGetUser = async ({ address, name = "" }) => {
  const existed = await User.findByAddress(address);
  if (existed) return existed;

  return User.create({ address, name });
};

const getByAddress = async (address) => {
  return User.findByAddress(address);
};

const listUsers = async ({ limit = 20, skip = 0 } = {}) => {
  const [total, data] = await Promise.all([
    User.countDocuments({}),
    User.find({}).sort({ createdAt: -1 }).limit(limit).skip(skip),
  ]);
  return { total, data };
};

const updateUser = async (address, patch = {}) => {
  const allowed = {};
  if (typeof patch.name === "string") allowed.name = patch.name;
  if (patch.role && ["user", "admin"].includes(patch.role)) allowed.role = patch.role;

  return User.findOneAndUpdate(
    { address: address.toLowerCase() },
    { $set: allowed },
    { new: true }
  );
};

const deleteUser = async (address) => {
  return User.findOneAndDelete({ address: address.toLowerCase() });
};

module.exports = {
  createOrGetUser,
  getByAddress,
  listUsers,
  updateUser,
  deleteUser,
};
