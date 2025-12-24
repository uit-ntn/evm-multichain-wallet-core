const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/* ========= helpers ========= */

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

/* ========= main ========= */

async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();

  console.log("🚀 Deploying MockERC20...");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

  // ethers v5 => utils.parseUnits
  const INITIAL_SUPPLY = hre.ethers.utils.parseUnits("1000000", 18);

  // Deploy token
  const mockERC20 = await MockERC20.deploy(
    "Trade Token",
    "TT",
    INITIAL_SUPPLY
  );

  await mockERC20.deployed();

  console.log("✅ MockERC20 deployed at:", mockERC20.address);

  // Mint thêm token cho ví demo (deployer)
  const MINT_AMOUNT = hre.ethers.utils.parseUnits("1000000", 18);

  const tx = await mockERC20.mint(deployer.address, MINT_AMOUNT);
  await tx.wait();

  console.log("✅ Minted 1,000,000 TT to:", deployer.address);

  // Save address
  const deployments = loadDeployments(network);
  deployments.MockERC20 = mockERC20.address;
  saveDeployments(network, deployments);

  console.log("📦 Saved MockERC20 address to deployments/");
}

/* ========= run ========= */

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
