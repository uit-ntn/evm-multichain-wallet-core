/**
 * Auth Routes
 * Định nghĩa các routes cho authentication
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const authController = require("../controllers/authController"); // kiểm tra đúng tên file

// Rate limit chung cho auth: 30 req/phút/IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// (Tuỳ chọn) endpoint kiểm tra router đã mount
router.get("/__ping", (req, res) => res.json({ ok: true, scope: "auth" }));

/**
 * @openapi
 * /api/auth/nonce:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Request a nonce for web3 authentication
 *     responses:
 *       200:
 *         description: Returns nonce
 */

// ===== Nonce =====
if (authController?.nonce) {
  router.post("/nonce", limiter, authController.nonce);
} else {
  console.warn("Auth controller missing handler: nonce");
  router.post("/nonce", limiter, (_req, res) =>
    res.status(501).json({ message: "Nonce handler not implemented" })
  );
}

// ===== Verify =====
if (authController?.verify) {
  /**
   * @openapi
   * /api/auth/verify:
   *   post:
   *     tags:
   *       - Auth
   *     summary: Verify signature and issue JWT
   *     responses:
   *       200:
   *         description: Returns JWT token on success
   */
  router.post("/verify", limiter, authController.verify);
} else {
  console.warn("Auth controller missing handler: verify");
  router.post("/verify", limiter, (_req, res) =>
    res.status(501).json({ message: "Verify handler not implemented" })
  );
}

// ===== Me (JWT REQUIRED) =====
if (authController?.me) {
  /**
   * @openapi
   * /api/auth/me:
   *   get:
   *     tags:
   *       - Auth
   *     summary: Get current authenticated user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Returns user profile
   */
  router.get("/me", limiter, authController.me);
} else {
  console.warn("Auth controller missing handler: me");
  router.get("/me", limiter, (_req, res) =>
    res.status(501).json({ message: "Me handler not implemented" })
  );
}

// Login route - redirect to verify for Web3 authentication (backward compatibility)
router.post('/login', limiter, authController.verify);
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login (alias for /verify)
 *     responses:
 *       200:
 *         description: Returns JWT token
 */

module.exports = router;
