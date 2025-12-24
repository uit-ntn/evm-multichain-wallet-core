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

  console.log("🚀 Deploy Nghiệp vụ 1 - LimitOrder");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);

  if (!d.registry) {
    throw new Error("❌ Missing d.registry. Hãy chạy scripts/00_registry.js trước.");
  }

  const registry = await hre.ethers.getContractAt("Registry", d.registry);

  const LimitOrder = await hre.ethers.getContractFactory("LimitOrder");
  const limitOrder = await LimitOrder.deploy();
  await limitOrder.deployed();

  console.log("✅ LimitOrder deployed:", limitOrder.address);

  d.limitOrder = limitOrder.address;

  // register/update vào registry
  await upsert(registry, "LIMIT_ORDER", limitOrder.address);

  saveDeployments(network, d);

  console.log("\n📦 DEPLOY SUMMARY");
  console.log("Registry   :", d.registry);
  console.log("LimitOrder :", d.limitOrder);
  console.log("📄 Saved   :", `deployments/${network}.json`);
}

main().catch((e) => {
  console.error("❌ Deploy failed:", e);
  process.exit(1);
});
