const { ethers } = require("hardhat");
const { verify } = require("../utils/verify");

async function main() {
  console.log("🚀 Deploying DEX Swap Adapter System...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  
  // Chain-specific configurations
  const chainConfigs = {
    // Sepolia Testnet
    11155111: {
      weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // Sepolia WETH
      uniswapV2Router: "0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98", // Sepolia Uniswap V2
      uniswapV2Factory: "0xF62c03E08ada871A0bEb309762E260a7a6a880E6",
      uniswapV3Router: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E", // Sepolia Uniswap V3
      uniswapV3Quoter: "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3",
      uniswapV3Factory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c"
    },
    // Polygon Amoy Testnet  
    80002: {
      weth: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9", // Amoy WMATIC
      uniswapV2Router: "0x8954AfA98594b838bda56FE4C12a09D7739D179b", // QuickSwap
      uniswapV2Factory: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
      uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 (if available)
      uniswapV3Quoter: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
      uniswapV3Factory: "0x411b0fAcC3489691f28ad58c47006AF5E3Ab3A28"
    },
    // BSC Testnet
    97: {
      weth: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", // BSC Testnet WBNB
      uniswapV2Router: "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3", // PancakeSwap V2
      uniswapV2Factory: "0x6725F303b657a9451d8BA641348b6761A6CC7a17",
      uniswapV3Router: "0x1b81D678ffb9C0263b24A97847620C99d213eB14", // PancakeSwap V3
      uniswapV3Quoter: "0xbC203d7f83677c7ed3F7acEc959963E7F4ECC5C2",
      uniswapV3Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865"
    }
  };
  
  const config = chainConfigs[Number(network.chainId)];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${network.chainId}`);
  }
  
  console.log(`🔧 Using config for chain ${network.chainId}:`);
  console.log(`   WETH: ${config.weth}`);
  console.log(`   V2 Router: ${config.uniswapV2Router}`);
  console.log(`   V3 Router: ${config.uniswapV3Router}`);
  
  let deploymentAddresses = {};
  
  // 1. Deploy SwapRouterProxy
  console.log("\n📦 Deploying SwapRouterProxy...");
  const SwapRouterProxy = await ethers.getContractFactory("SwapRouterProxy");
  const swapRouterProxy = await SwapRouterProxy.deploy(config.weth);
  await swapRouterProxy.waitForDeployment();
  const proxyAddress = await swapRouterProxy.getAddress();
  deploymentAddresses.SwapRouterProxy = proxyAddress;
  console.log(`✅ SwapRouterProxy deployed to: ${proxyAddress}`);
  
  // 2. Deploy DexAdapterV2
  console.log("\n📦 Deploying DexAdapterV2...");
  const DexAdapterV2 = await ethers.getContractFactory("DexAdapterV2");
  const dexAdapterV2 = await DexAdapterV2.deploy();
  await dexAdapterV2.waitForDeployment();
  const v2Address = await dexAdapterV2.getAddress();
  deploymentAddresses.DexAdapterV2 = v2Address;
  console.log(`✅ DexAdapterV2 deployed to: ${v2Address}`);
  
  // 3. Deploy DexAdapterV3
  console.log("\n📦 Deploying DexAdapterV3...");
  const DexAdapterV3 = await ethers.getContractFactory("DexAdapterV3");
  const dexAdapterV3 = await DexAdapterV3.deploy();
  await dexAdapterV3.waitForDeployment();
  const v3Address = await dexAdapterV3.getAddress();
  deploymentAddresses.DexAdapterV3 = v3Address;
  console.log(`✅ DexAdapterV3 deployed to: ${v3Address}`);
  
  // 4. Configure adapters
  console.log("\n⚙️  Configuring adapters...");
  
  // Configure V2 adapter
  await dexAdapterV2.setChainConfig(
    Number(network.chainId),
    config.uniswapV2Router,
    config.uniswapV2Factory,
    30 // 0.3% fee
  );
  console.log("✅ V2 adapter configured");
  
  // Configure V3 adapter
  const supportedFees = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  await dexAdapterV3.setChainConfig(
    Number(network.chainId),
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.uniswapV3Factory,
    supportedFees
  );
  console.log("✅ V3 adapter configured");
  
  // 5. Register adapters in proxy
  console.log("\n🔗 Registering adapters in proxy...");
  
  // DexType enum: UNISWAP_V2=0, UNISWAP_V3=1, PANCAKESWAP=2, SUSHISWAP=3
  await swapRouterProxy.setDexAdapter(0, v2Address); // UNISWAP_V2
  await swapRouterProxy.setDexAdapter(1, v3Address); // UNISWAP_V3
  
  if (Number(network.chainId) === 97) {
    // BSC Testnet - use same adapters for PancakeSwap
    await swapRouterProxy.setDexAdapter(2, v2Address); // PANCAKESWAP
  }
  
  console.log("✅ Adapters registered in proxy");
  
  // 6. Set protocol fee (0.25%)
  await swapRouterProxy.setProtocolFee(25);
  console.log("✅ Protocol fee set to 0.25%");
  
  // 7. Gas analysis
  const deployTx = swapRouterProxy.deploymentTransaction();
  if (deployTx) {
    const receipt = await deployTx.wait();
    console.log("\n⛽ Gas Analysis:");
    console.log(`   Proxy Deploy Gas: ${receipt.gasUsed.toString()}`);
    console.log(`   Gas Price: ${ethers.formatUnits(receipt.gasPrice || 0, "gwei")} gwei`);
    console.log(`   Total Cost: ${ethers.formatEther((receipt.gasUsed * (receipt.gasPrice || 0n)).toString())} ETH`);
  }
  
  // 8. Generate explorer links
  const getExplorerUrl = (chainId) => {
    const explorers = {
      11155111: "https://sepolia.etherscan.io",
      80002: "https://amoy.polygonscan.com", 
      97: "https://testnet.bscscan.com"
    };
    return explorers[chainId] || "https://etherscan.io";
  };
  
  const explorerUrl = getExplorerUrl(Number(network.chainId));
  
  console.log(`\n🔍 Explorer Links:`);
  console.log(`   SwapRouterProxy: ${explorerUrl}/address/${proxyAddress}`);
  console.log(`   DexAdapterV2: ${explorerUrl}/address/${v2Address}`);
  console.log(`   DexAdapterV3: ${explorerUrl}/address/${v3Address}`);
  
  // 9. Environment variables
  console.log("\n📝 Add these to your .env file:");
  const envPrefix = {
    11155111: "SEPOLIA",
    80002: "POLYGON", 
    97: "BSC_TESTNET"
  }[Number(network.chainId)] || "UNKNOWN";
  
  console.log(`SWAP_ROUTER_PROXY_${envPrefix}=${proxyAddress}`);
  console.log(`DEX_ADAPTER_V2_${envPrefix}=${v2Address}`);
  console.log(`DEX_ADAPTER_V3_${envPrefix}=${v3Address}`);
  
  // 10. Test configuration
  console.log("\n🧪 Testing configuration...");
  try {
    // Test adapter registration
    const registeredV2 = await swapRouterProxy.dexAdapters(0);
    const registeredV3 = await swapRouterProxy.dexAdapters(1);
    
    console.log(`✅ V2 Adapter registered: ${registeredV2 === v2Address}`);
    console.log(`✅ V3 Adapter registered: ${registeredV3 === v3Address}`);
    
    // Test fee configuration
    const protocolFee = await swapRouterProxy.protocolFee();
    console.log(`✅ Protocol fee: ${protocolFee}bps (${Number(protocolFee)/100}%)`);
    
  } catch (error) {
    console.log(`❌ Configuration test failed: ${error.message}`);
  }
  
  // 11. Verification
  if (network.chainId !== 1337n) {
    console.log("\n⏳ Waiting for confirmations before verification...");
    await swapRouterProxy.deploymentTransaction()?.wait(5);
    
    console.log("🔍 Verifying contracts...");
    try {
      await verify(proxyAddress, [config.weth]);
      await verify(v2Address, []);
      await verify(v3Address, []);
      console.log("✅ All contracts verified!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }
  
  console.log("\n🎉 DEX Swap Adapter System deployed successfully!");
  console.log("\n📋 Summary:");
  console.log(`   Chain: ${network.name} (${network.chainId})`);
  console.log(`   SwapRouterProxy: ${proxyAddress}`);
  console.log(`   DexAdapterV2: ${v2Address}`);
  console.log(`   DexAdapterV3: ${v3Address}`);
  console.log(`   Protocol Fee: 0.25%`);
  console.log(`   Supported DEXs: Uniswap V2/V3${Number(network.chainId) === 97 ? ', PancakeSwap' : ''}`);
  
  return deploymentAddresses;
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