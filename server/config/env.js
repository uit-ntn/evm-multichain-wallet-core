/**
 * Environment Configuration Loader & Validator
 * Centralized environment variable management with validation
 */

require('dotenv').config();

/**
 * Get required environment variable
 * Throws error if not found
 */
function getRequired(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getOptional(key, defaultValue) {
  return process.env[key] || defaultValue;
}

/**
 * Parse integer with default
 */
function getInt(key, defaultValue) {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer`);
  }
  return parsed;
}

/**
 * Parse boolean
 */
function getBool(key, defaultValue = false) {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Application configuration
 */
const config = {
  // General
  nodeEnv: getOptional('NODE_ENV', 'development'),
  port: getInt('PORT', 4000),
  
  // Database (MongoDB)
  mongoUri: getOptional('MONGO_URI', 'mongodb://localhost:27017/evm-multichain-wallet'),
  
  // RPC Providers
  rpc: {
    sepolia: getOptional('RPC_SEPOLIA', ''),
    polygonAmoy: getOptional('RPC_POLYGON_AMOY', ''),
  },
  
  // Wallet / Deployer
  privateKey: getOptional('PRIVATE_KEY', ''),
  
  // Smart Contract Addresses (Sepolia)
  contracts: {
    sepolia: {
      limitOrder: getOptional('LIMIT_ORDER_ADDRESS_SEPOLIA', ''),
      tradeToken: getOptional('TRADE_TOKEN_ADDRESS_SEPOLIA', ''),
      stakingReward: getOptional('STAKING_REWARD_ADDRESS_SEPOLIA', ''),
    },
    polygon: {
      limitOrder: getOptional('LIMIT_ORDER_ADDRESS_POLYGON', ''),
      tradeToken: getOptional('TRADE_TOKEN_ADDRESS_POLYGON', ''),
      stakingReward: getOptional('STAKING_REWARD_ADDRESS_POLYGON', ''),
    },
  },
  
  // IPFS Storage
  ipfs: {
    provider: getOptional('IPFS_PROVIDER', 'web3storage'),
    apiKey: getOptional('IPFS_API_KEY', ''),
  },
  
  // Security & Logging
  corsOrigin: getOptional('CORS_ORIGIN', 'http://localhost:3000'),
  rateLimit: getInt('RATE_LIMIT', 60),
  logLevel: getOptional('LOG_LEVEL', 'info'),
  
  // Etherscan / Polygonscan
  etherscanApiKey: getOptional('ETHERSCAN_API_KEY', ''),
  polygonscanApiKey: getOptional('POLYGONSCAN_API_KEY', ''),
};

/**
 * Validate configuration
 */
function validateConfig() {
  const errors = [];
  
  // Validate port range
  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug', 'trace'];
  if (!validLogLevels.includes(config.logLevel)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }
  
  // Warning if no RPC configured
  if (!config.rpc.sepolia && !config.rpc.polygonAmoy) {
    console.warn('⚠️  Warning: No RPC endpoints configured');
  }
  
  // Warning if no private key
  if (!config.privateKey && config.nodeEnv !== 'test') {
    console.warn('⚠️  Warning: PRIVATE_KEY not configured (needed for contract interactions)');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

/**
 * Initialize and validate configuration
 */
function initConfig() {
  try {
    validateConfig();
    return config;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
  }
}

module.exports = {
  config,
  initConfig,
  getRequired,
  getOptional,
  getInt,
  getBool,
};

