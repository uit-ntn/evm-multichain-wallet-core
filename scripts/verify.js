const hre = require("hardhat");
const dotenv = require("dotenv");

dotenv.config();

async function main() {
  console.log("🔍 Starting contract verification...");

  const network = hre.network.name;
  console.log(`📡 Network: ${network}`);

  // Lấy địa chỉ contract từ biến môi trường
  const limitOrderAddress = process.env[`LIMIT_ORDER_ADDRESS_${network.toUpperCase()}`];

  if (!limitOrderAddress) {
    console.error(`❌ LIMIT_ORDER_ADDRESS_${network.toUpperCase()} not found in .env`);
    process.exit(1);
  }

  // Verify LimitOrder
  console.log(`\n📝 Verifying LimitOrder at ${limitOrderAddress}...`);
  try {
    await hre.run("verify:verify", {
      address: limitOrderAddress,
      constructorArguments: [], // thêm tham số nếu contract có constructor
    });
    console.log("✅ LimitOrder verified!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️ Contract already verified");
    } else {
      console.error("❌ Verification failed:", error.message);
    }
  }

  console.log("\n✅ Verification completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});