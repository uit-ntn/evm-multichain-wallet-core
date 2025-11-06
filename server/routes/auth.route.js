/**
 * Auth Routes
 * Định nghĩa các routes cho authentication
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Register routes only if controller handlers exist to avoid startup crash
if (authController && typeof authController.nonce === 'function') {
	router.post('/nonce', authController.nonce);
} else {
	console.warn('Auth controller missing handler: nonce');
	router.post('/nonce', (req, res) => res.status(501).json({ message: 'Nonce handler not implemented' }));
}

if (authController && typeof authController.login === 'function') {
	router.post('/login', authController.login);
} else {
	console.warn('Auth controller missing handler: login');
	router.post('/login', (req, res) => res.status(501).json({ message: 'Login handler not implemented' }));
}

if (authController && typeof authController.verify === 'function') {
	router.post('/verify', authController.verify);
} else {
	console.warn('Auth controller missing handler: verify');
	router.post('/verify', (req, res) => res.status(501).json({ message: 'Verify handler not implemented' }));
}

module.exports = router;
