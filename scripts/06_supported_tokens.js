// scripts/fix_supported_tokens.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadDeployments(network) {
  const p = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  const { ethers } = hre;
  const network = hre.network.name;
  const [deployer] = await ethers.getSigners();
  const d = loadDeployments(network);

  console.log("🔧 Fix Supported Tokens");
  console.log("Network :", network);
  console.log("Deployer:", deployer.address);

  if (!d.swapRouter) {
    throw new Error("❌ Missing swapRouter address. Run scripts/02_swap.js first.");
  }

  const swapRouter = await ethers.getContractAt("SwapRouterProxy", d.swapRouter);
  
  // Get token addresses
  const tokens = [];
  if (d.tradeToken) tokens.push(d.tradeToken);
  if (d.mockLink) tokens.push(d.mockLink);
  if (d.weth) tokens.push(d.weth);

  console.log("\n📋 Token addresses to support:");
  tokens.forEach((addr, i) => {
    console.log(`  ${i + 1}. ${addr}`);
  });

  if (tokens.length === 0) {
    throw new Error("❌ No token addresses found in deployments");
  }

  // Check current status
  console.log("\n🔍 Checking current support status:");
  for (const token of tokens) {
    try {
      const supported = await swapRouter.supportedTokens(token);
      console.log(`  ${token}: ${supported ? "✅ Supported" : "❌ Not supported"}`);
    } catch (e) {
      console.log(`  ${token}: ❌ Error checking - ${e.message}`);
    }
  }

  // Set supported tokens
  console.log("\n🔧 Setting supported tokens...");
  try {
    const tx = await swapRouter.setSupportedTokens(tokens, true);
    console.log("Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    // Verify
    console.log("\n✅ Verification:");
    for (const token of tokens) {
      const supported = await swapRouter.supportedTokens(token);
      console.log(`  ${token}: ${supported ? "✅ Supported" : "❌ Still not supported"}`);
    }

  } catch (error) {
    console.error("❌ Failed to set supported tokens:", error);
    
    // Try individual setting
    console.log("\n🔄 Trying individual token setting...");
    for (const token of tokens) {
      try {
        const tx = await swapRouter.setSupportedToken(token, true);
        await tx.wait();
        console.log(`✅ Set ${token} as supported`);
      } catch (e) {
        console.error(`❌ Failed to set ${token}:`, e.message);
      }
    }
  }

  console.log("\n🎉 Fix completed!");
}

main().catch((err) => {
  console.error("❌ Fix failed:", err);
  process.exit(1);
});
