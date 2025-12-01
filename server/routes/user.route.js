const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get list of users
 *     responses:
 *       200:
 *         description: Returns an array of users
 */
router.get("/", userController.getAllUsers);

module.exports = router;
