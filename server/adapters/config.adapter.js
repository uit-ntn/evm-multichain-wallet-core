/**
 * Config Adapter
 * Centralized configuration management with environment validation
 */

require('dotenv').config();

/**
 * Get required environment variable
 */
function getRequired(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Required environment variable ${key} is not set`);
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
 * Parse integer with validation
 */
function getInt(key, defaultValue) {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`❌ Environment variable ${key} must be a valid integer`);
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
 * Parse JSON with error handling
 */
function getJSON(key, defaultValue = {}) {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`❌ Environment variable ${key} must be valid JSON`);
  }
}

/**
 * Application Configuration
 */
const config = {
  // General
  nodeEnv: getOptional('NODE_ENV', 'development'),
  port: getInt('PORT', 4000),
  
  // Database
  mongoUri: getOptional('MONGO_URI', 'mongodb://localhost:27017/evm-multichain-wallet'),
  
  // RPC Providers
  rpc: {
    sepolia: getOptional('RPC_SEPOLIA', ''),
    polygonAmoy: getOptional('RPC_POLYGON_AMOY', ''),
  },
  
  // Wallet / Deployer
  privateKey: getOptional('PRIVATE_KEY', ''),
  
  // Smart Contract Addresses
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
    gateway: getOptional('IPFS_GATEWAY', 'https://gateway.pinata.cloud/ipfs/'),
  },
  
  // Security & Logging
  corsOrigin: getOptional('CORS_ORIGIN', 'http://localhost:3000'),
  rateLimit: {
    windowMs: getInt('RATE_LIMIT_WINDOW_MS', 60000),
    max: getInt('RATE_LIMIT', 60),
  },
  logLevel: getOptional('LOG_LEVEL', 'info'),
  
  // API Keys
  etherscanApiKey: getOptional('ETHERSCAN_API_KEY', ''),
  polygonscanApiKey: getOptional('POLYGONSCAN_API_KEY', ''),
  
  // JWT & Auth
  jwtSecret: getOptional('JWT_SECRET', 'your-super-secret-jwt-key'),
  jwtExpiresIn: getOptional('JWT_EXPIRES_IN', '7d'),
  
  // Features
  features: {
    ordersEnabled: getBool('FEATURE_ORDERS_ENABLED', true),
    ipfsEnabled: getBool('FEATURE_IPFS_ENABLED', true),
    stakingEnabled: getBool('FEATURE_STAKING_ENABLED', true),
  },
  
  // Chain configurations
  chains: {
    sepolia: {
      chainId: 11155111,
      name: 'Sepolia',
      symbol: 'ETH',
      rpc: getOptional('RPC_SEPOLIA', ''),
      explorer: 'https://sepolia.etherscan.io',
      faucet: 'https://sepoliafaucet.com',
    },
    polygonAmoy: {
      chainId: 80002,
      name: 'Polygon Amoy',
      symbol: 'MATIC',
      rpc: getOptional('RPC_POLYGON_AMOY', ''),
      explorer: 'https://amoy.polygonscan.com',
      faucet: 'https://faucet.polygon.technology',
    },
  },
};

/**
 * Validate configuration
 */
function validateConfig() {
  const errors = [];
  
  // Validate port
  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug', 'trace'];
  if (!validLogLevels.includes(config.logLevel)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }
  
  // Validate MongoDB URI
  if (!config.mongoUri.startsWith('mongodb')) {
    errors.push('MONGO_URI must be a valid MongoDB connection string');
  }
  
  // Warnings for missing optional configs
  const warnings = [];
  
  if (!config.rpc.sepolia && !config.rpc.polygonAmoy) {
    warnings.push('⚠️  No RPC endpoints configured');
  }
  
  if (!config.privateKey && config.nodeEnv !== 'test') {
    warnings.push('⚠️  PRIVATE_KEY not configured (needed for contract interactions)');
  }
  
  if (!config.ipfs.apiKey && config.features.ipfsEnabled) {
    warnings.push('⚠️  IPFS_API_KEY not configured but IPFS is enabled');
  }
  
  // Log warnings
  warnings.forEach(warning => console.warn(warning));
  
  if (errors.length > 0) {
    throw new Error(`❌ Configuration errors:\n${errors.join('\n')}`);
  }
}

/**
 * Get enabled chains (chains with RPC configured)
 */
function getEnabledChains() {
  return Object.values(config.chains).filter(chain => chain.rpc && chain.rpc.length > 0);
}

/**
 * Get chain by chainId
 */
function getChainById(chainId) {
  return Object.values(config.chains).find(chain => chain.chainId === chainId);
}

/**
 * Get chain by name
 */
function getChainByName(name) {
  return Object.values(config.chains).find(
    chain => chain.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Check if feature is enabled
 */
function isFeatureEnabled(featureName) {
  return config.features[featureName] === true;
}

/**
 * Get contract address for chain
 */
function getContractAddress(chainName, contractName) {
  const chainConfig = config.contracts[chainName];
  return chainConfig ? chainConfig[contractName] : null;
}

/**
 * Initialize and validate configuration
 */
function initConfig() {
  try {
    validateConfig();
    
    const enabledChains = getEnabledChains();
    console.log(`✅ Configuration loaded successfully`);
    console.log(`📡 Enabled chains: ${enabledChains.map(c => c.name).join(', ') || 'None'}`);
    console.log(`🚀 Environment: ${config.nodeEnv}`);
    console.log(`🔧 Features: ${Object.entries(config.features)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name)
      .join(', ') || 'None'}`);
    
    return config;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
  }
}

/**
 * Export configuration and utilities
 */
module.exports = {
  config,
  initConfig,
  getRequired,
  getOptional,
  getInt,
  getBool,
  getJSON,
  validateConfig,
  getEnabledChains,
  getChainById,
  getChainByName,
  isFeatureEnabled,
  getContractAddress,
};
