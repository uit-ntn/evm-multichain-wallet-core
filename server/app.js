const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const { config: appConfig, initConfig } = require("./adapters/config.adapter");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const {
  logger,
  httpLogger,
  errorLogger,
  requestIdMiddleware,
  responseTimeMiddleware,
} = require("./adapters/logger.adapter");

const { defaultRateLimit } = require("./middlewares/rateLimiter");
const { errorHandler, notFound } = require("./middlewares/errorHandler");
const connectDB = require("./config/DBConfig");

// Routes - Simple CRUD
const userRoutes = require("./routes/user.route");
const orderRoutes = require("./routes/order.route");
const transactionRoutes = require("./routes/transaction.route");
const receiptRoutes = require("./routes/receipt.route");

initConfig();

const app = express();

app.use(requestIdMiddleware);
app.use(responseTimeMiddleware);
app.use(httpLogger);
app.use(errorLogger);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS configuration - handle multiple origins and remove duplicates
const corsOrigins = appConfig.corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

// Remove duplicates
const uniqueOrigins = [...new Set(corsOrigins)];

// Log CORS configuration for debugging
logger.info("🌐 CORS Configuration", {
  rawOrigin: appConfig.corsOrigin,
  parsedOrigins: uniqueOrigins,
  originCount: uniqueOrigins.length,
});

const corsOptions = {
  origin: uniqueOrigins.length === 1 ? uniqueOrigins[0] : uniqueOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.use(compression());
app.use(defaultRateLimit);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes - Simple CRUD for all 4 nghiệp vụ
app.use("/api/users", userRoutes);              // Web3 wallet users
app.use("/api/orders", orderRoutes);            // Nghiệp vụ 1: Limit orders
app.use("/api/transactions", transactionRoutes); // Nghiệp vụ 2 & 3: Swap + Staking
app.use("/api/receipts", receiptRoutes);        // Nghiệp vụ 4: IPFS receipts

// Swagger UI and raw JSON
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));

// Error handlers
app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(async () => {    
    const PORT = appConfig.port || 4000;
    app.listen(PORT, () => logger.info(`🚀 Server started on port ${PORT}`));
  })
  .catch((error) => {
    logger.error("❌ Failed to start server", { error: error.message });
    process.exit(1);
  });

module.exports = app;
