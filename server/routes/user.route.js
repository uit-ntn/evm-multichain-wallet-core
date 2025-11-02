const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');

// Get all users
router.get('/', userController.getAllUsers.bind(userController));

module.exports = router;
