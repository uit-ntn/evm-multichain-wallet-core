const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");

  // Get network
  const network = hre.network.name;
  console.log(`📡 Network: ${network}`);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);

  // Deploy LimitOrder
  console.log("\n📝 Deploying LimitOrder...");
  const LimitOrder = await hre.ethers.getContractFactory("LimitOrder");
  const limitOrder = await LimitOrder.deploy();
  await limitOrder.waitForDeployment();

  const limitOrderAddress = await limitOrder.getAddress();
  console.log(`✅ LimitOrder deployed to: ${limitOrderAddress}`);

  // Deploy TradeToken (optional)
  /*
  console.log("\n📝 Deploying TradeToken...");
  const TradeToken = await hre.ethers.getContractFactory("TradeToken");
  const tradeToken = await TradeToken.deploy("Trade Token", "TRD");
  await tradeToken.waitForDeployment();
  console.log(`✅ TradeToken deployed to: ${await tradeToken.getAddress()}`);
  */

  console.log("\n✅ Deployment completed!");
  console.log("\n📋 Update your .env file:");
  console.log(`LIMIT_ORDER_ADDRESS_${network.toUpperCase()}=${limitOrderAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});