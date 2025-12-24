// scripts/simple_stake.js - Simple staking without epochs
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadDeployments(network) {
  const p = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  const { ethers } = hre;
  const network = hre.network.name;
  const [deployer] = await ethers.getSigners();
  const d = loadDeployments(network);

  console.log("💎 Simple Staking Test");
  console.log("Network :", network);
  console.log("Deployer:", deployer.address);

  if (!d.stakingRewards) {
    throw new Error("❌ Missing stakingRewards address");
  }

  if (!d.tradeToken) {
    throw new Error("❌ Missing tradeToken address");
  }

  // Get contracts
  const staking = await ethers.getContractAt("StakingRewards", d.stakingRewards);
  
  // Get the actual staking token address from contract
  const stakingTokenAddr = await staking.stakingToken();
  const stakingToken = await ethers.getContractAt("TradeToken", stakingTokenAddr);
  
  console.log(`Using staking token: ${stakingTokenAddr}`);

  console.log("\n📊 Current Status:");
  
  // Check current balances
  const deployerBalance = await stakingToken.balanceOf(deployer.address);
  console.log(`Deployer staking token balance: ${ethers.utils.formatEther(deployerBalance)}`);

  // Check staking token info
  const rewardTokenAddr = await staking.rewardToken();
  console.log(`Staking token: ${stakingTokenAddr}`);
  console.log(`Reward token: ${rewardTokenAddr}`);
  console.log(`Deployment TRADE token: ${d.tradeToken}`);

  // Check pool info
  try {
    const poolInfo = await staking.getPoolInfo();
    console.log(`Total staked: ${ethers.utils.formatEther(poolInfo[0])} TRADE`);
    console.log(`Min stake: ${ethers.utils.formatEther(poolInfo[3])} TRADE`);
    console.log(`Lock period: ${poolInfo[4].toString()} seconds`);
  } catch (e) {
    console.log("⚠️ Cannot read pool info:", e.message);
  }

  // Simple stake
  const STAKE_AMOUNT = process.env.STAKE_AMOUNT || "1000"; // 1000 TRADE
  const stakeAmountWei = ethers.utils.parseEther(STAKE_AMOUNT);

  console.log(`\n💎 Staking ${STAKE_AMOUNT} TRADE...`);

  // Check if we have enough balance
  if (deployerBalance.lt(stakeAmountWei)) {
    throw new Error(`❌ Insufficient TRADE balance. Need ${ethers.utils.formatEther(stakeAmountWei)} but have ${ethers.utils.formatEther(deployerBalance)}`);
  }

  try {
    // Approve staking contract
    console.log("✅ Approving staking contract...");
    const approveTx = await stakingToken.approve(staking.address, stakeAmountWei);
    await approveTx.wait();
    console.log("✅ Approved");

    // Stake tokens
    console.log("✅ Staking tokens...");
    const stakeTx = await staking.stake(stakeAmountWei);
    await stakeTx.wait();
    console.log(`✅ Staked ${STAKE_AMOUNT} TRADE`);

    // Check results
    console.log("\n📊 Final Status:");
    const finalPoolInfo = await staking.getPoolInfo();
    const userInfo = await staking.getUserInfo(deployer.address);

    console.log(`Total staked: ${ethers.utils.formatEther(finalPoolInfo[0])} TRADE`);
    console.log(`User staked: ${ethers.utils.formatEther(userInfo[0])} TRADE`);
    console.log(`User can withdraw at: ${new Date(Number(userInfo[4]) * 1000).toLocaleString()}`);

    console.log("\n🎉 Simple staking completed!");
    console.log("Now refresh the frontend to see non-zero staked values!");

  } catch (error) {
    console.error("❌ Staking failed:", error);
    
    // Try to get more info about the error
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.code) {
      console.error("Code:", error.code);
    }
    
    throw error;
  }
}

main().catch((err) => {
  console.error("❌ Simple stake failed:", err);
  process.exit(1);
});
