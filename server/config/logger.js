/**
 * Logger Configuration
 * Structured logging with Pino-style configuration
 */

const { config } = require('./env');

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
 * Current log level from config
 */
const currentLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;

/**
 * Format log message with timestamp and level
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };
  
  // In production, output JSON for structured logging
  if (config.nodeEnv === 'production') {
    return JSON.stringify(logEntry);
  }
  
  // In development, output human-readable format
  const metaStr = Object.keys(meta).length > 0 
    ? `\n  ${JSON.stringify(meta, null, 2)}`
    : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
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
 * Logger object with methods for each level
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
 * HTTP request logger middleware
 */
function httpLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
}

module.exports = {
  logger,
  httpLogger,
};

