/**
 * User Service
 * Business logic cho user management
 */

const User = require('../models/user.model');
const { logger } = require('../adapters/logger.adapter');

const getAllUsers = async () => {
  try {
    const users = await User.find({}).select('-password');
    return users;
  } catch (error) {
    logger.error('Error getting all users', { error: error.message });
    throw error;
  }
};

module.exports = {
  getAllUsers,
};
