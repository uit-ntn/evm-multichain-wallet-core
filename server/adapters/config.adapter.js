/**
 * Config Adapter (CommonJS)
 * Centralized configuration management with environment validation
 */

const dotenv = require("dotenv");
dotenv.config();

/** Helpers */
function getRequired(key) {
  const value = process.env[key];
  if (!value) throw new Error(`❌ Required environment variable ${key} is not set`);
  return value;
}

function getOptional(key, defaultValue) {
  return process.env[key] || defaultValue;
}

function getInt(key, defaultValue) {
  const v = process.env[key];
  if (!v) return defaultValue;
  const parsed = parseInt(v, 10);
  if (isNaN(parsed)) throw new Error(`❌ ${key} must be integer`);
  return parsed;
}

function getBool(key, defaultValue = false) {
  const v = process.env[key];
  if (!v) return defaultValue;
  return v.toLowerCase() === "true" || v === "1";
}

/** Config object */
const config = {
  nodeEnv: getOptional("NODE_ENV", "development"),
  port: getInt("PORT", 4000),
  mongoUri: getOptional("MONGO_URI", "mongodb://localhost:27017/evm-wallet"),

  rpc: {
    sepolia: getOptional("RPC_SEPOLIA", ""),
    polygonAmoy: getOptional("RPC_POLYGON_AMOY", ""),
  },

  privateKey: getOptional("PRIVATE_KEY", ""),

  contracts: {
    sepolia: {
      limitOrder: getOptional("LIMIT_ORDER_ADDRESS_SEPOLIA", ""),
      tradeToken: getOptional("TRADE_TOKEN_ADDRESS_SEPOLIA", ""),
      stakingReward: getOptional("STAKING_REWARD_ADDRESS_SEPOLIA", ""),
    },
    polygon: {
      limitOrder: getOptional("LIMIT_ORDER_ADDRESS_POLYGON", ""),
      tradeToken: getOptional("TRADE_TOKEN_ADDRESS_POLYGON", ""),
      stakingReward: getOptional("STAKING_REWARD_ADDRESS_POLYGON", ""),
    },
  },

  corsOrigin: getOptional("CORS_ORIGIN", "http://localhost:3000"),
  rateLimit: {
    windowMs: getInt("RATE_LIMIT_WINDOW_MS", 60000),
    max: getInt("RATE_LIMIT", 60),
  },
  logLevel: getOptional("LOG_LEVEL", "info"),
  etherscanApiKey: getOptional("ETHERSCAN_API_KEY", ""),
  polygonscanApiKey: getOptional("POLYGONSCAN_API_KEY", ""),

  features: {
    ordersEnabled: getBool("FEATURE_ORDERS_ENABLED", true),
    ipfsEnabled: getBool("FEATURE_IPFS_ENABLED", true),
    stakingEnabled: getBool("FEATURE_STAKING_ENABLED", true),
  },

  chains: {
    sepolia: {
      chainId: 11155111,
      name: "Sepolia",
      symbol: "ETH",
      rpc: getOptional("RPC_SEPOLIA", ""),
      explorer: "https://sepolia.etherscan.io",
    },
    polygonAmoy: {
      chainId: 80002,
      name: "Polygon Amoy",
      symbol: "MATIC",
      rpc: getOptional("RPC_POLYGON_AMOY", ""),
      explorer: "https://amoy.polygonscan.com",
    },
  },
};

/** Validation & helpers */
function getEnabledChains() {
  return Object.values(config.chains).filter((c) => c.rpc && c.rpc.length > 0);
}

function getChainById(id) {
  return Object.values(config.chains).find((c) => c.chainId === id);
}

function getChainByName(name) {
  return Object.values(config.chains).find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
}

function getContractAddress(chainName, contractName) {
  const chain = config.contracts[chainName];
  return chain ? chain[contractName] : null;
}

/** Initialize and log configuration */
function initConfig() {
  const enabledChains = getEnabledChains();
  console.log(`✅ Configuration loaded successfully`);
  console.log(
    `📡 Enabled chains: ${enabledChains.map((c) => c.name).join(", ") || "None"}`
  );
  console.log(`🚀 Environment: ${config.nodeEnv}`);
  console.log(
    `🔧 Features: ${
      Object.entries(config.features)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
        .join(", ") || "None"
    }`
  );
  return config;
}

/** Exports */
module.exports = {
  config,
  getEnabledChains,
  getChainById,
  getChainByName,
  getContractAddress,
  initConfig,
};
