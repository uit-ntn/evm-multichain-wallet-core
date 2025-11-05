/**
 * Logger Adapter (CommonJS)
 * Centralized logging for application, HTTP, DB, blockchain, and IPFS
 */

const morgan = require("morgan");
const { config } = require("./config.adapter");

const levels = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
const currentLevel = levels[config.logLevel] ?? levels.info;

function print(level, message, meta = {}) {
  if (levels[level] > currentLevel) return;
  const ts = new Date().toISOString();
  const formattedMeta = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${ts}] ${level.toUpperCase()}: ${message}${formattedMeta}`);
}

const logger = {
  error: (msg, meta = {}) => print("error", msg, meta),
  warn: (msg, meta = {}) => print("warn", msg, meta),
  info: (msg, meta = {}) => print("info", msg, meta),
  debug: (msg, meta = {}) => print("debug", msg, meta),
  trace: (msg, meta = {}) => print("trace", msg, meta),

  child(defaultMeta = {}) {
    return {
      error: (msg, meta = {}) => print("error", msg, { ...defaultMeta, ...meta }),
      warn: (msg, meta = {}) => print("warn", msg, { ...defaultMeta, ...meta }),
      info: (msg, meta = {}) => print("info", msg, { ...defaultMeta, ...meta }),
      debug: (msg, meta = {}) => print("debug", msg, { ...defaultMeta, ...meta }),
      trace: (msg, meta = {}) => print("trace", msg, { ...defaultMeta, ...meta }),
    };
  },
};

// === Morgan HTTP loggers ===
const httpLogger = morgan("dev");
const errorLogger = morgan("dev");

// === Middleware ===
function requestIdMiddleware(req, res, next) {
  req.id =
    req.headers["x-request-id"] ||
    `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  res.setHeader("X-Request-ID", req.id);
  next();
}

function responseTimeMiddleware(req, res, next) {
  const start = Date.now();

  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${duration}ms`);
    }
    return originalSend.call(this, body);
  };

  next();
}

// === Helper log functions ===
function logDatabaseQuery(collection, operation, query = {}, duration = 0) {
  logger.debug("Database Query", {
    collection,
    operation,
    query: JSON.stringify(query),
    duration: `${duration}ms`,
  });
}

function logBlockchainTransaction(chainId, txHash, status, gasUsed = null) {
  logger.info("Blockchain Transaction", {
    chainId,
    txHash,
    status,
    gasUsed,
  });
}

function logIpfsOperation(operation, cid, status, error = null) {
  const logLevel = error ? "error" : "info";
  logger[logLevel]("IPFS Operation", {
    operation,
    cid,
    status,
    error: error?.message,
  });
}

function logPerformance(operation, duration, metadata = {}) {
  const level = duration > 1000 ? "warn" : "debug";
  logger[level]("Performance", { operation, duration: `${duration}ms`, ...metadata });
}

// === Exports ===
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
