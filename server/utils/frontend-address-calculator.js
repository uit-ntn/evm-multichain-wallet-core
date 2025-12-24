/**
 * Frontend Address Calculator
 * Lightweight utility for calculating deterministic contract addresses in frontend
 * Can be copied to frontend projects (React, Vue, etc.)
 */

// ==================== CONSTANTS ====================

// Fixed salts for deterministic deployment - NEVER CHANGE THESE
const REGISTRY_SALT = "0x4556494d2d4d554c5449434841494e2d57414c4c45542d434f52452d5245474953545259";

// Known CREATE2 Factory addresses (update after deployment)
const FACTORY_ADDRESSES = {
  1: "0x0000000000000000000000000000000000000000", // Mainnet
  11155111: "0x0000000000000000000000000000000000000000", // Sepolia
  80002: "0x0000000000000000000000000000000000000000", // Polygon Amoy
  97: "0x0000000000000000000000000000000000000000", // BSC Testnet
};

// Registry bytecode hash (computed once, update after first deployment)
const REGISTRY_BYTECODE_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

// ==================== UTILITY FUNCTIONS ====================

/**
 * Keccak256 hash function (requires ethers.js or web3.js)
 * @param {string} data - Data to hash
 * @returns {string} Hash result
 */
function keccak256(data) {
  // This assumes ethers.js is available
  // For web3.js, use: web3.utils.keccak256(data)
  if (typeof window !== 'undefined' && window.ethers) {
    return window.ethers.utils.keccak256(data);
  } else if (typeof require !== 'undefined') {
    const { ethers } = require('ethers');
    return ethers.utils.keccak256(data);
  } else {
    throw new Error('Ethers.js or Web3.js required for keccak256');
  }
}

/**
 * Solidity pack function
 * @param {Array} types - Array of types
 * @param {Array} values - Array of values
 * @returns {string} Packed data
 */
function solidityPack(types, values) {
  if (typeof window !== 'undefined' && window.ethers) {
    return window.ethers.utils.solidityPack(types, values);
  } else if (typeof require !== 'undefined') {
    const { ethers } = require('ethers');
    return ethers.utils.solidityPack(types, values);
  } else {
    throw new Error('Ethers.js required for solidityPack');
  }
}

/**
 * Get address from hash
 * @param {string} hash - Hash to convert to address
 * @returns {string} Address
 */
function getAddress(hash) {
  if (typeof window !== 'undefined' && window.ethers) {
    return window.ethers.utils.getAddress("0x" + hash.slice(-40));
  } else if (typeof require !== 'undefined') {
    const { ethers } = require('ethers');
    return ethers.utils.getAddress("0x" + hash.slice(-40));
  } else {
    throw new Error('Ethers.js required for getAddress');
  }
}

/**
 * Check if address is valid
 * @param {string} address - Address to check
 * @returns {boolean} True if valid
 */
function isAddress(address) {
  if (typeof window !== 'undefined' && window.ethers) {
    return window.ethers.utils.isAddress(address);
  } else if (typeof require !== 'undefined') {
    const { ethers } = require('ethers');
    return ethers.utils.isAddress(address);
  } else {
    // Basic validation without ethers
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

// ==================== CORE FUNCTIONS ====================

/**
 * Compute CREATE2 address
 * @param {string} factoryAddress - The CREATE2 factory address
 * @param {string} salt - The salt for deployment
 * @param {string} bytecodeHash - The keccak256 hash of the bytecode
 * @returns {string} The computed address
 */
function computeCreate2Address(factoryAddress, salt, bytecodeHash) {
  if (!isAddress(factoryAddress)) {
    throw new Error('Invalid factory address');
  }
  
  if (!salt.startsWith('0x') || salt.length !== 66) {
    throw new Error('Invalid salt format');
  }
  
  if (!bytecodeHash.startsWith('0x') || bytecodeHash.length !== 66) {
    throw new Error('Invalid bytecode hash format');
  }

  const hash = keccak256(
    solidityPack(
      ["bytes1", "address", "bytes32", "bytes32"],
      ["0xff", factoryAddress, salt, bytecodeHash]
    )
  );
  
  return getAddress("0x" + hash.slice(-40));
}

/**
 * Calculate Registry address for a given chain
 * @param {number} chainId - The chain ID
 * @param {string} [factoryAddress] - Optional factory address
 * @returns {string} The Registry address
 */
function calculateRegistryAddress(chainId, factoryAddress = null) {
  const factory = factoryAddress || FACTORY_ADDRESSES[chainId];
  
  if (!factory || factory === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Factory address not configured for chain ${chainId}`);
  }
  
  if (REGISTRY_BYTECODE_HASH === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    throw new Error('Registry bytecode hash not set. Update REGISTRY_BYTECODE_HASH after first deployment.');
  }
  
  return computeCreate2Address(factory, REGISTRY_SALT, REGISTRY_BYTECODE_HASH);
}

/**
 * Calculate Registry addresses for all supported chains
 * @returns {Object} Object mapping chain IDs to Registry addresses
 */
function calculateAllRegistryAddresses() {
  const addresses = {};
  
  for (const [chainId, factoryAddress] of Object.entries(FACTORY_ADDRESSES)) {
    if (factoryAddress && factoryAddress !== "0x0000000000000000000000000000000000000000") {
      try {
        addresses[chainId] = calculateRegistryAddress(parseInt(chainId));
      } catch (error) {
        console.warn(`Could not calculate Registry address for chain ${chainId}:`, error.message);
      }
    }
  }
  
  return addresses;
}

/**
 * Get chain name from chain ID
 * @param {number} chainId - The chain ID
 * @returns {string} The chain name
 */
function getChainName(chainId) {
  const chainNames = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia',
    80002: 'Polygon Amoy',
    97: 'BSC Testnet',
    137: 'Polygon Mainnet',
    56: 'BSC Mainnet'
  };
  
  return chainNames[chainId] || `Chain ${chainId}`;
}

/**
 * Check if chain is supported
 * @param {number} chainId - The chain ID
 * @returns {boolean} True if supported
 */
function isChainSupported(chainId) {
  const factory = FACTORY_ADDRESSES[chainId];
  return factory && factory !== "0x0000000000000000000000000000000000000000";
}

/**
 * Get supported chains
 * @returns {Array} Array of supported chain objects
 */
function getSupportedChains() {
  return Object.entries(FACTORY_ADDRESSES)
    .filter(([, address]) => address !== "0x0000000000000000000000000000000000000000")
    .map(([chainId, factoryAddress]) => ({
      chainId: parseInt(chainId),
      name: getChainName(parseInt(chainId)),
      factoryAddress,
      registryAddress: calculateRegistryAddress(parseInt(chainId))
    }));
}

// ==================== REACT HOOKS (Optional) ====================

/**
 * React hook for Registry address (if using React)
 * @param {number} chainId - The chain ID
 * @returns {Object} Hook result with address, loading, error
 */
function useRegistryAddress(chainId) {
  // This is a basic example - adapt to your React setup
  if (typeof window === 'undefined' || !window.React) {
    return { address: null, loading: false, error: 'React not available' };
  }
  
  const [state, setState] = window.React.useState({
    address: null,
    loading: true,
    error: null
  });
  
  window.React.useEffect(() => {
    try {
      if (!chainId) {
        setState({ address: null, loading: false, error: 'No chain ID provided' });
        return;
      }
      
      const address = calculateRegistryAddress(chainId);
      setState({ address, loading: false, error: null });
    } catch (error) {
      setState({ address: null, loading: false, error: error.message });
    }
  }, [chainId]);
  
  return state;
}

// ==================== EXPORTS ====================

// For Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeCreate2Address,
    calculateRegistryAddress,
    calculateAllRegistryAddresses,
    getChainName,
    isChainSupported,
    getSupportedChains,
    useRegistryAddress,
    
    // Constants
    REGISTRY_SALT,
    FACTORY_ADDRESSES,
    REGISTRY_BYTECODE_HASH
  };
}

// For browsers (global)
if (typeof window !== 'undefined') {
  window.AddressCalculator = {
    computeCreate2Address,
    calculateRegistryAddress,
    calculateAllRegistryAddresses,
    getChainName,
    isChainSupported,
    getSupportedChains,
    useRegistryAddress,
    
    // Constants
    REGISTRY_SALT,
    FACTORY_ADDRESSES,
    REGISTRY_BYTECODE_HASH
  };
}

// For ES6 modules
if (typeof exports !== 'undefined') {
  exports.computeCreate2Address = computeCreate2Address;
  exports.calculateRegistryAddress = calculateRegistryAddress;
  exports.calculateAllRegistryAddresses = calculateAllRegistryAddresses;
  exports.getChainName = getChainName;
  exports.isChainSupported = isChainSupported;
  exports.getSupportedChains = getSupportedChains;
  exports.useRegistryAddress = useRegistryAddress;
  
  exports.REGISTRY_SALT = REGISTRY_SALT;
  exports.FACTORY_ADDRESSES = FACTORY_ADDRESSES;
  exports.REGISTRY_BYTECODE_HASH = REGISTRY_BYTECODE_HASH;
}
