/**
 * Backward compatibility export
 * Import new configuration modules
 */

const { config } = require('./env');
const { chains, getChainById } = require('./chains');
const { logger } = require('./logger');

// Export for backward compatibility with old code
module.exports = config;

// Also export new modules for convenience
module.exports.chains = chains;
module.exports.getChainById = getChainById;
module.exports.logger = logger;