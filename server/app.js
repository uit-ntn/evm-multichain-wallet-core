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

// 1. IMPORT ROUTE TRANSACTION Ở ĐÂY
const userRoutes = require("./routes/user.route");
const orderRoutes = require("./routes/order.route");
const transactionRoutes = require("./routes/transaction.route"); // <--- THÊM DÒNG NÀY

initConfig();

const app = express();

app.use(requestIdMiddleware);
app.use(responseTimeMiddleware);
app.use(httpLogger);
app.use(errorLogger);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(
  cors({
    origin: appConfig.corsOrigin.split(","),
    credentials: true,
  })
);
app.use(compression());
app.use(defaultRateLimit);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 2. ĐĂNG KÝ URL CHO TRANSACTION Ở ĐÂY
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/transactions", transactionRoutes); // <--- THÊM DÒNG NÀY
app.use("/api/tx", transactionRoutes);           // <--- THÊM DÒNG NÀY (Alias ngắn)

// Swagger UI and raw JSON
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));
app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    const PORT = appConfig.port || 4000;
    app.listen(PORT, () => logger.info(`🚀 Server started on port ${PORT}`));
  })
  .catch((error) => {
    logger.error("❌ Failed to start server", { error: error.message });
    process.exit(1);
  });

module.exports = app;