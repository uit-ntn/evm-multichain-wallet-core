const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    status: err.statusCode || 500,
    message: err.message || 'Internal Server Error'
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Invalid input data';
    error.details = err.errors;
  }

  // Network errors
  if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNREFUSED') {
    error.status = 503;
    error.message = 'Network service unavailable';
  }

  // Rate limit errors
  if (err.status === 429) {
    error.message = 'Too many requests';
  }

  res.status(error.status).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
};

module.exports = {
  errorHandler,
  notFound
};