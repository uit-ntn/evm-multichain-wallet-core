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

// Chế độ morgan
const morganFormat = config.nodeEnv === 'production'
  ? 'combined'
  : 'dev';

// Token request-id (nếu có)
morgan.token('request-id', (req) => {
  return req.id || req.headers['x-request-id'] || '-';
});

// ❗ Không còn đọc X-Response-Time header nữa.
// Nếu cần, ta vẫn có thể đọc từ res.locals.responseTimeMs (được set bởi middleware),
// nhưng ở đây dùng luôn token built-in :response-time của morgan.

// Format JSON cho production (dùng :response-time built-in)
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
 * Error logger cho các response >= 400
 */
const errorLogger = morgan(
  config.nodeEnv === 'production' ? jsonFormat : morganFormat,
  {
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
 * — set header TRƯỚC khi đi tiếp là an toàn
 */
function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] ||
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  try {
    if (!res.headersSent) {
      res.setHeader('X-Request-ID', req.id);
    }
  } catch (_) {
    // ignore
  }
  next();
}

/**
 * Response time middleware
 * — KHÔNG set header trong 'finish' để tránh ERR_HTTP_HEADERS_SENT
 * — Chỉ lưu vào res.locals để morgan/handlers khác có thể dùng
 */
function responseTimeMiddleware(req, res, next) {
  const start = Date.now();

  // Lưu thời gian khi response hoàn tất — không động chạm headers
  res.on('finish', () => {
    res.locals = res.locals || {};
    res.locals.responseTimeMs = Date.now() - start;
    // ❌ KHÔNG setHeader ở đây (headers đã gửi)
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
