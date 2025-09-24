const { ethers } = require('ethers');

const formatResponse = (success, data, message = null) => {
  const response = { success };
  
  if (success) {
    response.data = data;
  } else {
    response.error = data;
  }
  
  if (message) {
    response.message = message;
  }
  
  return response;
};

const isValidAddress = (address, type = 'evm') => {
  if (type === 'evm') {
    return ethers.isAddress(address);
  }
  
  if (type === 'sui') {
    // Basic Sui address validation (0x followed by 64 hex characters)
    const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/;
    return suiAddressRegex.test(address);
  }
  
  return false;
};

const formatBalance = (balance, decimals = 18, symbol = '') => {
  const formatted = ethers.formatUnits(balance, decimals);
  return {
    raw: balance.toString(),
    formatted: parseFloat(formatted).toFixed(6),
    symbol
  };
};

const formatSuiBalance = (balance) => {
  // SUI has 9 decimals, balance is in MIST
  const sui = parseFloat(balance) / 1000000000;
  return {
    raw: balance.toString(),
    formatted: sui.toFixed(6),
    symbol: 'SUI'
  };
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  formatResponse,
  isValidAddress,
  formatBalance,
  formatSuiBalance,
  delay
};