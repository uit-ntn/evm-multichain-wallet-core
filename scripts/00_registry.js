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

async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  const d = loadDeployments(network);

  console.log("🚀 Deploy Registry (run ONCE)");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);

  if (d.registry) {
    console.log("✅ Registry already exists:", d.registry);
    return;
  }

  const Registry = await hre.ethers.getContractFactory("Registry");
  const registry = await Registry.deploy();
  await registry.deployed();

  d.registry = registry.address;
  saveDeployments(network, d);

  console.log("✅ Registry deployed:", registry.address);
  console.log("📄 Saved:", `deployments/${network}.json`);
}

main().catch((e) => {
  console.error("❌ Deploy failed:", e);
  process.exit(1);
});
