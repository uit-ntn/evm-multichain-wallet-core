const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX Swap Adapter System", function () {
  let deployer, user1, user2;
  let swapRouterProxy, dexAdapterV2, dexAdapterV3;
  let mockWETH, mockTokenA, mockTokenB;
  let mockV2Router, mockV2Factory, mockV3Router, mockV3Quoter;
  
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const SWAP_AMOUNT = ethers.parseEther("100");
  
  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockWETH = await MockERC20.deploy("Wrapped ETH", "WETH", INITIAL_SUPPLY);
    mockTokenA = await MockERC20.deploy("Token A", "TOKA", INITIAL_SUPPLY);
    mockTokenB = await MockERC20.deploy("Token B", "TOKB", INITIAL_SUPPLY);
    
    await mockWETH.waitForDeployment();
    await mockTokenA.waitForDeployment();
    await mockTokenB.waitForDeployment();
    
    // Deploy mock DEX contracts
    const MockV2Router = await ethers.getContractFactory("MockUniswapV2Router");
    const MockV2Factory = await ethers.getContractFactory("MockUniswapV2Factory");
    const MockV3Router = await ethers.getContractFactory("MockUniswapV3Router");
    const MockV3Quoter = await ethers.getContractFactory("MockUniswapV3Quoter");
    
    mockV2Router = await MockV2Router.deploy();
    mockV2Factory = await MockV2Factory.deploy();
    mockV3Router = await MockV3Router.deploy();
    mockV3Quoter = await MockV3Quoter.deploy();
    
    await mockV2Router.waitForDeployment();
    await mockV2Factory.waitForDeployment();
    await mockV3Router.waitForDeployment();
    await mockV3Quoter.waitForDeployment();
    
    // Deploy main contracts
    const SwapRouterProxy = await ethers.getContractFactory("SwapRouterProxy");
    const DexAdapterV2 = await ethers.getContractFactory("DexAdapterV2");
    const DexAdapterV3 = await ethers.getContractFactory("DexAdapterV3");
    
    swapRouterProxy = await SwapRouterProxy.deploy(await mockWETH.getAddress());
    dexAdapterV2 = await DexAdapterV2.deploy();
    dexAdapterV3 = await DexAdapterV3.deploy();
    
    await swapRouterProxy.waitForDeployment();
    await dexAdapterV2.waitForDeployment();
    await dexAdapterV3.waitForDeployment();
    
    // Configure adapters
    await dexAdapterV2.setChainConfig(
      31337, // hardhat chain id
      await mockV2Router.getAddress(),
      await mockV2Factory.getAddress(),
      30
    );
    
    await dexAdapterV3.setChainConfig(
      31337,
      await mockV3Router.getAddress(),
      await mockV3Quoter.getAddress(),
      await mockV3Factory.getAddress(),
      [500, 3000, 10000]
    );
    
    // Register adapters
    await swapRouterProxy.setDexAdapter(0, await dexAdapterV2.getAddress()); // UNISWAP_V2
    await swapRouterProxy.setDexAdapter(1, await dexAdapterV3.getAddress()); // UNISWAP_V3
    
    // Set protocol fee
    await swapRouterProxy.setProtocolFee(25); // 0.25%
    
    // Distribute tokens
    await mockTokenA.transfer(user1.address, ethers.parseEther("10000"));
    await mockTokenB.transfer(user1.address, ethers.parseEther("10000"));
    await mockWETH.transfer(user1.address, ethers.parseEther("10000"));
  });
  
  describe("SwapRouterProxy", function () {
    it("Should initialize correctly", async function () {
      expect(await swapRouterProxy.WETH()).to.equal(await mockWETH.getAddress());
      expect(await swapRouterProxy.protocolFee()).to.equal(25);
      expect(await swapRouterProxy.owner()).to.equal(deployer.address);
    });
    
    it("Should register DEX adapters", async function () {
      expect(await swapRouterProxy.dexAdapters(0)).to.equal(await dexAdapterV2.getAddress());
      expect(await swapRouterProxy.dexAdapters(1)).to.equal(await dexAdapterV3.getAddress());
    });
    
    it("Should handle exact tokens for tokens swap", async function () {
      // Setup mock returns
      const expectedOut = ethers.parseEther("95"); // After slippage
      await mockV2Router.setSwapOutput(expectedOut);
      
      // Approve tokens
      await mockTokenA.connect(user1).approve(await swapRouterProxy.getAddress(), SWAP_AMOUNT);
      
      const swapParams = {
        tokenIn: await mockTokenA.getAddress(),
        tokenOut: await mockTokenB.getAddress(),
        amountIn: SWAP_AMOUNT,
        amountOutMin: ethers.parseEther("90"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        dexType: 0, // UNISWAP_V2
        dexParams: "0x"
      };
      
      const initialBalanceA = await mockTokenA.balanceOf(user1.address);
      const initialBalanceB = await mockTokenB.balanceOf(user1.address);
      
      await swapRouterProxy.connect(user1).swapExactTokensForTokens(swapParams);
      
      const finalBalanceA = await mockTokenA.balanceOf(user1.address);
      const finalBalanceB = await mockTokenB.balanceOf(user1.address);
      
      expect(finalBalanceA).to.be.lt(initialBalanceA);
      expect(finalBalanceB).to.be.gt(initialBalanceB);
    });
    
    it("Should handle tokens for exact tokens swap", async function () {
      const expectedAmountIn = ethers.parseEther("105"); // With slippage
      await mockV2Router.setSwapInput(expectedAmountIn);
      
      await mockTokenA.connect(user1).approve(await swapRouterProxy.getAddress(), ethers.parseEther("200"));
      
      const swapParams = {
        tokenIn: await mockTokenA.getAddress(),
        tokenOut: await mockTokenB.getAddress(),
        amountOut: SWAP_AMOUNT,
        amountInMax: ethers.parseEther("110"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        dexType: 0, // UNISWAP_V2
        dexParams: "0x"
      };
      
      const initialBalanceA = await mockTokenA.balanceOf(user1.address);
      const initialBalanceB = await mockTokenB.balanceOf(user1.address);
      
      await swapRouterProxy.connect(user1).swapTokensForExactTokens(swapParams);
      
      const finalBalanceA = await mockTokenA.balanceOf(user1.address);
      const finalBalanceB = await mockTokenB.balanceOf(user1.address);
      
      expect(finalBalanceA).to.be.lt(initialBalanceA);
      expect(finalBalanceB).to.equal(initialBalanceB + SWAP_AMOUNT);
    });
    
    it("Should handle ETH swaps", async function () {
      const expectedOut = ethers.parseEther("95");
      await mockV2Router.setSwapOutput(expectedOut);
      
      const swapParams = {
        tokenIn: ethers.ZeroAddress, // ETH
        tokenOut: await mockTokenA.getAddress(),
        amountIn: SWAP_AMOUNT,
        amountOutMin: ethers.parseEther("90"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        dexType: 0,
        dexParams: "0x"
      };
      
      const initialETHBalance = await ethers.provider.getBalance(user1.address);
      const initialTokenBalance = await mockTokenA.balanceOf(user1.address);
      
      await swapRouterProxy.connect(user1).swapExactETHForTokens(
        swapParams,
        { value: SWAP_AMOUNT }
      );
      
      const finalETHBalance = await ethers.provider.getBalance(user1.address);
      const finalTokenBalance = await mockTokenA.balanceOf(user1.address);
      
      expect(finalETHBalance).to.be.lt(initialETHBalance - SWAP_AMOUNT);
      expect(finalTokenBalance).to.be.gt(initialTokenBalance);
    });
    
    it("Should collect protocol fees", async function () {
      const expectedOut = ethers.parseEther("95");
      await mockV2Router.setSwapOutput(expectedOut);
      
      await mockTokenA.connect(user1).approve(await swapRouterProxy.getAddress(), SWAP_AMOUNT);
      
      const swapParams = {
        tokenIn: await mockTokenA.getAddress(),
        tokenOut: await mockTokenB.getAddress(),
        amountIn: SWAP_AMOUNT,
        amountOutMin: ethers.parseEther("90"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        dexType: 0,
        dexParams: "0x"
      };
      
      await swapRouterProxy.connect(user1).swapExactTokensForTokens(swapParams);
      
      const feeBalance = await mockTokenB.balanceOf(await swapRouterProxy.getAddress());
      expect(feeBalance).to.be.gt(0);
    });
    
    it("Should revert with expired deadline", async function () {
      await mockTokenA.connect(user1).approve(await swapRouterProxy.getAddress(), SWAP_AMOUNT);
      
      const swapParams = {
        tokenIn: await mockTokenA.getAddress(),
        tokenOut: await mockTokenB.getAddress(),
        amountIn: SWAP_AMOUNT,
        amountOutMin: ethers.parseEther("90"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) - 3600, // Expired
        dexType: 0,
        dexParams: "0x"
      };
      
      await expect(
        swapRouterProxy.connect(user1).swapExactTokensForTokens(swapParams)
      ).to.be.revertedWith("SwapRouterProxy: EXPIRED");
    });
    
    it("Should revert with insufficient output", async function () {
      const expectedOut = ethers.parseEther("80"); // Below minimum
      await mockV2Router.setSwapOutput(expectedOut);
      
      await mockTokenA.connect(user1).approve(await swapRouterProxy.getAddress(), SWAP_AMOUNT);
      
      const swapParams = {
        tokenIn: await mockTokenA.getAddress(),
        tokenOut: await mockTokenB.getAddress(),
        amountIn: SWAP_AMOUNT,
        amountOutMin: ethers.parseEther("90"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        dexType: 0,
        dexParams: "0x"
      };
      
      await expect(
        swapRouterProxy.connect(user1).swapExactTokensForTokens(swapParams)
      ).to.be.revertedWith("SwapRouterProxy: INSUFFICIENT_OUTPUT_AMOUNT");
    });
  });
  
  describe("DexAdapterV2", function () {
    it("Should calculate correct price impact", async function () {
      const reserveIn = ethers.parseEther("10000");
      const reserveOut = ethers.parseEther("10000");
      const amountIn = ethers.parseEther("100");
      
      await mockV2Factory.setPairReserves(reserveIn, reserveOut);
      
      const priceImpact = await dexAdapterV2.calculatePriceImpact(
        await mockTokenA.getAddress(),
        await mockTokenB.getAddress(),
        amountIn
      );
      
      expect(priceImpact).to.be.gt(0);
      expect(priceImpact).to.be.lt(1000); // Less than 10%
    });
    
    it("Should handle fee-on-transfer tokens", async function () {
      const expectedOut = ethers.parseEther("95");
      await mockV2Router.setSwapOutput(expectedOut);
      
      const params = {
        tokenIn: await mockTokenA.getAddress(),
        tokenOut: await mockTokenB.getAddress(),
        amountIn: SWAP_AMOUNT,
        amountOutMin: ethers.parseEther("90"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        supportsFeeOnTransfer: true
      };
      
      await dexAdapterV2.connect(user1).executeSwap(params, "0x");
      
      // Should not revert even with fee-on-transfer
    });
  });
  
  describe("DexAdapterV3", function () {
    it("Should handle single-hop swaps", async function () {
      const expectedOut = ethers.parseEther("95");
      await mockV3Router.setSwapOutput(expectedOut);
      await mockV3Quoter.setQuote(expectedOut);
      
      const params = {
        tokenIn: await mockTokenA.getAddress(),
        tokenOut: await mockTokenB.getAddress(),
        amountIn: SWAP_AMOUNT,
        amountOutMin: ethers.parseEther("90"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        fee: 3000,
        sqrtPriceLimitX96: 0
      };
      
      const pathData = ethers.solidityPacked(
        ["address", "uint24", "address"],
        [await mockTokenA.getAddress(), 3000, await mockTokenB.getAddress()]
      );
      
      await dexAdapterV3.connect(user1).executeSwap(params, pathData);
      
      // Should execute without revert
    });
    
    it("Should handle multi-hop swaps", async function () {
      const mockTokenC = await (await ethers.getContractFactory("MockERC20"))
        .deploy("Token C", "TOKC", INITIAL_SUPPLY);
      await mockTokenC.waitForDeployment();
      
      const expectedOut = ethers.parseEther("90");
      await mockV3Router.setSwapOutput(expectedOut);
      await mockV3Quoter.setQuote(expectedOut);
      
      const params = {
        tokenIn: await mockTokenA.getAddress(),
        tokenOut: await mockTokenB.getAddress(),
        amountIn: SWAP_AMOUNT,
        amountOutMin: ethers.parseEther("85"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        fee: 3000,
        sqrtPriceLimitX96: 0
      };
      
      // Multi-hop path: TokenA -> TokenC -> TokenB
      const pathData = ethers.solidityPacked(
        ["address", "uint24", "address", "uint24", "address"],
        [
          await mockTokenA.getAddress(), 3000,
          await mockTokenC.getAddress(), 3000,
          await mockTokenB.getAddress()
        ]
      );
      
      await dexAdapterV3.connect(user1).executeSwap(params, pathData);
      
      // Should execute without revert
    });
    
    it("Should optimize fee tier selection", async function () {
      await mockV3Quoter.setQuote(ethers.parseEther("95"));
      
      const bestFee = await dexAdapterV3.findBestFeeTier(
        await mockTokenA.getAddress(),
        await mockTokenB.getAddress(),
        SWAP_AMOUNT,
        true
      );
      
      expect([500, 3000, 10000]).to.include(Number(bestFee));
    });
  });
  
  describe("Access Control", function () {
    it("Should only allow owner to set adapters", async function () {
      await expect(
        swapRouterProxy.connect(user1).setDexAdapter(2, await dexAdapterV2.getAddress())
      ).to.be.revertedWithCustomError(swapRouterProxy, "OwnableUnauthorizedAccount");
    });
    
    it("Should only allow owner to set protocol fee", async function () {
      await expect(
        swapRouterProxy.connect(user1).setProtocolFee(50)
      ).to.be.revertedWithCustomError(swapRouterProxy, "OwnableUnauthorizedAccount");
    });
    
    it("Should reject protocol fee above maximum", async function () {
      await expect(
        swapRouterProxy.setProtocolFee(1001) // > 10%
      ).to.be.revertedWith("SwapRouterProxy: fee too high");
    });
  });
  
  describe("Emergency Functions", function () {
    it("Should allow pausing and unpausing", async function () {
      await swapRouterProxy.pause();
      expect(await swapRouterProxy.paused()).to.be.true;
      
      await mockTokenA.connect(user1).approve(await swapRouterProxy.getAddress(), SWAP_AMOUNT);
      
      const swapParams = {
        tokenIn: await mockTokenA.getAddress(),
        tokenOut: await mockTokenB.getAddress(),
        amountIn: SWAP_AMOUNT,
        amountOutMin: ethers.parseEther("90"),
        to: user1.address,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        dexType: 0,
        dexParams: "0x"
      };
      
      await expect(
        swapRouterProxy.connect(user1).swapExactTokensForTokens(swapParams)
      ).to.be.revertedWithCustomError(swapRouterProxy, "EnforcedPause");
      
      await swapRouterProxy.unpause();
      expect(await swapRouterProxy.paused()).to.be.false;
    });
    
    it("Should allow emergency token withdrawal", async function () {
      await mockTokenA.transfer(await swapRouterProxy.getAddress(), SWAP_AMOUNT);
      
      const initialBalance = await mockTokenA.balanceOf(deployer.address);
      
      await swapRouterProxy.emergencyWithdraw(
        await mockTokenA.getAddress(),
        SWAP_AMOUNT,
        deployer.address
      );
      
      const finalBalance = await mockTokenA.balanceOf(deployer.address);
      expect(finalBalance).to.equal(initialBalance + SWAP_AMOUNT);
    });
  });
});