const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 DEX Adapter Integration Test");
  console.log("================================");
  
  const [deployer, user] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 User: ${user.address}`);
  
  // Get deployed contract addresses from environment or deployment
  const deployedAddresses = {
    // Sepolia
    11155111: {
      swapRouterProxy: process.env.SWAP_ROUTER_PROXY_SEPOLIA,
      dexAdapterV2: process.env.DEX_ADAPTER_V2_SEPOLIA,
      dexAdapterV3: process.env.DEX_ADAPTER_V3_SEPOLIA
    },
    // Polygon Amoy
    80002: {
      swapRouterProxy: process.env.SWAP_ROUTER_PROXY_POLYGON,
      dexAdapterV2: process.env.DEX_ADAPTER_V2_POLYGON,
      dexAdapterV3: process.env.DEX_ADAPTER_V3_POLYGON
    },
    // BSC Testnet
    97: {
      swapRouterProxy: process.env.SWAP_ROUTER_PROXY_BSC_TESTNET,
      dexAdapterV2: process.env.DEX_ADAPTER_V2_BSC_TESTNET,
      dexAdapterV3: process.env.DEX_ADAPTER_V3_BSC_TESTNET
    }
  };
  
  const addresses = deployedAddresses[Number(network.chainId)];
  if (!addresses?.swapRouterProxy) {
    console.log("❌ Contract addresses not found for this network");
    console.log("Please deploy contracts first using: npx hardhat run scripts/deploy-dex-adapters.js");
    return;
  }
  
  // Test token addresses for each network
  const testTokens = {
    // Sepolia
    11155111: {
      WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
      LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789"  // Sepolia LINK
    },
    // Polygon Amoy
    80002: {
      WMATIC: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9",
      USDC: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
      USDT: "0xf9f48d9Fc5de95B84E4D90B0F8b7A0516eDC5071"
    },
    // BSC Testnet
    97: {
      WBNB: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
      BUSD: "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7",
      USDT: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"
    }
  };
  
  const tokens = testTokens[Number(network.chainId)];
  if (!tokens) {
    console.log("❌ Test tokens not configured for this network");
    return;
  }
  
  // Get contract instances
  const SwapRouterProxy = await ethers.getContractFactory("SwapRouterProxy");
  const swapRouterProxy = SwapRouterProxy.attach(addresses.swapRouterProxy);
  
  console.log(`📄 SwapRouterProxy: ${addresses.swapRouterProxy}`);
  
  // Test 1: Basic contract configuration
  console.log("\n🧪 Test 1: Contract Configuration");
  try {
    const weth = await swapRouterProxy.WETH();
    const protocolFee = await swapRouterProxy.protocolFee();
    const v2Adapter = await swapRouterProxy.dexAdapters(0);
    const v3Adapter = await swapRouterProxy.dexAdapters(1);
    
    console.log(`✅ WETH: ${weth}`);
    console.log(`✅ Protocol Fee: ${protocolFee}bps (${Number(protocolFee)/100}%)`);
    console.log(`✅ V2 Adapter: ${v2Adapter}`);
    console.log(`✅ V3 Adapter: ${v3Adapter}`);
    
    if (v2Adapter === ethers.ZeroAddress || v3Adapter === ethers.ZeroAddress) {
      console.log("❌ Adapters not properly configured");
      return;
    }
  } catch (error) {
    console.log(`❌ Configuration test failed: ${error.message}`);
    return;
  }
  
  // Test 2: Quote functionality (read-only)
  console.log("\n🧪 Test 2: Quote Functionality");
  try {
    const tokenNames = Object.keys(tokens);
    const tokenA = tokens[tokenNames[0]];
    const tokenB = tokens[tokenNames[1]];
    const amountIn = ethers.parseEther("0.1");
    
    console.log(`📝 Quoting swap: 0.1 ${tokenNames[0]} -> ${tokenNames[1]}`);
    console.log(`   Token A: ${tokenA}`);
    console.log(`   Token B: ${tokenB}`);
    
    // Try to get quote from V2 adapter
    const DexAdapterV2 = await ethers.getContractFactory("DexAdapterV2");
    const dexAdapterV2 = DexAdapterV2.attach(addresses.dexAdapterV2);
    
    try {
      const quote = await dexAdapterV2.getAmountOut(tokenA, tokenB, amountIn);
      console.log(`✅ V2 Quote: ${ethers.formatEther(quote)} ${tokenNames[1]}`);
    } catch (error) {
      console.log(`⚠️  V2 Quote failed (normal if no liquidity): ${error.message.split('\n')[0]}`);
    }
    
    // Try to get quote from V3 adapter
    const DexAdapterV3 = await ethers.getContractFactory("DexAdapterV3");
    const dexAdapterV3 = DexAdapterV3.attach(addresses.dexAdapterV3);
    
    try {
      const bestFee = await dexAdapterV3.findBestFeeTier(tokenA, tokenB, amountIn, true);
      console.log(`✅ V3 Best Fee Tier: ${bestFee}bps (${Number(bestFee)/100}%)`);
    } catch (error) {
      console.log(`⚠️  V3 Quote failed (normal if no liquidity): ${error.message.split('\n')[0]}`);
    }
    
  } catch (error) {
    console.log(`❌ Quote test failed: ${error.message}`);
  }
  
  // Test 3: ETH Balance and Gas Estimation
  console.log("\n🧪 Test 3: Transaction Simulation");
  try {
    const userBalance = await ethers.provider.getBalance(user.address);
    console.log(`💰 User ETH Balance: ${ethers.formatEther(userBalance)}`);
    
    if (userBalance < ethers.parseEther("0.01")) {
      console.log("⚠️  Low ETH balance, skipping transaction tests");
      console.log("   Please fund your account with testnet ETH");
      
      // Show faucet links
      const faucets = {
        11155111: "https://sepoliafaucet.com/",
        80002: "https://faucet.polygon.technology/",
        97: "https://testnet.bnbchain.org/faucet-smart"
      };
      
      const faucetUrl = faucets[Number(network.chainId)];
      if (faucetUrl) {
        console.log(`   Faucet: ${faucetUrl}`);
      }
      
      return;
    }
    
    // Simulate ETH -> Token swap (read-only)
    const tokenNames = Object.keys(tokens);
    const tokenOut = tokens[tokenNames[1]];
    const ethAmount = ethers.parseEther("0.01");
    
    console.log(`🔄 Simulating: 0.01 ETH -> ${tokenNames[1]}`);
    
    const swapParams = {
      tokenIn: ethers.ZeroAddress, // ETH
      tokenOut: tokenOut,
      amountIn: ethAmount,
      amountOutMin: 1, // Accept any amount for simulation
      to: user.address,
      deadline: Math.floor(Date.now() / 1000) + 3600,
      dexType: 0, // V2
      dexParams: "0x"
    };
    
    try {
      const gasEstimate = await swapRouterProxy.connect(user).swapExactETHForTokens.estimateGas(
        swapParams,
        { value: ethAmount }
      );
      
      const gasPrice = await ethers.provider.getFeeData();
      const txCost = gasEstimate * (gasPrice.gasPrice || 0n);
      
      console.log(`✅ Gas Estimate: ${gasEstimate.toString()}`);
      console.log(`✅ Transaction Cost: ${ethers.formatEther(txCost)} ETH`);
      
      if (userBalance > ethAmount + txCost) {
        console.log("✅ Sufficient balance for transaction");
      } else {
        console.log("⚠️  Insufficient balance for transaction");
      }
      
    } catch (error) {
      console.log(`⚠️  Gas estimation failed: ${error.message.split('\n')[0]}`);
      console.log("   This is normal if there's no liquidity pool");
    }
    
  } catch (error) {
    console.log(`❌ Simulation test failed: ${error.message}`);
  }
  
  // Test 4: Security checks
  console.log("\n🧪 Test 4: Security Verification");
  try {
    const owner = await swapRouterProxy.owner();
    const paused = await swapRouterProxy.paused();
    
    console.log(`✅ Owner: ${owner}`);
    console.log(`✅ Paused: ${paused}`);
    
    // Check if protocol fee is within bounds
    const protocolFee = await swapRouterProxy.protocolFee();
    if (Number(protocolFee) <= 1000) { // <= 10%
      console.log(`✅ Protocol fee within bounds: ${protocolFee}bps`);
    } else {
      console.log(`❌ Protocol fee too high: ${protocolFee}bps`);
    }
    
    // Verify adapters are set
    const adapters = [];
    for (let i = 0; i < 4; i++) {
      try {
        const adapter = await swapRouterProxy.dexAdapters(i);
        if (adapter !== ethers.ZeroAddress) {
          adapters.push({ type: i, address: adapter });
        }
      } catch (error) {
        // Normal, adapter not set
      }
    }
    
    console.log(`✅ Active adapters: ${adapters.length}`);
    adapters.forEach(adapter => {
      const types = ["Uniswap V2", "Uniswap V3", "PancakeSwap", "SushiSwap"];
      console.log(`   ${types[adapter.type]}: ${adapter.address}`);
    });
    
  } catch (error) {
    console.log(`❌ Security check failed: ${error.message}`);
  }
  
  // Test results summary
  console.log("\n📊 Integration Test Summary");
  console.log("===========================");
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Proxy Contract: ${addresses.swapRouterProxy}`);
  console.log(`Status: Contracts deployed and configured`);
  console.log(`\n💡 Next Steps:`);
  console.log(`1. Fund test account with testnet tokens`);
  console.log(`2. Run actual swap transactions`);
  console.log(`3. Test on multiple chains`);
  
  // Show testing commands
  console.log(`\n🚀 Manual Testing Commands:`);
  console.log(`# Fund account with testnet ETH`);
  console.log(`# Then run swaps:`);
  console.log(`npx hardhat run scripts/test-swap-integration.js --network ${network.name}`);
  
  console.log("\n✅ Integration test completed!");
}

// Handle both direct execution and module import
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Integration test failed:", error);
      process.exit(1);
    });
}

module.exports = main;