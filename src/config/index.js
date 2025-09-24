require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // EVM Networks
  evm: {
    networks: {
      eth: {
        name: 'Ethereum',
        rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo',
        chainId: 1,
        symbol: 'ETH',
        explorerApi: 'https://api.etherscan.io/api',
        apiKey: process.env.ETHERSCAN_API_KEY
      },
      polygon: {
        name: 'Polygon',
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        chainId: 137,
        symbol: 'MATIC',
        explorerApi: 'https://api.polygonscan.com/api',
        apiKey: process.env.POLYGONSCAN_API_KEY
      },
      bsc: {
        name: 'BSC',
        rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
        chainId: 56,
        symbol: 'BNB',
        explorerApi: 'https://api.bscscan.com/api',
        apiKey: process.env.BSCSCAN_API_KEY
      }
    }
  },

  // Sui Network
  sui: {
    rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
    network: 'mainnet'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  }
};

module.exports = config;