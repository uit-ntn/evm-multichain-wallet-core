/**
 * Address Calculator Utility
 * Computes deterministic contract addresses using CREATE2
 */

const { ethers } = require('ethers');

// ==================== CONSTANTS ====================

// Fixed salts for deterministic deployment - NEVER CHANGE THESE
const REGISTRY_SALT = "0x4556494d2d4d554c5449434841494e2d57414c4c45542d434f52452d5245474953545259"; // "EVIM-MULTICHAIN-WALLET-CORE-REGISTRY"
const FACTORY_SALT = "0x4556494d2d554c5449434841494e2d57414c4c45542d434f52452d464143544f5259"; // "EVIM-MULTICHAIN-WALLET-CORE-FACTORY"

// Known CREATE2 Factory addresses (deployed once per chain)
const FACTORY_ADDRESSES = {
  1: "0x0000000000000000000000000000000000000000", // Mainnet (placeholder)
  11155111: "0x0000000000000000000000000000000000000000", // Sepolia (placeholder)
  80002: "0x0000000000000000000000000000000000000000", // Polygon Amoy (placeholder)
  97: "0x0000000000000000000000000000000000000000", // BSC Testnet (placeholder)
};

// Registry bytecode hash (computed once, cached)
let REGISTRY_BYTECODE_HASH = null;

// ==================== CORE FUNCTIONS ====================

/**
 * Compute CREATE2 address
 * @param {string} factoryAddress - The CREATE2 factory address
 * @param {string} salt - The salt for deployment
 * @param {string} bytecodeHash - The keccak256 hash of the bytecode
 * @returns {string} The computed address
 */
function computeCreate2Address(factoryAddress, salt, bytecodeHash) {
  if (!ethers.utils.isAddress(factoryAddress)) {
    throw new Error('Invalid factory address');
  }
  
  if (!salt.startsWith('0x') || salt.length !== 66) {
    throw new Error('Invalid salt format');
  }
  
  if (!bytecodeHash.startsWith('0x') || bytecodeHash.length !== 66) {
    throw new Error('Invalid bytecode hash format');
  }

  const hash = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes1", "address", "bytes32", "bytes32"],
      ["0xff", factoryAddress, salt, bytecodeHash]
    )
  );
  
  return ethers.utils.getAddress("0x" + hash.slice(-40));
}

/**
 * Get Registry bytecode hash (cached)
 * @returns {string} The Registry bytecode hash
 */
function getRegistryBytecodeHash() {
  if (REGISTRY_BYTECODE_HASH) {
    return REGISTRY_BYTECODE_HASH;
  }
  
  // In a real deployment, this would be the actual Registry bytecode
  // For now, we'll compute it from the contract
  try {
    // This requires hardhat environment
    const hre = require('hardhat');
    const Registry = hre.ethers.getContractFactory('Registry');
    REGISTRY_BYTECODE_HASH = ethers.utils.keccak256(Registry.bytecode);
    return REGISTRY_BYTECODE_HASH;
  } catch (error) {
    // Fallback: use a pre-computed hash (should be updated after first deployment)
    console.warn('Could not compute Registry bytecode hash dynamically, using fallback');
    REGISTRY_BYTECODE_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000"; // Placeholder
    return REGISTRY_BYTECODE_HASH;
  }
}

/**
 * Calculate Registry address for a given chain
 * @param {number} chainId - The chain ID
 * @param {string} [factoryAddress] - Optional factory address (uses known address if not provided)
 * @returns {string} The Registry address
 */
function calculateRegistryAddress(chainId, factoryAddress = null) {
  const factory = factoryAddress || FACTORY_ADDRESSES[chainId];
  
  if (!factory || factory === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Factory address not configured for chain ${chainId}`);
  }
  
  const bytecodeHash = getRegistryBytecodeHash();
  return computeCreate2Address(factory, REGISTRY_SALT, bytecodeHash);
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
 * Verify if a Registry is deployed at the expected address
 * @param {Object} provider - Ethers provider
 * @param {number} chainId - The chain ID
 * @param {string} [factoryAddress] - Optional factory address
 * @returns {Promise<boolean>} True if Registry is deployed at expected address
 */
async function verifyRegistryDeployment(provider, chainId, factoryAddress = null) {
  try {
    const expectedAddress = calculateRegistryAddress(chainId, factoryAddress);
    const code = await provider.getCode(expectedAddress);
    return code !== "0x";
  } catch (error) {
    console.error('Error verifying Registry deployment:', error.message);
    return false;
  }
}

/**
 * Get Registry address with fallback logic
 * @param {number} chainId - The chain ID
 * @param {Object} [provider] - Optional provider for verification
 * @returns {Promise<string>} The Registry address
 */
async function getRegistryAddress(chainId, provider = null) {
  try {
    // First, try to calculate the deterministic address
    const calculatedAddress = calculateRegistryAddress(chainId);
    
    // If provider is available, verify the contract is actually deployed
    if (provider) {
      const isDeployed = await verifyRegistryDeployment(provider, chainId);
      if (!isDeployed) {
        throw new Error(`Registry not deployed at calculated address ${calculatedAddress}`);
      }
    }
    
    return calculatedAddress;
  } catch (error) {
    console.warn(`Could not get deterministic Registry address for chain ${chainId}:`, error.message);
    
    // Fallback to environment variable
    const envKey = getRegistryEnvKey(chainId);
    const envAddress = process.env[envKey];
    
    if (envAddress && ethers.utils.isAddress(envAddress)) {
      console.info(`Using Registry address from environment: ${envAddress}`);
      return envAddress;
    }
    
    throw new Error(`No Registry address available for chain ${chainId}`);
  }
}

/**
 * Get environment variable key for Registry address
 * @param {number} chainId - The chain ID
 * @returns {string} The environment variable key
 */
function getRegistryEnvKey(chainId) {
  const chainNames = {
    1: 'MAINNET',
    11155111: 'SEPOLIA',
    80002: 'POLYGON',
    97: 'BSC_TESTNET'
  };
  
  const chainName = chainNames[chainId] || `CHAIN_${chainId}`;
  return `REGISTRY_ADDRESS_${chainName}`;
}

/**
 * Update factory address for a chain
 * @param {number} chainId - The chain ID
 * @param {string} factoryAddress - The factory address
 */
function updateFactoryAddress(chainId, factoryAddress) {
  if (!ethers.utils.isAddress(factoryAddress)) {
    throw new Error('Invalid factory address');
  }
  
  FACTORY_ADDRESSES[chainId] = factoryAddress;
  console.info(`Updated factory address for chain ${chainId}: ${factoryAddress}`);
}

/**
 * Generate salt from string
 * @param {string} saltString - The string to convert to salt
 * @returns {string} The generated salt
 */
function generateSalt(saltString) {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(saltString));
}

/**
 * Get deployment info for debugging
 * @param {number} chainId - The chain ID
 * @returns {Object} Deployment information
 */
function getDeploymentInfo(chainId) {
  return {
    chainId,
    factoryAddress: FACTORY_ADDRESSES[chainId],
    registrySalt: REGISTRY_SALT,
    registryBytecodeHash: getRegistryBytecodeHash(),
    calculatedRegistryAddress: FACTORY_ADDRESSES[chainId] ? 
      calculateRegistryAddress(chainId) : null
  };
}

// ==================== EXPORTS ====================

module.exports = {
  // Core functions
  computeCreate2Address,
  calculateRegistryAddress,
  calculateAllRegistryAddresses,
  verifyRegistryDeployment,
  getRegistryAddress,
  
  // Utility functions
  updateFactoryAddress,
  generateSalt,
  getDeploymentInfo,
  getRegistryEnvKey,
  
  // Constants
  REGISTRY_SALT,
  FACTORY_SALT,
  FACTORY_ADDRESSES,
  
  // For testing/debugging
  getRegistryBytecodeHash
};
