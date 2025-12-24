const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/* =======================
   Helpers: deployments
======================= */
function deploymentsPath(network) {
  return path.join(__dirname, "..", "deployments", `${network}.json`);
}
function loadDeployments(network) {
  const p = deploymentsPath(network);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function saveDeployments(network, data) {
  const p = deploymentsPath(network);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

/* =======================
   Helper: registry upsert
======================= */
async function upsert(registry, name, addr) {
  const cur = await registry.contractOf(name);
  const zero = hre.ethers.constants.AddressZero;

  if (cur && cur !== zero) {
    if (cur.toLowerCase() === addr.toLowerCase()) {
      console.log(`ℹ️ Registry keep ${name}: ${addr}`);
      return;
    }
    await (await registry.updateContract(name, addr)).wait();
    console.log(`✅ Registry updated ${name}: ${addr}`);
  } else {
    await (await registry.registerContract(name, addr)).wait();
    console.log(`✅ Registry registered ${name}: ${addr}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitUntil(ts) {
  while (true) {
    const latest = await hre.ethers.provider.getBlock("latest");
    if (latest.timestamp >= ts) break;
    process.stdout.write(".");
    await sleep(1000);
  }
  process.stdout.write("\n");
}

/* =======================
   Main
======================= */
async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  const d = loadDeployments(network);

  console.log("🚀 Deploy Nghiệp vụ 3 - Staking (FAST DEMO EPOCH)");
  console.log("Network :", network);
  console.log("Deployer:", deployer.address);

  if (!d.registry) {
    throw new Error("❌ Missing registry. Run scripts/00_registry.js first.");
  }

  const registry = await hre.ethers.getContractAt("Registry", d.registry);

  /* =======================
     1) Ensure TradeToken exists
  ======================= */
  let tokenAddr = d.tradeToken;

  if (!tokenAddr || tokenAddr === hre.ethers.constants.AddressZero) {
    console.log("⚠️ TradeToken not found. Deploying new TradeToken...");

    const TradeToken = await hre.ethers.getContractFactory("TradeToken");
    const MAX_SUPPLY = hre.ethers.utils.parseEther("1000000");
    const INITIAL_MINT = hre.ethers.utils.parseEther("300000");

    const token = await TradeToken.deploy("Trade Token", "TRADE", MAX_SUPPLY, INITIAL_MINT);
    await token.deployed();

    tokenAddr = token.address;
    d.tradeToken = tokenAddr;

    console.log("✅ TradeToken deployed:", tokenAddr);
    await upsert(registry, "TRADE_TOKEN", tokenAddr);
  } else {
    console.log("✅ Using existing TradeToken:", tokenAddr);
  }

  /* =======================
     2) Deploy StakingRewards
  ======================= */
  const REDEPLOY = true; // đổi false nếu muốn dùng staking cũ

  let stakingAddr = d.stakingRewards;

  if (!stakingAddr || stakingAddr === hre.ethers.constants.AddressZero || REDEPLOY) {
    console.log("⚙️ Deploying new StakingRewards...");

    const stakingCap = hre.ethers.utils.parseEther("10000000"); // 10M
    const rewardCap = hre.ethers.utils.parseEther("1000000");   // 1M
    const minStakeAmount = hre.ethers.utils.parseEther("100");  // 100 TRADE
    const lockPeriod = 7 * 24 * 60 * 60; // 7 days

    const StakingRewards = await hre.ethers.getContractFactory("StakingRewards");
    const staking = await StakingRewards.deploy(
      tokenAddr,
      tokenAddr,
      stakingCap,
      rewardCap,
      minStakeAmount,
      lockPeriod
    );
    await staking.deployed();

    stakingAddr = staking.address;
    d.stakingRewards = stakingAddr;

    console.log("✅ StakingRewards deployed:", stakingAddr);
    await upsert(registry, "STAKING_REWARDS", stakingAddr);
  } else {
    console.log("✅ Using existing StakingRewards:", stakingAddr);
  }

  const staking = await hre.ethers.getContractAt("StakingRewards", stakingAddr);
  const token = await hre.ethers.getContractAt("TradeToken", tokenAddr);

  /* =======================
     3) FAST DEMO EPOCH (FIXED TIME SOURCE)
  ======================= */
  console.log("⚙️ Setup FAST demo epoch + fund rewards...");

  const latest = await hre.ethers.provider.getBlock("latest");
  const chainNow = latest.timestamp;

  const epochStart = chainNow + 60;          // ✅ buffer 60s để tránh “Start time in past”
  const epochDuration = 10 * 60;             // 10 phút
  const epochRewards = hre.ethers.utils.parseEther("10000"); // 10k TRADE

  // Fund rewards
  await (await token.transfer(stakingAddr, epochRewards)).wait();
  console.log("✅ Funded rewards:", hre.ethers.utils.formatEther(epochRewards), "TRADE");

  // Create epoch
  // (Nếu vẫn fail, bạn sẽ thấy revert reason rõ hơn nếu gọi estimateGas trước)
  await staking.estimateGas.createEpoch(epochStart, epochDuration, epochRewards);
  await (await staking.createEpoch(epochStart, epochDuration, epochRewards)).wait();
  console.log("✅ Epoch created");

  const epochId = await staking.totalEpochs();
  console.log("ℹ️ New epochId:", epochId.toString());
  console.log(`⏳ Waiting epoch start @ ${new Date(epochStart * 1000).toLocaleString()}`);

  await waitUntil(epochStart);

  await staking.estimateGas.activateEpoch(epochId);
  await (await staking.activateEpoch(epochId)).wait();
  console.log("✅ Epoch activated:", epochId.toString());

  const currentEpoch = await staking.currentEpoch();
  const aprBps = await staking.getCurrentAPR();

  console.log("ℹ️ currentEpoch:", currentEpoch.toString());
  console.log("ℹ️ APR(bps):", aprBps.toString(), "=>", (Number(aprBps) / 100).toFixed(2), "%");

  saveDeployments(network, d);

  console.log("\n📦 DEPLOY SUMMARY");
  console.log("Registry       :", d.registry);
  console.log("TradeToken     :", d.tradeToken);
  console.log("StakingRewards :", d.stakingRewards);
  console.log("EpochId        :", currentEpoch.toString());
  console.log("📄 Saved       :", `deployments/${network}.json`);

  console.log("\n✅ DEMO CLAIM:");
  console.log("- FE stake >= 100 TRADE");
  console.log("- Đợi 10~30s rồi Refresh => Rewards > 0");
  console.log("- Bấm Claim Rewards");
}

main().catch((err) => {
  console.error("❌ Deploy failed:", err);
  process.exit(1);
});
