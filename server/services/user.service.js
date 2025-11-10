const User = require("../models/user.model");
const { logger } = require("../adapters/logger.adapter");

const getAllUsers = async ({ page, limit }) => {
  try {
    const skip = (page - 1) * limit;
    const users = await User.find({})
      .select("-password")
      .skip(skip)
      .limit(limit);
    return users;
  } catch (error) {
    logger.error("Error getting all users", { error: error.message });
    throw error;
  }
};

module.exports = { getAllUsers };
