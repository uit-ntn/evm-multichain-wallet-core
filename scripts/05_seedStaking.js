const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/* =======================
   Helper functions
======================= */

function deploymentsPath(network) {
  return path.join(__dirname, "..", "deployments", `${network}.json`);
}

function loadDeployments(network) {
  const p = deploymentsPath(network);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/* =======================
   Main
======================= */

async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  const d = loadDeployments(network);

  console.log("🌱 Seed Staking Data");
  console.log("Network :", network);
  console.log("Deployer:", deployer.address);

  if (!d.tradeToken || !d.stakingRewards) {
    throw new Error("❌ Missing contracts. Run deployment scripts first.");
  }

  console.log("📍 TradeToken:", d.tradeToken);
  console.log("📍 Staking   :", d.stakingRewards);

  const tradeToken = await hre.ethers.getContractAt("TradeToken", d.tradeToken);
  const staking = await hre.ethers.getContractAt("StakingRewards", d.stakingRewards);

  // Check current balances
  const currentBalance = await tradeToken.balanceOf(deployer.address);
  console.log("💰 Current TRADE balance:", hre.ethers.utils.formatEther(currentBalance));

  const userInfo = await staking.getUserInfo(deployer.address);
  console.log("🔒 Currently staked:", hre.ethers.utils.formatEther(userInfo.balance));

  const STAKE_AMOUNT = hre.ethers.utils.parseEther("1000"); // 1,000 TRADE

  /* =======================
     1) Mint TRADE if needed
  ======================= */

  if (currentBalance.lt(STAKE_AMOUNT)) {
    console.log("⏳ Minting TRADE tokens...");
    const mintTx = await tradeToken.mint(deployer.address, STAKE_AMOUNT.mul(2)); // Mint 2x for safety
    await mintTx.wait();
    console.log("✅ Minted 2000 TRADE tokens");
  } else {
    console.log("ℹ️ Sufficient TRADE balance, skipping mint");
  }

  /* =======================
     2) Approve staking contract
  ======================= */

  console.log("⏳ Approving staking contract...");
  const approveTx = await tradeToken.approve(staking.address, STAKE_AMOUNT);
  await approveTx.wait();
  console.log("✅ Approved staking contract");

  /* =======================
     3) Stake tokens
  ======================= */

  console.log("⏳ Staking tokens...");
  const stakeTx = await staking.stake(STAKE_AMOUNT);
  await stakeTx.wait();
  console.log("✅ Staked 1000 TRADE tokens");

  /* =======================
     4) Check results
  ======================= */

  const poolInfo = await staking.getPoolInfo();
  const finalUserInfo = await staking.getUserInfo(deployer.address);

  console.log("\n📊 STAKING SUMMARY");
  console.log("Total Staked  :", hre.ethers.utils.formatEther(poolInfo.totalStaked), "TRADE");
  console.log("User Staked   :", hre.ethers.utils.formatEther(finalUserInfo.balance), "TRADE");
  console.log("Pending Rewards:", hre.ethers.utils.formatEther(finalUserInfo.pendingRewards), "TRADE");
  console.log("Current APR   :", poolInfo.currentAPR.toNumber() / 100, "%");
  console.log("Stake TX      :", stakeTx.hash);

  console.log("\n🎉 DONE! Reload frontend to see staking data");
  console.log("💡 Rewards will accumulate over time based on reward rate");
}

/* =======================
   Run
======================= */

main().catch((err) => {
  console.error("❌ Seed staking failed:", err);
  process.exit(1);
});