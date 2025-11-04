import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

// Adapters (ESM)
import { config as appConfig, initConfig } from "./adapters/config.adapter.js";
import {
  logger,
  httpLogger,
  errorLogger,
  requestIdMiddleware,
  responseTimeMiddleware,
} from "./adapters/logger.adapter.js";

import { defaultRateLimit } from "./middlewares/rateLimiter.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import connectDB from "./config/DBConfig.js";

// Routes
import userRoutes from "./routes/user.route.js";
import orderRoutes from "./routes/order.route.js"; // ✅ đã ESM
// import transactionRoutes from "./routes/transaction.route.js";
// import receiptRoutes from "./routes/receipt.route.js";
// import settingRoutes from "./routes/setting.route.js";
// import evmRoutes from "./routes/evm.route.js";
// import suiRoutes from "./routes/sui.route.js";

// Initialize configuration
initConfig();

const app = express();

// Request tracing
app.use(requestIdMiddleware);
app.use(responseTimeMiddleware);

// Logging
app.use(httpLogger);
app.use(errorLogger);

// Security
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: appConfig.corsOrigin.split(","),
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Compression & rate limiting
app.use(compression());
app.use(defaultRateLimit);

// Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: appConfig.nodeEnv,
    version: appConfig.version || "1.0.0",
  });
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
// app.use("/api/transactions", transactionRoutes);
// app.use("/api/receipts", receiptRoutes);
// app.use("/api/settings", settingRoutes);
// app.use("/api/evm", evmRoutes);
// app.use("/api/sui", suiRoutes);

// 404 & error handlers
app.use(notFound);
app.use(errorHandler);

// Connect DB & start server
connectDB()
  .then(() => {
    logger.info("✅ Database connected successfully");

    const PORT = appConfig.port || 4000;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server started`, {
        port: PORT,
        environment: appConfig.nodeEnv,
        enabledChains: Object.keys(appConfig.chains).filter(
          (c) => appConfig.chains[c].rpc
        ),
        features: Object.entries(appConfig.features)
          .filter(([, enabled]) => enabled)
          .map(([name]) => name),
      });

      if (appConfig.nodeEnv === "development") {
        console.log(`\n📋 Endpoints available:`);
        console.log(`   Health:       GET  http://localhost:${PORT}/health`);
        console.log(`   Users API:    GET  http://localhost:${PORT}/api/users`);
        console.log(`   Orders API:   GET  http://localhost:${PORT}/api/orders`);
        console.log(`\n🔧 Dev features:`);
        console.log(`   CORS: Enabled for ${appConfig.corsOrigin}`);
      }
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((error) => {
    logger.error("❌ Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

export default app;
