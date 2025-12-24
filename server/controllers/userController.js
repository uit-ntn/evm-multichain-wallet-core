// controllers/userController.js
const userService = require("../services/user.service");

// GET /api/users?limit=&skip=
exports.getAllUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "20");
    const skip = parseInt(req.query.skip || "0");
    const result = await userService.listUsers({ limit, skip });
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/users/:address
exports.getUserByAddress = async (req, res) => {
  try {
    const user = await userService.getByAddress(req.params.address);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// POST /api/users  { address, name? }
exports.createUser = async (req, res) => {
  try {
    const { address, name } = req.body;
    if (!address) return res.status(400).json({ success: false, error: "address is required" });

    const user = await userService.createOrGetUser({ address, name });
    res.status(201).json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// PATCH /api/users/:address  { name?, role? }
exports.updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.address, req.body);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// DELETE /api/users/:address
exports.deleteUser = async (req, res) => {
  try {
    const user = await userService.deleteUser(req.params.address);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
