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
    
module.exports = {
  getAllUsers,
  upsertUserByAddress,
};
