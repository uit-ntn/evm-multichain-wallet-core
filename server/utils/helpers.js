import { ethers } from "ethers";

export const formatResponse = (success, data, message = null) => {
  const response = { success };
  if (success) response.data = data;
  else response.error = data;
  if (message) response.message = message;
  return response;
};

export const isValidAddress = (address, type = "evm") => {
  if (type === "evm") return ethers.isAddress(address);
  if (type === "sui") return /^0x[a-fA-F0-9]{64}$/.test(address);
  return false;
};

export const formatBalance = (balance, decimals = 18, symbol = "") => {
  const formatted = ethers.formatUnits(balance, decimals);
  return {
    raw: balance.toString(),
    formatted: parseFloat(formatted).toFixed(6),
    symbol,
  };
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Verify EIP-712 signature
 */
export async function verifyEIP712Signature(typedData, signature) {
  try {
    const { domain, types, message } = typedData;
    const recovered = ethers.verifyTypedData(domain, types, message, signature);
    return recovered.toLowerCase();
  } catch (err) {
    console.error("Signature verification failed:", err.message);
    return null;
  }
}
