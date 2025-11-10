const { ethers } = require("hardhat");
const { verify } = require("../utils/verify");

async function main() {
  console.log("🚀 Deploying LimitOrder Contract...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  
  // Deploy LimitOrder
  const LimitOrder = await ethers.getContractFactory("LimitOrder");
  console.log("📦 Deploying LimitOrder contract...");
  
  const limitOrder = await LimitOrder.deploy();
  await limitOrder.waitForDeployment();
  
  const contractAddress = await limitOrder.getAddress();
  console.log(`✅ LimitOrder deployed to: ${contractAddress}`);
  
  // Deploy MockERC20 tokens for testing (only on testnets)
  if (network.chainId !== 1n) { // Not mainnet
    console.log("🪙 Deploying test tokens...");
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    const tokenA = await MockERC20.deploy("Test Token A", "TKNA", ethers.parseEther("1000000"));
    await tokenA.waitForDeployment();
    const tokenAAddress = await tokenA.getAddress();
    
    const tokenB = await MockERC20.deploy("Test Token B", "TKNB", ethers.parseEther("1000000"));
    await tokenB.waitForDeployment();
    const tokenBAddress = await tokenB.getAddress();
    
    console.log(`🪙 Test Token A deployed to: ${tokenAAddress}`);
    console.log(`🪙 Test Token B deployed to: ${tokenBAddress}`);
    
    // Transfer some tokens to deployer for testing
    await tokenA.transfer(deployer.address, ethers.parseEther("10000"));
    await tokenB.transfer(deployer.address, ethers.parseEther("10000"));
    
    console.log("💸 Transferred test tokens to deployer");
  }
  
  // Get deployment transaction details
  const deployTx = limitOrder.deploymentTransaction();
  if (deployTx) {
    const receipt = await deployTx.wait();
    console.log("⛽ Gas Analysis:");
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Gas Price: ${ethers.formatUnits(receipt.gasPrice || 0, "gwei")} gwei`);
    console.log(`   Total Cost: ${ethers.formatEther((receipt.gasUsed * (receipt.gasPrice || 0n)).toString())} ETH`);
  }
  
  // Contract info
  console.log("\n📋 Contract Information:");
  console.log(`   Fee Rate: ${await limitOrder.feeRate()}/10000 (${(Number(await limitOrder.feeRate()) / 100).toFixed(2)}%)`);
  console.log(`   Fee Recipient: ${await limitOrder.feeRecipient()}`);
  console.log(`   Owner: ${await limitOrder.owner()}`);
  console.log(`   Domain Separator: ${await limitOrder.DOMAIN_SEPARATOR()}`);
  
  // Generate explorer links
  const getExplorerUrl = (chainId) => {
    const explorers = {
      1: "https://etherscan.io",
      11155111: "https://sepolia.etherscan.io", // Sepolia
      80002: "https://amoy.polygonscan.com",    // Polygon Amoy
      97: "https://testnet.bscscan.com"         // BSC Testnet
    };
    return explorers[chainId] || "https://etherscan.io";
  };
  
  const explorerUrl = getExplorerUrl(Number(network.chainId));
  console.log(`\n🔍 Explorer Link: ${explorerUrl}/address/${contractAddress}`);
  
  // Wait for a few blocks before verification on testnets
  if (network.chainId !== 1n && network.chainId !== 1337n) {
    console.log("⏳ Waiting for 5 confirmations before verification...");
    await limitOrder.deploymentTransaction()?.wait(5);
    
    // Verify contract
    console.log("🔍 Verifying contract on block explorer...");
    try {
      await verify(contractAddress, []);
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
      console.log("💡 You can verify manually later using:");
      console.log(`npx hardhat verify --network ${network.name} ${contractAddress}`);
    }
  }
  
  // Environment variables to add
  console.log("\n📝 Add these to your .env file:");
  const envVarName = {
    11155111: "LIMIT_ORDER_ADDRESS_SEPOLIA",
    80002: "LIMIT_ORDER_ADDRESS_POLYGON", 
    97: "LIMIT_ORDER_ADDRESS_BSC_TESTNET"
  }[Number(network.chainId)] || "LIMIT_ORDER_ADDRESS";
  
  console.log(`${envVarName}=${contractAddress}`);
  
  console.log("\n🎉 Deployment completed successfully!");
  
  return {
    limitOrder: contractAddress,
    network: network.name,
    chainId: network.chainId
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;