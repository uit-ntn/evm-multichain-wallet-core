/**
 * User Service
 * Business logic cho user management
 */

const User = require('../models/user.model');
const { logger } = require('../adapters/logger.adapter');

// const getAllUsers = async () => {
//   try {
//     const users = await User.find({}).select('-password');
//     return users;
//   } catch (error) {
//     logger.error('Error getting all users', { error: error.message });
//     throw error;
//   }
// };
/**
 * Lấy danh sách user (chỉ admin)
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.pageSize
 * @param {string} [params.role]
 */
const getAllUsers = async ({ page, pageSize, role }) => {
  try {
    const filter = {};
    if (role) filter.role = role;

    const total = await User.countDocuments(filter);

    const items = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select('address displayName role createdAt'); // tránh trả về nonce, stakedAmount

    return {
      items,
      page,
      pageSize,
      total,
    };
  } catch (error) {
    logger.error('Error fetching user list', { error: error.message });
    throw error;
  }
};

/**
 * Upsert user by address: create if not exists or update displayName if exists.
 * Role chỉ được set khi tạo mới user (không cập nhật sau này).
 * Returns { user, created: boolean }
 */
const upsertUserByAddress = async ({ address, displayName, role }) => {
  try {
    // ✅ 1. Chuẩn hóa địa chỉ
    const addr = address.toLowerCase();

    // ✅ 2. Kiểm tra displayName trùng (nếu có)
    if (typeof displayName === 'string' && displayName.length > 0) {
      const existing = await User.findOne({ displayName: displayName });
      if (existing && existing.address.toLowerCase() !== addr) {
        const err = new Error('displayName already in use');
        err.code = 'DISPLAYNAME_TAKEN';
        throw err;
      }
    }

    // ✅ 3. Tạo object cập nhật
    const set = {};
    if (typeof displayName === 'string') set.displayName = displayName;

    // ✅ Cấu hình upsert (tạo mới user nếu chưa tồn tại)
    const update = {
      $set: set,
      $setOnInsert: {
        address: addr,
        nonce: '',               // Nonce mặc định rỗng
        stakedAmount: '0',
        tier: 'Bronze',
        role: 'user'             // ⚠️ Role chỉ gán khi tạo mới
      }
    };

    // ✅ 4. Kiểm tra user hiện tại (để biết có tồn tại hay chưa)
    const userBefore = await User.findOne({ address: addr });
    
    // ✅ 5. Upsert (tạo nếu chưa có, cập nhật nếu có)
    const user = await User.findOneAndUpdate(
      { address: addr },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ✅ 7. Xác định status (201 nếu mới tạo, 200 nếu cập nhật)
    const created = !userBefore;

    return { user, created };
  } catch (error) {
    // ✅ 8. Bắt lỗi duplicate key hoặc DB error
    if (error && error.code === 11000) {
      const err = new Error('duplicate key');
      err.code = 'DUPLICATE_KEY';
      throw err;
    }
    logger.error('Error upserting user', { error: error.message });
    throw error;
  }
};

/**
 * Xoá user theo address (Admin)
 * @param {string} address - địa chỉ ví cần xoá
 * @param {boolean} anonymize - true = xoá mềm (ẩn danh), false = xoá cứng
 * @returns {Promise<boolean>} true nếu đã xoá, false nếu user không tồn tại
 */
const deleteUserByAddress = async (address, anonymize = false) => {
  try {
    const addr = address.toLowerCase();
    const user = await User.findOne({ address: addr });

    // Nếu không tồn tại → idempotent: vẫn trả true
    if (!user) return false;

    if (anonymize) {
      // Xoá mềm: chỉ ẩn danh, không xoá record
      user.displayName = "";
      user.nonce = "";
      user.tier = "Bronze";
      user.stakedAmount = "0";
      await user.save();
      logger.info("User anonymized", { address: addr });
      return true;
    }

    // Xoá cứng khỏi DB
    await User.deleteOne({ address: addr });
    logger.info("User deleted", { address: addr });
    return true;
  } catch (error) {
    logger.error("Error deleting user", { error: error.message });
    throw error;
  }
};

// /**
//  * Cập nhật tier dựa trên stakedAmount
//  * @param {string} address - địa chỉ ví user
//  * @param {string} newStakeAmount - số lượng token đã stake (wei)
//  * @returns {Promise<Object>} user sau khi cập nhật
//  */
// const updateStakeTier = async (address, newStakeAmount) => {
//   try {
//     const addr = address.toLowerCase();
//     const user = await User.findOne({ address: addr });
//     if (!user) throw new Error("User not found");

//     // Cập nhật lượng stake
//     user.stakedAmount = newStakeAmount;

//     // Chuyển từ wei → TRADE (nếu bạn dùng 18 decimals)
//     const stakeInTrade = parseFloat(newStakeAmount) / 1e18;

//     // Xác định tier theo lượng stake
//     if (stakeInTrade >= 10000) user.tier = "Platinum";
//     else if (stakeInTrade >= 5000) user.tier = "Gold";
//     else if (stakeInTrade >= 1000) user.tier = "Silver";
//     else user.tier = "Bronze";

//     await user.save();

//     logger.info("Tier updated", { address: addr, tier: user.tier });
//     return user;
//   } catch (error) {
//     logger.error("Error updating user tier", { error: error.message });
//     throw error;
//   }
// };

    
module.exports = {
  getAllUsers,
  upsertUserByAddress,
  deleteUserByAddress,
  // updateStakeTier,
};
