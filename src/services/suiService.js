const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const config = require('../config');
const { formatSuiBalance } = require('../utils/helpers');

class SuiService {
  constructor() {
    this.client = new SuiClient({
      url: config.sui.rpcUrl
    });
  }

  async getBalance(owner) {
    try {
      const balance = await this.client.getBalance({
        owner: owner,
        coinType: '0x2::sui::SUI'
      });

      return formatSuiBalance(balance.totalBalance);
    } catch (error) {
      throw new Error(`Failed to get SUI balance: ${error.message}`);
    }
  }

  async getAllBalances(owner) {
    try {
      const balances = await this.client.getAllBalances({
        owner: owner
      });

      return balances.map(balance => ({
        coinType: balance.coinType,
        totalBalance: balance.totalBalance,
        formatted: balance.coinType === '0x2::sui::SUI' 
          ? formatSuiBalance(balance.totalBalance)
          : {
              raw: balance.totalBalance,
              formatted: balance.totalBalance,
              symbol: 'UNKNOWN'
            }
      }));
    } catch (error) {
      throw new Error(`Failed to get all balances: ${error.message}`);
    }
  }

  async getObject(objectId) {
    try {
      const object = await this.client.getObject({
        id: objectId,
        options: {
          showContent: true,
          showType: true,
          showOwner: true,
          showPreviousTransaction: true
        }
      });

      if (!object.data) {
        throw new Error('Object not found');
      }

      // Extract fields from object content
      let fields = {};
      if (object.data.content && object.data.content.fields) {
        fields = object.data.content.fields;
      }

      return {
        objectId: object.data.objectId,
        version: object.data.version,
        type: object.data.type,
        owner: object.data.owner,
        previousTransaction: object.data.previousTransaction,
        fields: fields
      };
    } catch (error) {
      throw new Error(`Failed to get object: ${error.message}`);
    }
  }

  async getOwnedObjects(owner, options = {}) {
    try {
      const objects = await this.client.getOwnedObjects({
        owner: owner,
        options: {
          showType: true,
          showContent: true,
          showOwner: true,
          ...options
        }
      });

      return objects.data.map(obj => ({
        objectId: obj.data.objectId,
        version: obj.data.version,
        type: obj.data.type,
        owner: obj.data.owner,
        fields: obj.data.content?.fields || {}
      }));
    } catch (error) {
      throw new Error(`Failed to get owned objects: ${error.message}`);
    }
  }

  async getTransactionHistory(address, limit = 10) {
    try {
      const transactions = await this.client.queryTransactionBlocks({
        filter: {
          FromOrToAddress: {
            addr: address
          }
        },
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true
        },
        limit: limit,
        order: 'descending'
      });

      return this.formatTransactionHistory(transactions.data);
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  formatTransactionHistory(transactions) {
    return transactions.map(tx => ({
      digest: tx.digest,
      timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : null,
      sender: tx.transaction?.data?.sender,
      gasUsed: tx.effects?.gasUsed,
      status: tx.effects?.status?.status === 'success' ? 'success' : 'failed',
      balanceChanges: tx.balanceChanges?.map(change => ({
        owner: change.owner,
        coinType: change.coinType,
        amount: change.amount
      })) || [],
      objectChanges: tx.objectChanges?.length || 0,
      events: tx.events?.length || 0
    }));
  }

  async executeTransactionBlock(transactionBlock, signer) {
    try {
      // This would be used for server-owned transactions only
      // For user transactions, the frontend should sign and submit
      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock,
        signer,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showBalanceChanges: true
        }
      });

      return {
        digest: result.digest,
        effects: result.effects,
        objectChanges: result.objectChanges,
        balanceChanges: result.balanceChanges
      };
    } catch (error) {
      throw new Error(`Failed to execute transaction: ${error.message}`);
    }
  }

  async dryRunTransaction(transactionBlock) {
    try {
      const result = await this.client.dryRunTransactionBlock({
        transactionBlock: transactionBlock
      });

      return {
        effects: result.effects,
        events: result.events,
        objectChanges: result.objectChanges,
        balanceChanges: result.balanceChanges
      };
    } catch (error) {
      throw new Error(`Failed to dry run transaction: ${error.message}`);
    }
  }

  // Helper method to create a Move call transaction
  createMoveCallTransaction(target, args = [], typeArgs = []) {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target,
      arguments: args,
      typeArguments: typeArgs
    });

    return tx;
  }
}

module.exports = new SuiService();