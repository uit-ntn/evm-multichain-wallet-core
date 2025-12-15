const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

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

async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  const d = loadDeployments(network);

  console.log("🚀 Deploy Nghiệp vụ 3 - Staking");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);

  if (!d.registry) {
    throw new Error("❌ Missing d.registry. Hãy chạy scripts/00_registry.js trước.");
  }
  const registry = await hre.ethers.getContractAt("Registry", d.registry);

  // =========================
  // 1) Ensure TradeToken exists
  // =========================
  let tokenAddr = d.tradeToken;

  if (!tokenAddr) {
    console.log("⚠️ deployments chưa có tradeToken => deploy TradeToken mới để staking/reward...");

    const TradeToken = await hre.ethers.getContractFactory("TradeToken");
    const MAX_SUPPLY = hre.ethers.utils.parseEther("1000000");
    const INITIAL_MINT = hre.ethers.utils.parseEther("300000"); // mint nhiều hơn để đủ nạp reward

    const token = await TradeToken.deploy(
      "Trade Token",
      "TRADE",
      MAX_SUPPLY,
      INITIAL_MINT
    );
    await token.deployed();

    tokenAddr = token.address;
    d.tradeToken = tokenAddr;

    console.log("✅ TradeToken deployed:", tokenAddr);
    await upsert(registry, "TRADE_TOKEN", tokenAddr);
  } else {
    console.log("✅ Use existing TradeToken:", tokenAddr);
  }

  // =========================
  // 2) Deploy StakingRewards
  // =========================
  const stakingCap = hre.ethers.utils.parseEther("10000000"); // 10M
  const rewardCap = hre.ethers.utils.parseEther("1000000");   // 1M
  const minStakeAmount = hre.ethers.utils.parseEther("100");  // 100
  const lockPeriod = 7 * 24 * 60 * 60; // 7 days

  const StakingRewards = await hre.ethers.getContractFactory("StakingRewards");
  const staking = await StakingRewards.deploy(
    tokenAddr,       // stakingToken
    tokenAddr,       // rewardToken
    stakingCap,
    rewardCap,
    minStakeAmount,
    lockPeriod
  );
  await staking.deployed();

  console.log("✅ StakingRewards deployed:", staking.address);

  d.stakingRewards = staking.address;

  // register/update staking in registry
  await upsert(registry, "STAKING", staking.address);

  // =========================
  // 3) Setup epoch + fund rewards + activate
  // =========================
  console.log("⚙️ Setup epoch + fund rewards...");

  const token = await hre.ethers.getContractAt("TradeToken", tokenAddr);

  const now = Math.floor(Date.now() / 1000);
  const epochStart = now + 10;               // start sau 10s
  const epochDuration = 30 * 24 * 60 * 60;  // 30 days
  const epochRewards = hre.ethers.utils.parseEther("100000"); // 100k

  await (await staking.createEpoch(epochStart, epochDuration, epochRewards)).wait();
  console.log("✅ Epoch 1 created. Start:", new Date(epochStart * 1000).toISOString());

  // chuyển reward vào contract
  await (await token.transfer(staking.address, epochRewards)).wait();
  console.log("✅ Funded rewards:", hre.ethers.utils.formatEther(epochRewards));

  // đợi tới start time rồi activate
  while (Math.floor(Date.now() / 1000) < epochStart) {
    process.stdout.write(".");
    await sleep(1000);
  }
  process.stdout.write("\n");
  await (await staking.activateEpoch(1)).wait();
  console.log("✅ Epoch 1 activated");

  // =========================
  // Save deployments
  // =========================
  saveDeployments(network, d);

  console.log("\n📦 DEPLOY SUMMARY");
  console.log("Registry       :", d.registry);
  console.log("TradeToken     :", d.tradeToken);
  console.log("StakingRewards :", d.stakingRewards);
  console.log("📄 Saved       :", `deployments/${network}.json`);
}

main().catch((e) => {
  console.error("❌ Deploy failed:", e);
  process.exit(1);
});
