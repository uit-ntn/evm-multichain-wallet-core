// routes/user.route.js
const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  getUserByAddress,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

router.get("/", getAllUsers);
router.get("/:address", getUserByAddress);
router.post("/", createUser);
router.patch("/:address", updateUser);
router.delete("/:address", deleteUser);

module.exports = router;
