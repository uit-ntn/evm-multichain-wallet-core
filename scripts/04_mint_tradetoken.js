const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/* =======================
   Helper functions
======================= */

function deploymentsPath(network) {
  return path.join(__dirname, "..", "deployments", `${network}.json`);
}

function loadDeployments(network) {
  const p = deploymentsPath(network);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/* =======================
   Main
======================= */

async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  const d = loadDeployments(network);

  console.log("🎯 Mint TradeToken for User Wallet");
  console.log("Network :", network);
  console.log("Deployer:", deployer.address);

  if (!d.tradeToken) {
    throw new Error("❌ Missing TradeToken. Hãy chạy scripts/02_swap.js trước.");
  }

  // 🔥 WALLET ADDRESS TỪNG FRONTEND 🔥
  // Address hiển thị trong frontend: 0xdB...B50C
  const USER_WALLET = "0xdB1afFCC4B6061b26dBc77670F311003c7E9B50C"; // Real frontend wallet

  console.log("👤 Target wallet:", USER_WALLET);

  /* =======================
     Mint TradeToken for user
  ======================= */

  const tradeToken = await hre.ethers.getContractAt("TradeToken", d.tradeToken);
  
  // Mint 100,000 TRADE tokens cho user wallet
  const MINT_AMOUNT = hre.ethers.utils.parseEther("100000");
  
  console.log("⏳ Minting TradeToken to user wallet...");
  const tx = await tradeToken.mint(USER_WALLET, MINT_AMOUNT);
  await tx.wait();

  console.log("✅ Minted successfully!");
  console.log("Amount :", hre.ethers.utils.formatEther(MINT_AMOUNT), "TRADE");
  console.log("To     :", USER_WALLET);
  console.log("TxHash :", tx.hash);

  /* =======================
     Check balance
  ======================= */

  const balance = await tradeToken.balanceOf(USER_WALLET);
  console.log("💰 User balance:", hre.ethers.utils.formatEther(balance), "TRADE");

  console.log("\n🎉 DONE! Reload frontend to see TradeToken balance");
}

/* =======================
   Run
======================= */

main().catch((err) => {
  console.error("❌ Mint failed:", err);
  process.exit(1);
});