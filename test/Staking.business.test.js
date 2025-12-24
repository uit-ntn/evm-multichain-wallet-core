const { expect } = require("chai");
const hre = require("hardhat");

describe("Nghiệp vụ 3 – StakingRewards", function () {
  let owner, user;
  let token, staking;

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

    token = await deployTradeToken("Stake Token", "STK");

    const Staking = await hre.ethers.getContractFactory("StakingRewards");
    staking = await Staking.deploy(
      token.address,                 // stakingToken
      token.address,                 // rewardToken
      toWei(10_000),                 // stakingCap
      toWei(1_000),                  // rewardCap
      toWei(10),                     // minStakeAmount
      7 * 24 * 60 * 60               // lockPeriod
    );
    await staking.deployed();

    // Fund owner + user
    await ensureBalance(token, owner.address, toWei(10_000));
    await ensureBalance(token, user.address, toWei(1_000));
  });

  it("User can stake tokens", async () => {
    await (await token.connect(user).approve(staking.address, toWei(100))).wait();
    await (await staking.connect(user).stake(toWei(100))).wait();

    const u = await staking.userInfo(user.address);
    expect(u.balance).to.eq(toWei(100));
  });

  it("User can withdraw after lock period", async () => {
    await (await token.connect(user).approve(staking.address, toWei(100))).wait();
    await (await staking.connect(user).stake(toWei(100))).wait();

    await hre.ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await hre.ethers.provider.send("evm_mine", []);

    await (await staking.connect(user).withdraw(toWei(50))).wait();

    const u = await staking.userInfo(user.address);
    expect(u.balance).to.eq(toWei(50));
  });

  it("User can claim rewards when epoch active", async () => {
    // stake
    await (await token.connect(user).approve(staking.address, toWei(100))).wait();
    await (await staking.connect(user).stake(toWei(100))).wait();

    // create epoch (start soon)
    const now = (await hre.ethers.provider.getBlock("latest")).timestamp;
    const epochStart = now + 10;
    const epochDuration = 1000;               // ~16 phút
    const epochRewards = toWei(100);          // 100 tokens

    await (await staking.connect(owner).createEpoch(epochStart, epochDuration, epochRewards)).wait();

    // fund rewards to contract (rewardToken = token)
    await (await token.connect(owner).transfer(staking.address, epochRewards)).wait();

    // move time to start
    await hre.ethers.provider.send("evm_increaseTime", [11]);
    await hre.ethers.provider.send("evm_mine", []);

    await (await staking.connect(owner).activateEpoch(1)).wait();

    // time passes to accumulate rewards
    await hre.ethers.provider.send("evm_increaseTime", [100]);
    await hre.ethers.provider.send("evm_mine", []);

    const balBefore = await token.balanceOf(user.address);
    await (await staking.connect(user).claimRewards()).wait();
    const balAfter = await token.balanceOf(user.address);

    // Sau khi stake 100, user còn 900. Claim xong phải tăng lên (có reward)
    expect(balAfter).to.be.gt(balBefore);
  });
});
