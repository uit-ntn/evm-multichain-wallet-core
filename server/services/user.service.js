const User = require('../model/user.model');

class UserService {
  /**
   * Get all users
   * @returns {Promise<Array>} Array of users
   */
  async getAllUsers() {
    try {
      const users = await User.find({}).select('-password'); // Exclude password field
      return users;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();
