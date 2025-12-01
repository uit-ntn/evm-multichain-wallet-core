/**
 * Setting Routes
 * Định nghĩa các routes cho system settings
 */

const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');

/**
 * @openapi
 * tags:
 *   - name: Settings
 *     description: System settings endpoints
 */

module.exports = router;
