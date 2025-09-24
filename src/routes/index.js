const express = require('express');
const router = express.Router();
const { formatResponse } = require('../utils/helpers');

// Health check
router.get('/health', (req, res) => {
  res.json(formatResponse(true, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }));
});

// API info
router.get('/', (req, res) => {
  res.json(formatResponse(true, {
    name: 'EVM Multichain Wallet Core API',
    version: '1.0.0',
    description: 'Multi-chain wallet API for EVM and Sui networks',
    endpoints: {
      evm: {
        balance: 'GET /api/evm/balance/:address?chain={eth|polygon|bsc}',
        transactions: 'GET /api/evm/txs/:address?chain={eth|polygon|bsc}&limit=10',
        sendTx: 'POST /api/evm/sendTx',
        gas: 'GET /api/evm/gas/:chain',
        chains: 'GET /api/evm/chains'
      },
      sui: {
        balance: 'GET /api/sui/balance/:owner',
        balances: 'GET /api/sui/balances/:owner',
        object: 'GET /api/sui/object/:id',
        objects: 'GET /api/sui/objects/:owner?type=&limit=50',
        transactions: 'GET /api/sui/txs/:address?limit=10',
        moveCall: 'POST /api/sui/relay/movecall',
        dryRun: 'POST /api/sui/dryrun'
      }
    }
  }));
});

module.exports = router;