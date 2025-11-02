/**
 * Logger Adapter
 * Centralized logging with Morgan HTTP logger and custom application logger
 */

const morgan = require('morgan');
const { config } = require('./config.adapter');

/**
 * Log levels
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

/**
 * Get current log level from config
 */
const currentLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;

/**
 * Colors for console output
 */
const colors = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[36m',  // Cyan
  debug: '\x1b[35m', // Magenta
  trace: '\x1b[37m', // White
  reset: '\x1b[0m',  // Reset
};

/**
 * Format log message
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  
  // Production: JSON format for structured logging
  if (config.nodeEnv === 'production') {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    });
  }
  
  // Development: Human-readable format with colors
  const color = colors[level] || colors.reset;
  const metaStr = Object.keys(meta).length > 0 
    ? `\n  ${JSON.stringify(meta, null, 2)}`
    : '';
  
  return `${color}[${timestamp}] ${level.toUpperCase()}:${colors.reset} ${message}${metaStr}`;
}

/**
 * Log function
 */
function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] <= currentLevel) {
    console.log(formatLog(level, message, meta));
  }
}

/**
 * Application Logger
 */
const logger = {
  error: (message, meta = {}) => log('error', message, meta),
  warn: (message, meta = {}) => log('warn', message, meta),
  info: (message, meta = {}) => log('info', message, meta),
  debug: (message, meta = {}) => log('debug', message, meta),
  trace: (message, meta = {}) => log('trace', message, meta),
  
  /**
   * Create child logger with default metadata
   */
  child: (defaultMeta = {}) => ({
    error: (message, meta = {}) => log('error', message, { ...defaultMeta, ...meta }),
    warn: (message, meta = {}) => log('warn', message, { ...defaultMeta, ...meta }),
    info: (message, meta = {}) => log('info', message, { ...defaultMeta, ...meta }),
    debug: (message, meta = {}) => log('debug', message, { ...defaultMeta, ...meta }),
    trace: (message, meta = {}) => log('trace', message, { ...defaultMeta, ...meta }),
  }),
};

/**
 * Morgan HTTP Logger Configuration
 */

// Custom Morgan format
const morganFormat = config.nodeEnv === 'production' 
  ? 'combined' // Standard Apache combined log format for production
  : 'dev';     // Colored output for development

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '-';
});

// Custom token for request ID (if available)
morgan.token('request-id', (req) => {
  return req.id || req.headers['x-request-id'] || '-';
});

// Custom format for JSON logging in production
const jsonFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  requestId: ':request-id',
});

/**
 * Morgan middleware configurations
 */
const httpLogger = morgan(
  config.nodeEnv === 'production' ? jsonFormat : morganFormat,
  {
    // Skip logging for health checks in production
    skip: (req, res) => {
      if (config.nodeEnv === 'production' && req.url === '/health') {
        return true;
      }
      return false;
    },
    
    // Custom stream for structured logging
    stream: {
      write: (message) => {
        if (config.nodeEnv === 'production') {
          try {
            const logData = JSON.parse(message.trim());
            logger.info('HTTP Request', logData);
          } catch (error) {
            logger.info('HTTP Request', { message: message.trim() });
          }
        } else {
          // In development, Morgan handles the formatting
          process.stdout.write(message);
        }
      }
    }
  }
);

/**
 * Error logger for Morgan
 */
const errorLogger = morgan(
  config.nodeEnv === 'production' ? jsonFormat : morganFormat,
  {
    // Only log error responses
    skip: (req, res) => res.statusCode < 400,
    
    stream: {
      write: (message) => {
        if (config.nodeEnv === 'production') {
          try {
            const logData = JSON.parse(message.trim());
            logger.error('HTTP Error', logData);
          } catch (error) {
            logger.error('HTTP Error', { message: message.trim() });
          }
        } else {
          process.stderr.write(message);
        }
      }
    }
  }
);

/**
 * Request ID middleware (for request tracing)
 */
function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || 
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * Response time middleware
 */
function responseTimeMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', duration);
  });
  
  next();
}

/**
 * Database query logger
 */
function logDatabaseQuery(collection, operation, query = {}, duration = 0) {
  logger.debug('Database Query', {
    collection,
    operation,
    query: JSON.stringify(query),
    duration: `${duration}ms`,
  });
}

/**
 * Blockchain transaction logger
 */
function logBlockchainTransaction(chainId, txHash, status, gasUsed = null) {
  logger.info('Blockchain Transaction', {
    chainId,
    txHash,
    status,
    gasUsed,
  });
}

/**
 * IPFS operation logger
 */
function logIpfsOperation(operation, cid, status, error = null) {
  const logLevel = error ? 'error' : 'info';
  logger[logLevel]('IPFS Operation', {
    operation,
    cid,
    status,
    error: error?.message,
  });
}

/**
 * Performance logger
 */
function logPerformance(operation, duration, metadata = {}) {
  const level = duration > 1000 ? 'warn' : 'debug'; // Warn if > 1 second
  logger[level]('Performance', {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  });
}

module.exports = {
  logger,
  httpLogger,
  errorLogger,
  requestIdMiddleware,
  responseTimeMiddleware,
  logDatabaseQuery,
  logBlockchainTransaction,
  logIpfsOperation,
  logPerformance,
};
