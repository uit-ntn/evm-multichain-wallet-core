/**
 * JWT Configuration
 * Cấu hình cho JSON Web Token
 */

const { getRequired, getOptional } = require('./env');

const jwtConfig = {
  // Secret key for signing JWT tokens
  secret: getOptional('JWT_SECRET', 'your-secret-key-min-32-chars-long'),
  
  // Token expiration (default: 7 days)
  expiresIn: getOptional('JWT_EXPIRES_IN', '7d'),
  
  // Refresh token expiration (default: 30 days)
  refreshExpiresIn: getOptional('JWT_REFRESH_EXPIRES_IN', '30d'),
};

module.exports = jwtConfig;