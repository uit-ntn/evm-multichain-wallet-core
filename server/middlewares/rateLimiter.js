/**
 * Rate Limiter Middleware (CommonJS)
 * Giới hạn số lượng requests từ một IP trong khoảng thời gian nhất định
 */

const rateLimit = require("express-rate-limit");
const { config } = require("../adapters/config.adapter");

// Default rate limiter - áp dụng cho tất cả requests
const defaultRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: config.rateLimit?.max || 60,
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests from this IP, please try again later.",
      retryAfter: "1 minute",
    });
  },
});

// Strict rate limiter cho auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Chỉ 5 attempts trong 15 phút
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes",
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many authentication attempts, please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

// API rate limiter cho các endpoints quan trọng
const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 30,
  message: {
    error: "API rate limit exceeded, please try again later.",
    retryAfter: "1 minute",
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "API rate limit exceeded, please try again later.",
      retryAfter: "1 minute",
    });
  },
});

module.exports = {
  defaultRateLimit,
  authRateLimit,
  apiRateLimit,
};
