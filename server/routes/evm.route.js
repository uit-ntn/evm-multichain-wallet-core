/**
 * @openapi
 * tags:
 *   - name: EVM
 *     description: EVM-related helper endpoints (balance, txs, gas)
 */

// const express = require('express');
// const router = express.Router();
// const evmService = require('../services/evmService');
// const { formatResponse, isValidAddress } = require('../utils/helpers');

// // GET /evm/balance/:address
// router.get('/balance/:address', async (req, res, next) => {
//   try {
//     const { address } = req.params;
//     const { chain = 'eth' } = req.query;

//     // Validate address
//     if (!isValidAddress(address, 'evm')) {
//       return res.status(400).json(
//         formatResponse(false, 'Invalid EVM address')
//       );
//     }

//     const balance = await evmService.getBalance(address, chain);
    
//     res.json(formatResponse(true, balance));
//   } catch (error) {
//     next(error);
//   }
// });

// // GET /evm/txs/:address
// router.get('/txs/:address', async (req, res, next) => {
//   try {
//     const { address } = req.params;
//     const { chain = 'eth', limit = 10 } = req.query;

//     // Validate address
//     if (!isValidAddress(address, 'evm')) {
//       return res.status(400).json(
//         formatResponse(false, 'Invalid EVM address')
//       );
//     }

//     // Validate limit
//     const parsedLimit = parseInt(limit);
//     if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
//       return res.status(400).json(
//         formatResponse(false, 'Limit must be between 1 and 100')
//       );
//     }

//     const transactions = await evmService.getTransactionHistory(address, chain, parsedLimit);
    
//     res.json(formatResponse(true, transactions));
//   } catch (error) {
//     next(error);
//   }
// });

// // POST /evm/sendTx (optional - if you want to support transaction broadcasting)
// router.post('/sendTx', async (req, res, next) => {
//   try {
//     const { signedTransaction, chain = 'eth' } = req.body;

//     if (!signedTransaction) {
//       return res.status(400).json(
//         formatResponse(false, 'Signed transaction is required')
//       );
//     }

//     const result = await evmService.sendTransaction(signedTransaction, chain);
    
//     res.json(formatResponse(true, result));
//   } catch (error) {
//     next(error);
//   }
// });

// // GET /evm/gas/:chain
// router.get('/gas/:chain?', async (req, res, next) => {
//   try {
//     const { chain = 'eth' } = req.params;

//     const gasPrice = await evmService.getGasPrice(chain);
    
//     res.json(formatResponse(true, gasPrice));
//   } catch (error) {
//     next(error);
//   }
// });

// // GET /evm/chains
// router.get('/chains', (req, res) => {
//   const config = require('../config');
//   const chains = Object.keys(config.evm.networks).map(key => ({
//     key,
//     ...config.evm.networks[key]
//   }));
  
//   res.json(formatResponse(true, chains));
// });

// module.exports = router;