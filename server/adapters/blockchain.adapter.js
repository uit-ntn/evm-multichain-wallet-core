/**
 * Blockchain Adapter
 * Handles blockchain interactions and event listening
 */

const { ethers } = require('ethers');
const { config, getEnabledChains, getChainById } = require('./config.adapter');
const { logger, logBlockchainTransaction } = require('./logger.adapter');

/**
 * Provider cache
 */
const providerCache = new Map();

/**
 * Contract cache
 */
const contractCache = new Map();

/**
 * Get provider for a chain
 */
function getProvider(chainId) {
  // Check cache
  if (providerCache.has(chainId)) {
    return providerCache.get(chainId);
  }
  
  const chain = getChainById(chainId);
  if (!chain || !chain.rpc) {
    throw new Error(`Chain ${chainId} not configured or RPC not available`);
  }
  
  // Create provider
  const provider = new ethers.JsonRpcProvider(chain.rpc, {
    chainId: chain.chainId,
    name: chain.name,
  });
  
  // Cache provider
  providerCache.set(chainId, provider);
  
  logger.debug('Provider created', { 
    chainId, 
    chainName: chain.name,
    rpc: chain.rpc 
  });
  
  return provider;
}

/**
 * Get signer (for contract interactions)
 */
function getSigner(chainId) {
  if (!config.privateKey) {
    throw new Error('PRIVATE_KEY not configured');
  }
  
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  
  logger.debug('Signer created', { 
    chainId, 
    address: wallet.address 
  });
  
  return wallet;
}

/**
 * Get contract instance
 */
function getContract(chainId, contractName, abi) {
  const cacheKey = `${chainId}-${contractName}`;
  
  // Check cache
  if (contractCache.has(cacheKey)) {
    return contractCache.get(cacheKey);
  }
  
  const chain = getChainById(chainId);
  if (!chain) {
    throw new Error(`Chain ${chainId} not found`);
  }
  
  // Get contract address from config
  const chainName = chain.name.toLowerCase().replace(' ', '');
  const contractAddress = config.contracts[chainName]?.[contractName];
  
  if (!contractAddress) {
    throw new Error(`Contract ${contractName} not configured for chain ${chainId}`);
  }
  
  const provider = getProvider(chainId);
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  // Cache contract
  contractCache.set(cacheKey, contract);
  
  logger.debug('Contract instance created', { 
    chainId, 
    contractName, 
    address: contractAddress 
  });
  
  return contract;
}

/**
 * Get contract with signer (for write operations)
 */
function getContractWithSigner(chainId, contractName, abi) {
  const contract = getContract(chainId, contractName, abi);
  const signer = getSigner(chainId);
  
  return contract.connect(signer);
}

/**
 * Wait for transaction confirmation
 */
async function waitForTransaction(chainId, txHash, confirmations = 1) {
  const provider = getProvider(chainId);
  
  logger.info('Waiting for transaction confirmation', { 
    chainId, 
    txHash, 
    confirmations 
  });
  
  try {
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }
    
    const status = receipt.status === 1 ? 'SUCCESS' : 'FAILED';
    
    logBlockchainTransaction(
      chainId, 
      txHash, 
      status, 
      receipt.gasUsed?.toString()
    );
    
    return receipt;
  } catch (error) {
    logger.error('Transaction wait failed', { 
      chainId, 
      txHash, 
      error: error.message 
    });
    
    logBlockchainTransaction(chainId, txHash, 'FAILED');
    throw error;
  }
}

/**
 * Get transaction receipt
 */
async function getTransactionReceipt(chainId, txHash) {
  const provider = getProvider(chainId);
  
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (receipt) {
      const status = receipt.status === 1 ? 'SUCCESS' : 'FAILED';
      logBlockchainTransaction(
        chainId, 
        txHash, 
        status, 
        receipt.gasUsed?.toString()
      );
    }
    
    return receipt;
  } catch (error) {
    logger.error('Failed to get transaction receipt', {
      chainId,
      txHash,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get current block number
 */
async function getBlockNumber(chainId) {
  const provider = getProvider(chainId);
  return await provider.getBlockNumber();
}

/**
 * Get balance of address
 */
async function getBalance(chainId, address) {
  const provider = getProvider(chainId);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Format units helper
 */
function formatUnits(value, decimals = 18) {
  return ethers.formatUnits(value, decimals);
}

/**
 * Parse units helper
 */
function parseUnits(value, decimals = 18) {
  return ethers.parseUnits(value.toString(), decimals);
}

/**
 * Validate Ethereum address
 */
function isValidAddress(address) {
  return ethers.isAddress(address);
}

/**
 * Health check for all enabled chains
 */
async function healthCheck() {
  const enabledChains = getEnabledChains();
  const results = [];
  
  for (const chain of enabledChains) {
    try {
      const provider = getProvider(chain.chainId);
      const blockNumber = await provider.getBlockNumber();
      
      results.push({
        chainId: chain.chainId,
        name: chain.name,
        status: 'healthy',
        blockNumber,
        rpc: chain.rpc,
      });
      
      logger.debug('Chain health check passed', {
        chainId: chain.chainId,
        blockNumber,
      });
    } catch (error) {
      results.push({
        chainId: chain.chainId,
        name: chain.name,
        status: 'unhealthy',
        error: error.message,
        rpc: chain.rpc,
      });
      
      logger.error('Chain health check failed', {
        chainId: chain.chainId,
        error: error.message,
      });
    }
  }
  
  return results;
}

/**
 * Clear provider cache (useful for reconnection)
 */
function clearCache() {
  providerCache.clear();
  contractCache.clear();
  logger.info('Blockchain adapter cache cleared');
}

module.exports = {
  getProvider,
  getSigner,
  getContract,
  getContractWithSigner,
  waitForTransaction,
  getTransactionReceipt,
  getBlockNumber,
  getBalance,
  formatUnits,
  parseUnits,
  isValidAddress,
  healthCheck,
  clearCache,
};
