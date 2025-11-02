const hre = require("hardhat");

async function main() {
  console.log("🔍 Starting contract verification...");
  
  const network = hre.network.name;
  console.log(`📡 Network: ${network}`);
  
  // Get contract addresses from environment
  const limitOrderAddress = process.env[`LIMIT_ORDER_ADDRESS_${network.toUpperCase()}`];
  
  if (!limitOrderAddress) {
    console.error(`❌ LIMIT_ORDER_ADDRESS_${network.toUpperCase()} not found in .env`);
    process.exit(1);
  }
  
  // Verify LimitOrder
  console.log(`\n📝 Verifying LimitOrder at ${limitOrderAddress}...`);
  try {
    await hre.run("verify:verify", {
      address: limitOrderAddress,
      constructorArguments: [],
    });
    console.log("✅ LimitOrder verified!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract already verified");
    } else {
      console.error("❌ Verification failed:", error.message);
    }
  }
  
  // Verify other contracts
  // Add verification for TradeToken, StakingRewards, etc.
  
  console.log("\n✅ Verification completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

