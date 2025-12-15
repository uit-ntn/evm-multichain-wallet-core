const { expect } = require("chai");
const hre = require("hardhat");

describe("Nghiệp vụ 2 – SwapRouterProxy + UniswapV2Adapter (sanity / revert / validation)", function () {
  let owner, user;
  let tokenA, tokenB, fakeRouter, adapter, routerProxy;

  const toWei = (n) => hre.ethers.utils.parseEther(String(n));

  async function deployTradeToken(name, symbol) {
    const TradeToken = await hre.ethers.getContractFactory("TradeToken");
    const maxSupply = toWei(1_000_000);
    const initialMint = toWei(0);

    const candidates = [
      () => TradeToken.deploy(name, symbol, maxSupply, initialMint),
      () => TradeToken.deploy(name, symbol, owner.address, owner.address),
      () => TradeToken.deploy(name, symbol),
    ];

    let lastErr;
    for (const fn of candidates) {
      try {
        const c = await fn();
        await c.deployed();
        return c;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }

  async function ensureBalance(token, to, amount) {
    if (token.mint) {
      try {
        await (await token.connect(owner).mint(to, amount)).wait();
        return;
      } catch (_) {}
    }
    const balOwner = await token.balanceOf(owner.address);
    if (balOwner.gte(amount)) {
      await (await token.connect(owner).transfer(to, amount)).wait();
      return;
    }
    throw new Error("Cannot fund test account with token (no mint / owner no balance)");
  }

  beforeEach(async () => {
    [owner, user] = await hre.ethers.getSigners();

    tokenA = await deployTradeToken("TokenA", "TKA");
    tokenB = await deployTradeToken("TokenB", "TKB");
    await ensureBalance(tokenA, user.address, toWei(1000));

    // fakeRouter dùng Registry (có code nhưng không có func UniswapV2Router02) => adapter sẽ revert khi gọi
    const Registry = await hre.ethers.getContractFactory("Registry");
    fakeRouter = await Registry.deploy();
    await fakeRouter.deployed();

    const UniswapV2Adapter = await hre.ethers.getContractFactory("UniswapV2Adapter");
    adapter = await UniswapV2Adapter.deploy(fakeRouter.address, tokenA.address /*WETH dummy*/);
    await adapter.deployed();

    const SwapRouterProxy = await hre.ethers.getContractFactory("SwapRouterProxy");
    routerProxy = await SwapRouterProxy.deploy(tokenA.address /*WETH*/);
    await routerProxy.deployed();

    // DexType.UNISWAP_V2 = 0
    await (await routerProxy.connect(owner).setDexAdapter(0, adapter.address)).wait();
    await (await routerProxy.connect(owner).setSupportedToken(tokenA.address, true)).wait();
    await (await routerProxy.connect(owner).setSupportedToken(tokenB.address, true)).wait();
  });

  it("getAmountOut should revert with Router: quote failed (router giả)", async () => {
    await expect(
      routerProxy.getAmountOut(tokenA.address, tokenB.address, toWei(1), 0, "0x")
    ).to.be.revertedWith("Router: quote failed");
  });

  it("swapExact should revert with Router: adapter call failed (adapter gọi router giả)", async () => {
    await (await tokenA.connect(user).approve(routerProxy.address, toWei(10))).wait();

    const p = {
      tokenIn: tokenA.address,
      tokenOut: tokenB.address,
      amountIn: toWei(10),
      amountOutMin: 0,
      to: user.address,
      deadline: (await hre.ethers.provider.getBlock("latest")).timestamp + 3600,
      dexType: 0,
      extraData: "0x",
    };

    await expect(routerProxy.connect(user).swapExactTokensForTokens(p))
      .to.be.revertedWith("Router: adapter call failed");
  });

  it("swapExact should revert if token not supported (validation trước)", async () => {
    await (await routerProxy.connect(owner).setSupportedToken(tokenB.address, false)).wait();
    await (await tokenA.connect(user).approve(routerProxy.address, toWei(1))).wait();

    const p = {
      tokenIn: tokenA.address,
      tokenOut: tokenB.address,
      amountIn: toWei(1),
      amountOutMin: 0,
      to: user.address,
      deadline: (await hre.ethers.provider.getBlock("latest")).timestamp + 3600,
      dexType: 0,
      extraData: "0x",
    };

    await expect(routerProxy.connect(user).swapExactTokensForTokens(p))
      .to.be.revertedWith("Router: token not supported");
  });

  it("swapExact should revert if deadline expired", async () => {
    await (await tokenA.connect(user).approve(routerProxy.address, toWei(1))).wait();

    const p = {
      tokenIn: tokenA.address,
      tokenOut: tokenB.address,
      amountIn: toWei(1),
      amountOutMin: 0,
      to: user.address,
      deadline: (await hre.ethers.provider.getBlock("latest")).timestamp - 1,
      dexType: 0,
      extraData: "0x",
    };

    await expect(routerProxy.connect(user).swapExactTokensForTokens(p))
      .to.be.revertedWith("Router: deadline expired");
  });
});
