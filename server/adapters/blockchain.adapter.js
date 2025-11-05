/**
 * Blockchain Adapter (CommonJS)
 * Handles blockchain interactions and provider caching
 */

const { ethers } = require("ethers");
const { config, getEnabledChains, getChainById } = require("./config.adapter");
const { logger, logBlockchainTransaction } = require("./logger.adapter");

const providerCache = new Map();
const contractCache = new Map();

function getProvider(chainId) {
  if (providerCache.has(chainId)) return providerCache.get(chainId);

  const chain = getChainById(chainId);
  if (!chain || !chain.rpc) {
    throw new Error(`RPC for chain ${chainId} not configured`);
  }

  // ✅ ethers v5 dùng ethers.providers.JsonRpcProvider
  const provider = new ethers.providers.JsonRpcProvider(chain.rpc, {
    chainId,
    name: chain.name,
  });

  providerCache.set(chainId, provider);
  return provider;
}

function getSigner(chainId) {
  if (!config.privateKey) throw new Error("PRIVATE_KEY not set");
  const provider = getProvider(chainId);
  return new ethers.Wallet(config.privateKey, provider);
}

function getContract(chainId, contractName, abi) {
  const key = `${chainId}-${contractName}`;
  if (contractCache.has(key)) return contractCache.get(key);

  const chainName = chainId === 11155111 ? "sepolia" : "polygon";
  const address = config.contracts?.[chainName]?.[contractName];
  if (!address) throw new Error(`Contract ${contractName} missing for chain ${chainId}`);

  const contract = new ethers.Contract(address, abi, getProvider(chainId));
  contractCache.set(key, contract);
  return contract;
}

function getContractWithSigner(chainId, contractName, abi) {
  const contract = getContract(chainId, contractName, abi);
  const signer = getSigner(chainId);
  return contract.connect(signer);
}

async function waitForTransaction(chainId, txHash, confirmations = 1) {
  const provider = getProvider(chainId);
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  const status = receipt.status === 1 ? "SUCCESS" : "FAILED";
  logBlockchainTransaction(chainId, txHash, status);
  return receipt;
}

function clearCache() {
  providerCache.clear();
  contractCache.clear();
  logger.info("Blockchain caches cleared");
}

module.exports = {
  getProvider,
  getSigner,
  getContract,
  getContractWithSigner,
  waitForTransaction,
  clearCache,
};
