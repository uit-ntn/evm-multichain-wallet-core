const { expect } = require("chai");
const hre = require("hardhat");

describe("Nghiệp vụ 1 – LimitOrder (EIP-712)", function () {
  let owner, user, executor;
  let tokenIn, tokenOut, limitOrder;

  const toWei = (n) => hre.ethers.utils.parseEther(String(n));

  async function deployTradeToken(name, symbol) {
    const TradeToken = await hre.ethers.getContractFactory("TradeToken");
    const maxSupply = toWei(1_000_000);
    const initialMint = toWei(0);

    // Thử nhiều kiểu constructor để hợp mọi biến thể TradeToken bạn đang dùng
    const candidates = [
      () => TradeToken.deploy(name, symbol, maxSupply, initialMint), // (name,symbol,maxSupply,initialMint)
      () => TradeToken.deploy(name, symbol, owner.address, owner.address), // (name,symbol,initialOwner,feeRecipient)
      () => TradeToken.deploy(name, symbol), // (name,symbol)
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
    // ưu tiên mint nếu có
    if (token.mint) {
      try {
        await (await token.connect(owner).mint(to, amount)).wait();
        return;
      } catch (_) {}
    }
    // fallback transfer nếu owner có sẵn
    const balOwner = await token.balanceOf(owner.address);
    if (balOwner.gte(amount)) {
      await (await token.connect(owner).transfer(to, amount)).wait();
      return;
    }
    throw new Error("Cannot fund test account with token (no mint / owner no balance)");
  }

  async function getChainId() {
    const net = await hre.ethers.provider.getNetwork();
    return Number(net.chainId);
  }

  function buildTypedData({ chainId, verifyingContract, value }) {
    const domain = {
      name: "LimitOrder",
      version: "1",
      chainId,
      verifyingContract,
    };

    const types = {
      Order: [
        { name: "user", type: "address" },
        { name: "tokenIn", type: "address" },
        { name: "tokenOut", type: "address" },
        { name: "amountIn", type: "uint256" },
        { name: "minAmountOut", type: "uint256" },
        { name: "limitPrice", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    };

    return { domain, types, value };
  }

  beforeEach(async () => {
    [owner, user, executor] = await hre.ethers.getSigners();

    tokenIn = await deployTradeToken("TokenIn", "TIN");
    tokenOut = await deployTradeToken("TokenOut", "TOUT");

    const LimitOrder = await hre.ethers.getContractFactory("LimitOrder");
    limitOrder = await LimitOrder.deploy();
    await limitOrder.deployed();

    await ensureBalance(tokenIn, user.address, toWei(1000));
    await ensureBalance(tokenOut, executor.address, toWei(1000));
  });

  it("Create (EIP712) -> execute partial -> cancel remaining (settlement đúng)", async () => {
    const amountIn = toWei(100);
    const minAmountOut = toWei(200);
    const limitPrice = toWei(2); // 2 tokenOut / 1 tokenIn (scale 1e18)
    const deadline = (await hre.ethers.provider.getBlock("latest")).timestamp + 3600;

    const nonce = await limitOrder.getUserNonce(user.address);
    const chainId = await getChainId();

    const value = {
      user: user.address,
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn,
      minAmountOut,
      limitPrice,
      deadline,
      nonce: nonce.toString(),
    };

    // approve tokenIn cho createOrder pull
    await (await tokenIn.connect(user).approve(limitOrder.address, amountIn)).wait();

    const { domain, types } = buildTypedData({
      chainId,
      verifyingContract: limitOrder.address,
      value,
    });

    const sig = await user._signTypedData(domain, types, value);

    // relayer/anyone submit
    await (await limitOrder.connect(owner).createOrder(
      user.address,
      tokenIn.address,
      tokenOut.address,
      amountIn,
      minAmountOut,
      limitPrice,
      deadline,
      nonce,
      sig
    )).wait();

    const orderId = await limitOrder.orderCount();
    const order = await limitOrder.getOrder(orderId);
    expect(order.user).to.eq(user.address);

    // partial fill 40 -> 80
    const amountToFill = toWei(40);
    const amountOut = toWei(80);

    // executor approve tokenOut cho executeOrder transferFrom
    await (await tokenOut.connect(executor).approve(limitOrder.address, toWei(1000))).wait();

    const balUserOutBefore = await tokenOut.balanceOf(user.address);
    const balExecInBefore = await tokenIn.balanceOf(executor.address);

    await (await limitOrder.connect(executor).executeOrder(orderId, amountToFill, amountOut)).wait();

    const balUserOutAfter = await tokenOut.balanceOf(user.address);
    const balExecInAfter = await tokenIn.balanceOf(executor.address);

    const feeRate = await limitOrder.feeRate(); // bps
    const fee = amountOut.mul(feeRate).div(10000);
    const userReceives = amountOut.sub(fee);

    expect(balUserOutAfter.sub(balUserOutBefore)).to.eq(userReceives);
    expect(balExecInAfter.sub(balExecInBefore)).to.eq(amountToFill);

    // cancel remaining 60
    const balUserInBeforeCancel = await tokenIn.balanceOf(user.address);
    await (await limitOrder.connect(user).cancelOrder(orderId)).wait();
    const balUserInAfterCancel = await tokenIn.balanceOf(user.address);

    expect(balUserInAfterCancel.sub(balUserInBeforeCancel)).to.eq(toWei(60));

    const remaining = await limitOrder.getRemainingAmount(orderId);
    expect(remaining).to.eq(0);
  });

  it("Reject createOrder if nonce mismatch (revert đúng message)", async () => {
    const amountIn = toWei(10);
    await (await tokenIn.connect(user).approve(limitOrder.address, amountIn)).wait();

    const chainId = await getChainId();
    const nonceOnchain = await limitOrder.getUserNonce(user.address);
    const wrongNonce = nonceOnchain.add(1);

    const value = {
      user: user.address,
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn,
      minAmountOut: toWei(1),
      limitPrice: toWei(1),
      deadline: (await hre.ethers.provider.getBlock("latest")).timestamp + 3600,
      nonce: wrongNonce.toString(),
    };

    const { domain, types } = buildTypedData({
      chainId,
      verifyingContract: limitOrder.address,
      value,
    });

    const sig = await user._signTypedData(domain, types, value);

    await expect(
      limitOrder.connect(owner).createOrder(
        user.address,
        tokenIn.address,
        tokenOut.address,
        amountIn,
        value.minAmountOut,
        value.limitPrice,
        value.deadline,
        wrongNonce,
        sig
      )
    ).to.be.revertedWith("Invalid nonce");
  });
});
