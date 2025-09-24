const { ethers } = require('ethers');
const axios = require('axios');
const config = require('../config');
const { formatBalance, delay } = require('../utils/helpers');

class EVMService {
  constructor() {
    this.providers = {};
    this.initializeProviders();
  }

  initializeProviders() {
    Object.keys(config.evm.networks).forEach(chain => {
      const network = config.evm.networks[chain];
      this.providers[chain] = new ethers.JsonRpcProvider(network.rpcUrl);
    });
  }

  getProvider(chain) {
    if (!this.providers[chain]) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    return this.providers[chain];
  }

  getNetworkConfig(chain) {
    if (!config.evm.networks[chain]) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    return config.evm.networks[chain];
  }

  async getBalance(address, chain = 'eth') {
    try {
      const provider = this.getProvider(chain);
      const network = this.getNetworkConfig(chain);
      
      const balance = await provider.getBalance(address);
      
      return formatBalance(balance, 18, network.symbol);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async getTransactionHistory(address, chain = 'eth', limit = 10) {
    try {
      const network = this.getNetworkConfig(chain);
      
      if (!network.apiKey) {
        // Fallback to basic RPC method (limited functionality)
        return await this.getTransactionHistoryFromRPC(address, chain, limit);
      }

      const response = await axios.get(network.explorerApi, {
        params: {
          module: 'account',
          action: 'txlist',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: limit,
          sort: 'desc',
          apikey: network.apiKey
        }
      });

      if (response.data.status !== '1') {
        throw new Error('Failed to fetch transaction history');
      }

      return this.formatTransactionHistory(response.data.result, network.symbol);
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  async getTransactionHistoryFromRPC(address, chain, limit) {
    // Basic implementation using RPC
    // This is limited and might not work for all chains
    try {
      const provider = this.getProvider(chain);
      const network = this.getNetworkConfig(chain);
      
      const latestBlock = await provider.getBlockNumber();
      const transactions = [];
      
      // This is a very basic implementation
      // In production, you'd want to use explorer APIs
      for (let i = 0; i < Math.min(10, limit); i++) {
        const block = await provider.getBlock(latestBlock - i, true);
        if (block && block.transactions) {
          const relevantTxs = block.transactions.filter(tx => 
            tx.to === address || tx.from === address
          );
          transactions.push(...relevantTxs);
        }
      }

      return this.formatTransactionHistory(transactions.slice(0, limit), network.symbol);
    } catch (error) {
      throw new Error(`RPC transaction history failed: ${error.message}`);
    }
  }

  formatTransactionHistory(transactions, symbol) {
    return transactions.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: formatBalance(tx.value || '0', 18, symbol),
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toISOString() : null,
      status: tx.isError === '0' ? 'success' : 'failed',
      blockNumber: tx.blockNumber
    }));
  }

  async sendTransaction(signedTransaction, chain = 'eth') {
    try {
      const provider = this.getProvider(chain);
      const tx = await provider.broadcastTransaction(signedTransaction);
      
      return {
        hash: tx.hash,
        status: 'pending'
      };
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  async getGasPrice(chain = 'eth') {
    try {
      const provider = this.getProvider(chain);
      const gasPrice = await provider.getFeeData();
      
      return {
        gasPrice: gasPrice.gasPrice?.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
      };
    } catch (error) {
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }
}

module.exports = new EVMService();