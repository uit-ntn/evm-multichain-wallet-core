/**
 * Blockchain Adapter (ESM)
 * Handles blockchain interactions and provider caching
 */

import { ethers } from "ethers";
import { config, getEnabledChains, getChainById } from "./config.adapter.js";
import { logger, logBlockchainTransaction } from "./logger.adapter.js";

const providerCache = new Map();
const contractCache = new Map();

export function getProvider(chainId) {
  if (providerCache.has(chainId)) return providerCache.get(chainId);
  const chain = getChainById(chainId);
  if (!chain?.rpc) throw new Error(`RPC for chain ${chainId} not configured`);

  const provider = new ethers.JsonRpcProvider(chain.rpc, { chainId, name: chain.name });
  providerCache.set(chainId, provider);
  return provider;
}

export function getSigner(chainId) {
  if (!config.privateKey) throw new Error("PRIVATE_KEY not set");
  const provider = getProvider(chainId);
  return new ethers.Wallet(config.privateKey, provider);
}

export function getContract(chainId, contractName, abi) {
  const key = `${chainId}-${contractName}`;
  if (contractCache.has(key)) return contractCache.get(key);

  const chainName = chainId === 11155111 ? "sepolia" : "polygon";
  const address = config.contracts[chainName]?.[contractName];
  if (!address) throw new Error(`Contract ${contractName} missing for chain ${chainId}`);

  const contract = new ethers.Contract(address, abi, getProvider(chainId));
  contractCache.set(key, contract);
  return contract;
}

export function getContractWithSigner(chainId, contractName, abi) {
  return getContract(chainId, contractName, abi).connect(getSigner(chainId));
}

export async function waitForTransaction(chainId, txHash, confirmations = 1) {
  const provider = getProvider(chainId);
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  const status = receipt.status === 1 ? "SUCCESS" : "FAILED";
  logBlockchainTransaction(chainId, txHash, status);
  return receipt;
}

export function clearCache() {
  providerCache.clear();
  contractCache.clear();
  logger.info("Blockchain caches cleared");
}
