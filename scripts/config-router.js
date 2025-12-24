// scripts/config-router.js
const { ethers } = require("hardhat");

// DexType trong SwapRouterProxy:
// enum DexType { UNISWAP_V2=0, UNISWAP_V3=1, PANCAKESWAP=2, SUSHISWAP=3 }
const DEX = {
  UNISWAP_V2: 0,
  UNISWAP_V3: 1,
  PANCAKESWAP: 2,
  SUSHISWAP: 3,
};

function mustAddr(a, label) {
  if (!ethers.utils.isAddress(a)) throw new Error(`❌ Invalid ${label}: ${a}`);
  return a;
}

async function main() {
  // =======================
  // ✅ THAY BẰNG ADDRESS THẬT
  // =======================
  const ROUTER = mustAddr("0xYourRouterAddress", "ROUTER");
  const ADAPTER = mustAddr("0xYourAdapterAddress", "ADAPTER");

  // token bạn muốn swap (ví dụ TRADE + LINK/WETH/WBNB...)
  const TOKENS = [
    mustAddr("0xTokenA", "TOKEN_A"),
    mustAddr("0xTokenB", "TOKEN_B"),
    // add thêm nếu muốn:
    // mustAddr("0xTokenC", "TOKEN_C"),
  ];

  // Chọn dexType đúng với adapter bạn deploy
  // Sepolia UniswapV2Adapter => DEX.UNISWAP_V2
  // BSC testnet Pancake adapter => DEX.PANCAKESWAP
  const DEX_TYPE = DEX.UNISWAP_V2;

  // Optional configs (có thể để null nếu không muốn set)
  const NEW_FEE_BPS = null; // ví dụ 25 = 0.25% ; null = bỏ qua
  const NEW_FEE_RECIPIENT = null; // "0x..." hoặc null

  // =======================
  // SETUP
  // =======================
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const router = await ethers.getContractAt("SwapRouterProxy", ROUTER);

  // =======================
  // 0) Check owner
  // =======================
  const owner = await router.owner();
  console.log("Router owner:", owner);
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error("❌ Current signer is NOT owner of router. Hãy dùng đúng ví owner để config.");
  }

  // =======================
  // 1) setDexAdapter
  // =======================
  console.log(`\n[1] Setting adapter: dexType=${DEX_TYPE} adapter=${ADAPTER}`);
  const tx1 = await router.setDexAdapter(DEX_TYPE, ADAPTER);
  console.log("tx:", tx1.hash);
  await tx1.wait();
  console.log("✅ setDexAdapter done");

  // =======================
  // 2) setSupportedTokens
  // =======================
  console.log(`\n[2] Supporting tokens (${TOKENS.length})...`);
  // dùng batch nếu bạn muốn:
  // const tx2 = await router.setSupportedTokens(TOKENS, true);
  // await tx2.wait();
  // console.log("✅ setSupportedTokens done:", tx2.hash);

  // hoặc set từng token (dễ debug)
  for (const t of TOKENS) {
    const tx = await router.setSupportedToken(t, true);
    console.log(`support ${t} tx:`, tx.hash);
    await tx.wait();
  }
  console.log("✅ supported tokens done");

  // =======================
  // 3) (optional) set fee
  // =======================
  if (NEW_FEE_BPS !== null) {
    console.log(`\n[3] Setting protocolFeeBps=${NEW_FEE_BPS}`);
    const tx3 = await router.setProtocolFeeBps(NEW_FEE_BPS);
    console.log("tx:", tx3.hash);
    await tx3.wait();
    console.log("✅ setProtocolFeeBps done");
  }

  // =======================
  // 4) (optional) set feeRecipient
  // =======================
  if (NEW_FEE_RECIPIENT) {
    mustAddr(NEW_FEE_RECIPIENT, "NEW_FEE_RECIPIENT");
    console.log(`\n[4] Setting feeRecipient=${NEW_FEE_RECIPIENT}`);
    const tx4 = await router.setFeeRecipient(NEW_FEE_RECIPIENT);
    console.log("tx:", tx4.hash);
    await tx4.wait();
    console.log("✅ setFeeRecipient done");
  }

  // =======================
  // 5) Verify config
  // =======================
  console.log("\n[5] Verify config:");
  const adapter = await router.dexAdapters(DEX_TYPE);
  console.log("dexAdapters[dexType] =", adapter);

  const feeBps = await router.protocolFeeBps();
  console.log("protocolFeeBps =", feeBps.toString());

  const feeRecipient = await router.feeRecipient();
  console.log("feeRecipient =", feeRecipient);

  for (const t of TOKENS) {
    const ok = await router.supportedTokens(t);
    console.log(`supportedTokens[${t}] =`, ok);
  }

  console.log("\n✅ DONE");
}

main().catch((e) => {
  console.error("\n❌ ERROR:", e);
  process.exit(1);
});
