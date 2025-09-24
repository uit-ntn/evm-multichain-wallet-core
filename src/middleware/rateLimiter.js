const rateLimit = require('express-rate-limit');
const config = require('../config');

const createRateLimiter = (windowMs = config.rateLimit.windowMs, max = config.rateLimit.max) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  defaultRateLimit: createRateLimiter(),
  strictRateLimit: createRateLimiter(15 * 60 * 1000, 50) // 50 requests per 15 minutes
};