const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');
const { defaultRateLimit } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const connectDB = require('./config/DBConfig');

// Import routes
// const indexRoutes = require('./routes/index');
// const evmRoutes = require('./routes/evm');
// const suiRoutes = require('./routes/sui');
const userRoutes = require('./routes/user.route');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
app.use(defaultRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Routes
// app.use('/api', indexRoutes);
// app.use('/api/evm', evmRoutes);
// app.use('/api/sui', suiRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Connect to MongoDB
connectDB().then(() => {
  // Start server
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
    
    if (config.nodeEnv === 'development') {
      console.log(`\nAvailable endpoints:`);
      console.log(`   Health check: GET http://localhost:${PORT}/api/health`);
      console.log(`   EVM balance:  GET http://localhost:${PORT}/api/evm/balance/:address?chain=eth`);
      console.log(`   Sui balance:  GET http://localhost:${PORT}/api/sui/balance/:owner`);
      console.log(`   Full API:     GET http://localhost:${PORT}/api`);
    }
  });
});

module.exports = app;