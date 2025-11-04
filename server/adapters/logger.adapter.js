/**
 * Logger Adapter (ESM)
 * Centralized logging for application, HTTP, DB, blockchain, and IPFS
 */

import morgan from "morgan";
import { config } from "./config.adapter.js";

const levels = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
const currentLevel = levels[config.logLevel] ?? levels.info;

function print(level, message, meta = {}) {
  if (levels[level] > currentLevel) return;
  const ts = new Date().toISOString();
  const formattedMeta = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${ts}] ${level.toUpperCase()}: ${message}${formattedMeta}`);
}

export const logger = {
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
export const httpLogger = morgan("dev");
export const errorLogger = morgan("dev");

// === Middleware ===
export function requestIdMiddleware(req, res, next) {
  req.id =
    req.headers["x-request-id"] ||
    `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  res.setHeader("X-Request-ID", req.id);
  next();
}

export function responseTimeMiddleware(req, res, next) {
  const start = Date.now();

  // Hook vào res.send để thêm header *trước khi gửi response*
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
export function logDatabaseQuery(collection, operation, query = {}, duration = 0) {
  logger.debug("Database Query", {
    collection,
    operation,
    query: JSON.stringify(query),
    duration: `${duration}ms`,
  });
}

export function logBlockchainTransaction(chainId, txHash, status, gasUsed = null) {
  logger.info("Blockchain Transaction", {
    chainId,
    txHash,
    status,
    gasUsed,
  });
}

export function logIpfsOperation(operation, cid, status, error = null) {
  const logLevel = error ? "error" : "info";
  logger[logLevel]("IPFS Operation", {
    operation,
    cid,
    status,
    error: error?.message,
  });
}

export function logPerformance(operation, duration, metadata = {}) {
  const level = duration > 1000 ? "warn" : "debug";
  logger[level]("Performance", { operation, duration: `${duration}ms`, ...metadata });
}
