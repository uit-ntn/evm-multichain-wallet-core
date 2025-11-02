// const express = require('express');
// const router = express.Router();
// const suiService = require('../services/suiService');
// const { formatResponse, isValidAddress } = require('../utils/helpers');

// // GET /sui/balance/:owner
// router.get('/balance/:owner', async (req, res, next) => {
//   try {
//     const { owner } = req.params;

//     // Validate Sui address
//     if (!isValidAddress(owner, 'sui')) {
//       return res.status(400).json(
//         formatResponse(false, 'Invalid Sui address')
//       );
//     }

//     const balance = await suiService.getBalance(owner);
    
//     res.json(formatResponse(true, balance));
//   } catch (error) {
//     next(error);
//   }
// });

// // GET /sui/balances/:owner (all coin types)
// router.get('/balances/:owner', async (req, res, next) => {
//   try {
//     const { owner } = req.params;

//     // Validate Sui address
//     if (!isValidAddress(owner, 'sui')) {
//       return res.status(400).json(
//         formatResponse(false, 'Invalid Sui address')
//       );
//     }

//     const balances = await suiService.getAllBalances(owner);
    
//     res.json(formatResponse(true, balances));
//   } catch (error) {
//     next(error);
//   }
// });

// // GET /sui/object/:id
// router.get('/object/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     if (!id || id.length < 10) {
//       return res.status(400).json(
//         formatResponse(false, 'Invalid object ID')
//       );
//     }

//     const object = await suiService.getObject(id);
    
//     res.json(formatResponse(true, object));
//   } catch (error) {
//     next(error);
//   }
// });

// // GET /sui/objects/:owner (owned objects)
// router.get('/objects/:owner', async (req, res, next) => {
//   try {
//     const { owner } = req.params;
//     const { type, limit = 50 } = req.query;

//     // Validate Sui address
//     if (!isValidAddress(owner, 'sui')) {
//       return res.status(400).json(
//         formatResponse(false, 'Invalid Sui address')
//       );
//     }

//     // Validate limit
//     const parsedLimit = parseInt(limit);
//     if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
//       return res.status(400).json(
//         formatResponse(false, 'Limit must be between 1 and 200')
//       );
//     }

//     const options = { limit: parsedLimit };
//     if (type) {
//       options.filter = { StructType: type };
//     }

//     const objects = await suiService.getOwnedObjects(owner, options);
    
//     res.json(formatResponse(true, objects));
//   } catch (error) {
//     next(error);
//   }
// });

// // GET /sui/txs/:address
// router.get('/txs/:address', async (req, res, next) => {
//   try {
//     const { address } = req.params;
//     const { limit = 10 } = req.query;

//     // Validate Sui address
//     if (!isValidAddress(address, 'sui')) {
//       return res.status(400).json(
//         formatResponse(false, 'Invalid Sui address')
//       );
//     }

//     // Validate limit
//     const parsedLimit = parseInt(limit);
//     if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
//       return res.status(400).json(
//         formatResponse(false, 'Limit must be between 1 and 100')
//       );
//     }

//     const transactions = await suiService.getTransactionHistory(address, parsedLimit);
    
//     res.json(formatResponse(true, transactions));
//   } catch (error) {
//     next(error);
//   }
// });

// // POST /sui/relay/movecall (server-owned transactions only)
// router.post('/relay/movecall', async (req, res, next) => {
//   try {
//     const { target, args = [], typeArgs = [], dryRun = false } = req.body;

//     if (!target) {
//       return res.status(400).json(
//         formatResponse(false, 'Move call target is required')
//       );
//     }

//     const transaction = suiService.createMoveCallTransaction(target, args, typeArgs);

//     if (dryRun) {
//       // Dry run the transaction
//       const result = await suiService.dryRunTransaction(transaction);
//       res.json(formatResponse(true, result));
//     } else {
//       // Note: This would require a server-owned signer
//       // In production, you should implement proper authentication and authorization
//       return res.status(501).json(
//         formatResponse(false, 'Server-side transaction execution not implemented. Use dry run or implement with proper signer.')
//       );
//     }
    
//   } catch (error) {
//     next(error);
//   }
// });

// // POST /sui/dryrun
// router.post('/dryrun', async (req, res, next) => {
//   try {
//     const { transactionBlock } = req.body;

//     if (!transactionBlock) {
//       return res.status(400).json(
//         formatResponse(false, 'Transaction block is required')
//       );
//     }

//     const result = await suiService.dryRunTransaction(transactionBlock);
    
//     res.json(formatResponse(true, result));
//   } catch (error) {
//     next(error);
//   }
// });

// module.exports = router;