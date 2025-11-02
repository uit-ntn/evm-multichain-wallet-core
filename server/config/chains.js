/**
 * Multichain Registry
 * Chain configurations for Sepolia and Polygon Amoy testnets
 */

require('dotenv').config();

/**
 * Chain configurations
 */
const chains = [
  {
    chainId: 11155111,
    name: 'Sepolia',
    symbol: 'ETH',
    rpc: process.env.RPC_SEPOLIA || '',
    explorer: 'https://sepolia.etherscan.io',
    explorerApiKey: process.env.ETHERSCAN_API_KEY || '',
    contracts: {
      limitOrder: process.env.LIMIT_ORDER_ADDRESS_SEPOLIA || '',
      tradeToken: process.env.TRADE_TOKEN_ADDRESS_SEPOLIA || '',
      stakingReward: process.env.STAKING_REWARD_ADDRESS_SEPOLIA || '',
    },
  },
  {
    chainId: 80002,
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    rpc: process.env.RPC_POLYGON_AMOY || '',
    explorer: 'https://amoy.polygonscan.com',
    explorerApiKey: process.env.POLYGONSCAN_API_KEY || '',
    contracts: {
      limitOrder: process.env.LIMIT_ORDER_ADDRESS_POLYGON || '',
      tradeToken: process.env.TRADE_TOKEN_ADDRESS_POLYGON || '',
      stakingReward: process.env.STAKING_REWARD_ADDRESS_POLYGON || '',
    },
  },
];

/**
 * Get chain config by chainId
 */
function getChainById(chainId) {
  return chains.find(chain => chain.chainId === chainId);
}

/**
 * Get chain config by name
 */
function getChainByName(name) {
  return chains.find(chain => chain.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get all enabled chains (chains with RPC configured)
 */
function getEnabledChains() {
  return chains.filter(chain => chain.rpc && chain.rpc.length > 0);
}

/**
 * Check if chain is enabled
 */
function isChainEnabled(chainId) {
  const chain = getChainById(chainId);
  return chain && chain.rpc && chain.rpc.length > 0;
}

/**
 * Validate chain configurations
 */
function validateChainConfigs() {
  const enabledChains = getEnabledChains();
  
  if (enabledChains.length === 0) {
    console.warn('⚠️  Warning: No chains enabled. Configure RPC_SEPOLIA or RPC_POLYGON_AMOY');
    return;
  }
  
  console.log(`✅ Enabled chains: ${enabledChains.map(c => c.name).join(', ')}`);
  
  // Check for missing contract addresses
  enabledChains.forEach(chain => {
    const missingContracts = [];
    if (!chain.contracts.limitOrder) missingContracts.push('LimitOrder');
    if (!chain.contracts.tradeToken) missingContracts.push('TradeToken');
    if (!chain.contracts.stakingReward) missingContracts.push('StakingReward');
    
    if (missingContracts.length > 0) {
      console.warn(`⚠️  ${chain.name}: Missing addresses for ${missingContracts.join(', ')}`);
    }
  });
}

module.exports = {
  chains,
  getChainById,
  getChainByName,
  getEnabledChains,
  isChainEnabled,
  validateChainConfigs,
};

