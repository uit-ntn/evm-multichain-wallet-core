/**
 * Blockchain Event Listener
 * Listens to blockchain events and processes them
 */

const { getEnabledChains, getContract } = require('../adapters/blockchain.adapter');
const { logger } = require('../adapters/logger.adapter');

/**
 * Active listeners registry
 */
const activeListeners = new Map();

/**
 * Basic contract ABI for events (placeholder)
 * In production, load from artifacts/
 */
const LIMIT_ORDER_ABI = [
  'event OrderCreated(uint256 indexed orderId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)',
  'event OrderCancelled(uint256 indexed orderId, address indexed user)',
  'event OrderFilled(uint256 indexed orderId, address indexed user, uint256 amountOut, address filler)',
];

/**
 * Start listening to events for all enabled chains
 */
async function startAllListeners() {
  const enabledChains = getEnabledChains();
  
  if (enabledChains.length === 0) {
    logger.warn('No enabled chains found, skipping event listeners');
    return;
  }
  
  logger.info('Starting blockchain event listeners', {
    chains: enabledChains.map(c => `${c.name} (${c.chainId})`),
  });
  
  for (const chain of enabledChains) {
    try {
      await startListenerForChain(chain);
    } catch (error) {
      logger.error('Failed to start listener for chain', {
        chainId: chain.chainId,
        chainName: chain.name,
        error: error.message,
      });
    }
  }
  
  logger.info('Blockchain listeners started', { 
    active: activeListeners.size 
  });
}

/**
 * Start listener for a specific chain
 */
async function startListenerForChain(chain) {
  const chainLogger = logger.child({ 
    chainId: chain.chainId, 
    chainName: chain.name 
  });
  
  chainLogger.info('Starting listener for chain');
  
  try {
    // Get LimitOrder contract (if configured)
    let limitOrderContract = null;
    try {
      limitOrderContract = getContract(chain.chainId, 'limitOrder', LIMIT_ORDER_ABI);
      chainLogger.info('LimitOrder contract found, setting up event listeners');
    } catch (error) {
      chainLogger.warn('LimitOrder contract not configured, skipping order events');
    }
    
    const listeners = [];
    
    // Setup OrderCreated listener
    if (limitOrderContract) {
      const orderCreatedListener = limitOrderContract.on(
        'OrderCreated',
        async (orderId, user, tokenIn, tokenOut, amountIn, minAmountOut, event) => {
          try {
            chainLogger.info('OrderCreated event received', {
              orderId: orderId.toString(),
              user,
              tokenIn,
              tokenOut,
              txHash: event.log.transactionHash,
              blockNumber: event.log.blockNumber,
            });
            
            // TODO: Process order creation
            // await processOrderCreated({
            //   chainId: chain.chainId,
            //   orderId: orderId.toString(),
            //   user,
            //   tokenIn,
            //   tokenOut,
            //   amountIn: amountIn.toString(),
            //   minAmountOut: minAmountOut.toString(),
            //   txHash: event.log.transactionHash,
            //   blockNumber: event.log.blockNumber,
            // });
            
          } catch (error) {
            chainLogger.error('Error processing OrderCreated event', {
              error: error.message,
              orderId: orderId.toString(),
            });
          }
        }
      );
      
      listeners.push({ name: 'OrderCreated', listener: orderCreatedListener });
      
      // Setup OrderCancelled listener
      const orderCancelledListener = limitOrderContract.on(
        'OrderCancelled',
        async (orderId, user, event) => {
          try {
            chainLogger.info('OrderCancelled event received', {
              orderId: orderId.toString(),
              user,
              txHash: event.log.transactionHash,
            });
            
            // TODO: Process order cancellation
            // await processOrderCancelled({
            //   chainId: chain.chainId,
            //   orderId: orderId.toString(),
            //   user,
            //   txHash: event.log.transactionHash,
            // });
            
          } catch (error) {
            chainLogger.error('Error processing OrderCancelled event', {
              error: error.message,
              orderId: orderId.toString(),
            });
          }
        }
      );
      
      listeners.push({ name: 'OrderCancelled', listener: orderCancelledListener });
      
      // Setup OrderFilled listener
      const orderFilledListener = limitOrderContract.on(
        'OrderFilled',
        async (orderId, user, amountOut, filler, event) => {
          try {
            chainLogger.info('OrderFilled event received', {
              orderId: orderId.toString(),
              user,
              amountOut: amountOut.toString(),
              filler,
              txHash: event.log.transactionHash,
            });
            
            // TODO: Process order fill
            // await processOrderFilled({
            //   chainId: chain.chainId,
            //   orderId: orderId.toString(),
            //   user,
            //   amountOut: amountOut.toString(),
            //   filler,
            //   txHash: event.log.transactionHash,
            // });
            
          } catch (error) {
            chainLogger.error('Error processing OrderFilled event', {
              error: error.message,
              orderId: orderId.toString(),
            });
          }
        }
      );
      
      listeners.push({ name: 'OrderFilled', listener: orderFilledListener });
    }
    
    // Store listeners for cleanup
    activeListeners.set(chain.chainId, {
      chainId: chain.chainId,
      chainName: chain.name,
      contract: limitOrderContract,
      listeners,
      startedAt: new Date(),
    });
    
    chainLogger.info('Listener started successfully', {
      eventsCount: listeners.length,
    });
    
  } catch (error) {
    chainLogger.error('Error starting listener', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Stop all listeners
 */
async function stopAllListeners() {
  logger.info('Stopping all blockchain listeners');
  
  for (const [chainId, listenerInfo] of activeListeners.entries()) {
    try {
      // Remove all event listeners
      if (listenerInfo.contract) {
        listenerInfo.contract.removeAllListeners();
      }
      
      logger.info('Listener stopped', { 
        chainId,
        chainName: listenerInfo.chainName,
      });
    } catch (error) {
      logger.error('Error stopping listener', { 
        chainId,
        error: error.message 
      });
    }
  }
  
  activeListeners.clear();
  logger.info('All blockchain listeners stopped');
}

/**
 * Get listener status
 */
function getListenersStatus() {
  const status = [];
  
  for (const [chainId, listenerInfo] of activeListeners.entries()) {
    status.push({
      chainId,
      chainName: listenerInfo.chainName,
      active: true,
      eventsCount: listenerInfo.listeners.length,
      startedAt: listenerInfo.startedAt,
      uptime: Date.now() - listenerInfo.startedAt.getTime(),
    });
  }
  
  return status;
}

/**
 * Restart listener for a specific chain
 */
async function restartListenerForChain(chainId) {
  logger.info('Restarting listener for chain', { chainId });
  
  // Stop existing listener
  const existingListener = activeListeners.get(chainId);
  if (existingListener) {
    if (existingListener.contract) {
      existingListener.contract.removeAllListeners();
    }
    activeListeners.delete(chainId);
  }
  
  // Find chain config and restart
  const enabledChains = getEnabledChains();
  const chain = enabledChains.find(c => c.chainId === chainId);
  
  if (!chain) {
    throw new Error(`Chain ${chainId} not found in enabled chains`);
  }
  
  await startListenerForChain(chain);
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, stopping blockchain listeners');
  await stopAllListeners();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, stopping blockchain listeners');
  await stopAllListeners();
});

module.exports = {
  startAllListeners,
  stopAllListeners,
  getListenersStatus,
  restartListenerForChain,
  activeListeners,
};
