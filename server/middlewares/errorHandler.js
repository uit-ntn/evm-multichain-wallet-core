/**
 * Error Handler Middleware (CommonJS)
 * Xử lý lỗi tập trung cho toàn bộ ứng dụng
 */

const { logger } = require("../adapters/logger.adapter");

// 404 Not Found handler
function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

// Global error handler
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error("Error Handler", {
    error: error.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    requestId: req.id,
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { message, status: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = { message, status: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = { message, status: 400 };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = { message: "Invalid token", status: 401 };
  }

  if (err.name === "TokenExpiredError") {
    error = { message: "Token expired", status: 401 };
  }

  // Default 500
  const status = error.status || err.statusCode || 500;
  const message = error.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    requestId: req.id,
  });
}

module.exports = {
  notFound,
  errorHandler,
};
