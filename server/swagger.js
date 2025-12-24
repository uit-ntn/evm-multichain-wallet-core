const swaggerJsdoc = require("swagger-jsdoc");
const { config } = require("./adapters/config.adapter");

const port = config.port || 4000;
const host = process.env.SWAGGER_HOST || `http://localhost:${port}`;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EVM Multichain Wallet API",
      version: "1.0.0",
      description: "API documentation for EVM Multichain Wallet Core",
    },
    servers: [
      {
        url: host,
      },
    ],
    // No authentication required for P2P model
  },
  apis: ["./server/routes/*.js", "./server/controllers/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
