/**
 * sign-order.js (CommonJS)
 * Tạo chữ ký EIP-712 LimitOrder an toàn (dùng PRIVATE_KEY trong .env)
 */

const { ethers } = require("ethers");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY not found in .env");
  process.exit(1);
}

// ---- Config ----
const wallet = new ethers.Wallet(PRIVATE_KEY);

const domain = {
  name: "LimitOrder",
  version: "1",
  chainId: 11155111, // Sepolia
  verifyingContract: "0x02f5d533E0a3fEF9995b285b0bd2AFF6deeb721d",
};

const types = {
  Order: [
    { name: "tokenIn", type: "address" },
    { name: "tokenOut", type: "address" },
    { name: "amountIn", type: "uint256" },
    { name: "targetPrice", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

// ---- Message (order) ----
const deadline = Math.floor(Date.now() / 1000) + 3600; // +1h
const message = {
  tokenIn: "0x0000000000000000000000000000000000000001",
  tokenOut: "0x0000000000000000000000000000000000000002",
  amountIn: "1000000000000000000",
  targetPrice: "2000000000000000000000",
  deadline,
};

// ---- Sign ----
(async () => {
  console.log(`🔐 Wallet: ${wallet.address}`);

  // ⚠️ ethers v5 dùng _signTypedData thay vì signTypedData
  const signature = await wallet._signTypedData(domain, types, message);

  const signedData = {
    user: wallet.address,
    ...message,
    signature,
  };

  // Xuất file JSON an toàn để dán vào Postman
  fs.writeFileSync("signed_order.json", JSON.stringify(signedData, null, 2));

  console.log("✅ Order signed successfully!");
  console.log("📄 Saved to signed_order.json");
})();
