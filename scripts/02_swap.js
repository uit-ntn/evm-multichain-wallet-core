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

async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  const d = loadDeployments(network);

  console.log("🚀 Deploy Nghiệp vụ 2 - Swap");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);

  if (!d.registry) {
    throw new Error("❌ Missing d.registry. Hãy chạy scripts/00_registry.js trước.");
  }

  const registry = await hre.ethers.getContractAt("Registry", d.registry);

  // =========================
  // 1) Deploy TradeToken
  // =========================
  // token demo: max 1,000,000 & mint 100,000
  const TradeToken = await hre.ethers.getContractFactory("TradeToken");
  const MAX_SUPPLY = hre.ethers.utils.parseEther("1000000");
  const INITIAL_MINT = hre.ethers.utils.parseEther("100000");

  const tradeToken = await TradeToken.deploy(
    "Trade Token",
    "TRADE",
    MAX_SUPPLY,
    INITIAL_MINT
  );
  await tradeToken.deployed();

  console.log("✅ TradeToken deployed:", tradeToken.address);

  // =========================
  // 2) Deploy SwapRouterProxy
  // =========================
  // mock WETH chỉ cần != 0x0
  const MOCK_WETH = "0x0000000000000000000000000000000000000001";
  const SwapRouterProxy = await hre.ethers.getContractFactory("SwapRouterProxy");

  const swapRouter = await SwapRouterProxy.deploy(MOCK_WETH);
  await swapRouter.deployed();

  console.log("✅ SwapRouterProxy deployed:", swapRouter.address);

  // =========================
  // 3) Config supported tokens
  // =========================
  console.log("⚙️ Config supported token...");
  await (await swapRouter.setSupportedToken(tradeToken.address, true)).wait();
  console.log("✅ Supported token set:", tradeToken.address);

  // =========================
  // 4) Save + Register in Registry
  // =========================
  d.tradeToken = tradeToken.address;
  d.swapRouter = swapRouter.address;

  await upsert(registry, "TRADE_TOKEN", tradeToken.address);
  await upsert(registry, "SWAP_ROUTER", swapRouter.address);

  saveDeployments(network, d);

  console.log("\n📦 DEPLOY SUMMARY");
  console.log("Registry    :", d.registry);
  console.log("TradeToken  :", d.tradeToken);
  console.log("SwapRouter  :", d.swapRouter);
  console.log("📄 Saved    :", `deployments/${network}.json`);
}

main().catch((e) => {
  console.error("❌ Deploy failed:", e);
  process.exit(1);
});
