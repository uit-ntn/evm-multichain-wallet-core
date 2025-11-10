// server/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Adapters
const { config, initConfig } = require('./adapters/config.adapter');
const { 
  logger, 
  httpLogger, 
  errorLogger, 
  requestIdMiddleware, 
  responseTimeMiddleware 
} = require('./adapters/logger.adapter');

const { defaultRateLimit } = require('./middlewares/rateLimiter');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const connectDB = require('./config/DBConfig');

// ===== Import routes (ĐẶT Ở ĐÂU FILE) =====
const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');
// const orderRoutes = require('./routes/order.route');
// const transactionRoutes = require('./routes/transaction.route');
const receiptRoutes = require('./routes/receipt.route');
// const settingRoutes = require('./routes/setting.route');
// const evmRoutes = require('./routes/evm.route');
// const suiRoutes = require('./routes/sui.route');
console.log("DEBUG JWT_SECRET =", process.env.JWT_SECRET);

// Initialize configuration
const appConfig = initConfig();
const app = express();

// ===== Request tracking & logging =====
app.use(requestIdMiddleware);
app.use(responseTimeMiddleware);
app.use(httpLogger);
app.use(errorLogger);

// ===== Security middleware =====
app.use(helmet({
  contentSecurityPolicy: false, // API only
  crossOriginEmbedderPolicy: false,
}));

// ===== CORS =====
app.use(cors({
  origin: appConfig.corsOrigin.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(compression());

// ===== Rate limiting =====
app.use(defaultRateLimit);

// ===== Body parsers =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Health check =====
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: appConfig.nodeEnv,
    version: require('../package.json').version,
  });
});

// ===== API Routes (MOUNT TRƯỚC notFound) =====
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/orders', orderRoutes);
// app.use('/api/transactions', transactionRoutes);
app.use('/api/receipts', receiptRoutes);
// app.use('/api/settings', settingRoutes);
// app.use('/api/evm', evmRoutes);
// app.use('/api/sui', suiRoutes);

// ===== 404 & Error handlers (ĐỂ SAU CÙNG) =====
app.use(notFound);
app.use(errorHandler);

// ===== Connect DB & Start Server =====
connectDB().then(() => {
  logger.info('Database connected successfully');

  const PORT = appConfig.port;
  const server = app.listen(PORT, () => {
    logger.info('🚀 Server started successfully', {
      port: PORT,
      environment: appConfig.nodeEnv,
      enabledChains: Object.keys(appConfig.chains).filter(
        chain => appConfig.chains[chain].rpc
      ),
      features: Object.entries(appConfig.features)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name),
    });

    if (appConfig.nodeEnv === 'development') {
      console.log(`\n📋 Available endpoints:`);
      console.log(`   Health:        GET  http://localhost:${PORT}/health`);
      console.log(`   Auth (nonce):  POST http://localhost:${PORT}/api/auth/nonce`);
      console.log(`   Auth (login):  POST http://localhost:${PORT}/api/auth/login`);
      console.log(`   Users API:     GET  http://localhost:${PORT}/api/users`);
      console.log(`   Orders API:    GET  http://localhost:${PORT}/api/orders`);
      console.log(`   Transactions:  GET  http://localhost:${PORT}/api/transactions`);
      console.log(`   Receipts:      GET  http://localhost:${PORT}/api/receipts`);
      console.log(`   Settings:      GET  http://localhost:${PORT}/api/settings`);
      console.log(`\n🔧 Development features:`);
      console.log(`   Auto-restart: File changes detected by nodemon`);
      console.log(`   Logs: Colored console output`);
      console.log(`   CORS: Enabled for ${appConfig.corsOrigin}`);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

}).catch((error) => {
  logger.error('Failed to start server', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

module.exports = app;
