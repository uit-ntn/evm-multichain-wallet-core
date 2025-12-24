/**
 * Enhanced Blockchain Adapter with Registry Integration
 * Handles blockchain interactions using dynamic contract addresses from Registry
 */

const { ethers } = require("ethers");
const { config, getEnabledChains, getChainById } = require("./config.adapter");
const { logger, logBlockchainTransaction } = require("./logger.adapter");
const { getContractAddress } = require("../services/registry.service");

const providerCache = new Map();
const contractCache = new Map();

/**
 * Get provider for a chain
 */
function getProvider(chainId) {
  if (providerCache.has(chainId)) return providerCache.get(chainId);

  const chain = getChainById(chainId);
  if (!chain || !chain.rpc) {
    throw new Error(`RPC for chain ${chainId} not configured`);
  }

  const provider = new ethers.providers.JsonRpcProvider(chain.rpc, {
    chainId,
    name: chain.name,
  });

  providerCache.set(chainId, provider);
  return provider;
}

/**
 * Get signer for a chain
 */
function getSigner(chainId) {
  if (!config.privateKey) throw new Error("PRIVATE_KEY not set");
  const provider = getProvider(chainId);
  return new ethers.Wallet(config.privateKey, provider);
}

/**
 * Get contract instance using Registry address
 */
async function getContract(chainId, contractName, abi) {
  const key = `${chainId}-${contractName}`;
  
  // Check cache first
  if (contractCache.has(key)) {
    return contractCache.get(key);
  }

  try {
    // Get address from Registry
    const address = await getContractAddress(chainId, contractName);
    
    if (!address || address === ethers.constants.AddressZero) {
      throw new Error(`Contract ${contractName} not found in Registry for chain ${chainId}`);
    }

    const contract = new ethers.Contract(address, abi, getProvider(chainId));
    contractCache.set(key, contract);
    
    logger.info('Contract instance created from Registry', {
      chainId,
      contractName,
      address
    });

    return contract;
  } catch (error) {
    logger.error('Failed to create contract instance from Registry', {
      chainId,
      contractName,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get contract instance with signer using Registry address
 */
async function getContractWithSigner(chainId, contractName, abi) {
  const contract = await getContract(chainId, contractName, abi);
  const signer = getSigner(chainId);
  return contract.connect(signer);
}

/**
 * Wait for transaction confirmation
 */
async function waitForTransaction(chainId, txHash, confirmations = 1) {
  const provider = getProvider(chainId);
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  const status = receipt.status === 1 ? "SUCCESS" : "FAILED";
  logBlockchainTransaction(chainId, txHash, status);
  return receipt;
}

/**
 * Clear all caches
 */
function clearCache() {
  providerCache.clear();
  contractCache.clear();
  logger.info("Blockchain caches cleared");
}

/**
 * Clear contract cache only (useful when addresses change)
 */
function clearContractCache() {
  contractCache.clear();
  logger.info("Contract cache cleared");
}

/**
 * LimitOrder Contract Methods
 */
class LimitOrderManager {
  constructor(chainId) {
    this.chainId = chainId;
    this.abi = [
      'function createOrder(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline) external returns (uint256 orderId)',
      'function cancelOrder(uint256 orderId) external',
      'function executeOrder(uint256 orderId, bytes calldata swapData) external',
      'function getOrder(uint256 orderId) external view returns (tuple(address user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline, bool isActive))',
      'function getUserOrders(address user) external view returns (uint256[] memory)',
      'event OrderCreated(uint256 indexed orderId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)',
      'event OrderCancelled(uint256 indexed orderId, address indexed user)',
      'event OrderFilled(uint256 indexed orderId, address indexed user, uint256 amountOut, address filler)'
    ];
  }

  async getContract() {
    return await getContract(this.chainId, 'limitOrder', this.abi);
  }

  async getContractWithSigner() {
    return await getContractWithSigner(this.chainId, 'limitOrder', this.abi);
  }

  async createOrder(tokenIn, tokenOut, amountIn, minAmountOut, deadline) {
    try {
      const contract = await this.getContractWithSigner();
      const tx = await contract.createOrder(tokenIn, tokenOut, amountIn, minAmountOut, deadline);
      
      logger.info('LimitOrder createOrder transaction sent', {
        chainId: this.chainId,
        txHash: tx.hash,
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
        minAmountOut: minAmountOut.toString()
      });

      const receipt = await waitForTransaction(this.chainId, tx.hash);
      
      // Extract orderId from logs
      const orderCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'OrderCreated';
        } catch {
          return false;
        }
      });

      let orderId = null;
      if (orderCreatedEvent) {
        const parsed = contract.interface.parseLog(orderCreatedEvent);
        orderId = parsed.args.orderId.toString();
      }

      return {
        success: true,
        txHash: tx.hash,
        orderId,
        receipt
      };
    } catch (error) {
      logger.error('Failed to create limit order', {
        chainId: this.chainId,
        error: error.message,
        tokenIn,
        tokenOut
      });
      throw error;
    }
  }

  async cancelOrder(orderId) {
    try {
      const contract = await this.getContractWithSigner();
      const tx = await contract.cancelOrder(orderId);
      
      logger.info('LimitOrder cancelOrder transaction sent', {
        chainId: this.chainId,
        txHash: tx.hash,
        orderId: orderId.toString()
      });

      const receipt = await waitForTransaction(this.chainId, tx.hash);
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      logger.error('Failed to cancel limit order', {
        chainId: this.chainId,
        error: error.message,
        orderId: orderId.toString()
      });
      throw error;
    }
  }

  async executeOrder(orderId, swapData) {
    try {
      const contract = await this.getContractWithSigner();
      const tx = await contract.executeOrder(orderId, swapData);
      
      logger.info('LimitOrder executeOrder transaction sent', {
        chainId: this.chainId,
        txHash: tx.hash,
        orderId: orderId.toString()
      });

      const receipt = await waitForTransaction(this.chainId, tx.hash);
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      logger.error('Failed to execute limit order', {
        chainId: this.chainId,
        error: error.message,
        orderId: orderId.toString()
      });
      throw error;
    }
  }

  async getOrder(orderId) {
    try {
      const contract = await this.getContract();
      const order = await contract.getOrder(orderId);
      
      return {
        user: order.user,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn.toString(),
        minAmountOut: order.minAmountOut.toString(),
        deadline: order.deadline.toString(),
        isActive: order.isActive
      };
    } catch (error) {
      logger.error('Failed to get order details', {
        chainId: this.chainId,
        error: error.message,
        orderId: orderId.toString()
      });
      throw error;
    }
  }

  async getUserOrders(userAddress) {
    try {
      const contract = await this.getContract();
      const orderIds = await contract.getUserOrders(userAddress);
      
      return orderIds.map(id => id.toString());
    } catch (error) {
      logger.error('Failed to get user orders', {
        chainId: this.chainId,
        error: error.message,
        userAddress
      });
      throw error;
    }
  }

  async generateReceipt(orderId) {
    try {
      const order = await this.getOrder(orderId);
      
      return {
        orderId: orderId.toString(),
        chainId: this.chainId,
        user: order.user,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn,
        minAmountOut: order.minAmountOut,
        deadline: order.deadline,
        isActive: order.isActive,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to generate receipt', {
        chainId: this.chainId,
        error: error.message,
        orderId: orderId.toString()
      });
      throw error;
    }
  }
}

/**
 * Factory function to create LimitOrder manager
 */
function createLimitOrderManager(chainId) {
  return new LimitOrderManager(chainId);
}

module.exports = {
  getProvider,
  getSigner,
  getContract,
  getContractWithSigner,
  waitForTransaction,
  clearCache,
  clearContractCache,
  createLimitOrderManager,
  LimitOrderManager
};
