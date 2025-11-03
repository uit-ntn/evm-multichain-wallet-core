/**
 * Script kiểm tra testnets đang được kích hoạt
 */

require('dotenv').config();
const { getEnabledChains, chains } = require('../server/config/chains');

console.log('\n🔍 Kiểm Tra Testnets Đang Được Kích Hoạt\n');

console.log('📋 Tất Cả Testnets Hỗ Trợ:');
chains.forEach(chain => {
  console.log(`\n  🔹 ${chain.name} (Chain ID: ${chain.chainId})`);
  console.log(`     Symbol: ${chain.symbol}`);
  console.log(`     Explorer: ${chain.explorer}`);
  console.log(`     RPC: ${chain.rpc ? '✅ Đã cấu hình' : '❌ Chưa cấu hình'}`);
  if (chain.rpc) {
    console.log(`     RPC URL: ${chain.rpc.substring(0, 50)}...`);
  }
});

const enabledChains = getEnabledChains();

console.log('\n\n✅ Testnets Đang Được Kích Hoạt:');
if (enabledChains.length === 0) {
  console.log('  ⚠️  Không có testnet nào được kích hoạt!');
  console.log('\n💡 Để kích hoạt, thêm vào file .env:');
  console.log('   RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY');
  console.log('   RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY');
} else {
  enabledChains.forEach((chain, index) => {
    console.log(`\n  ${index + 1}. ${chain.name} (Chain ID: ${chain.chainId})`);
    console.log(`     ✅ RPC: Đã cấu hình`);
    console.log(`     🔗 Explorer: ${chain.explorer}`);
    
    // Kiểm tra contract addresses
    const contracts = Object.entries(chain.contracts)
      .filter(([_, address]) => address && address.length > 0);
    
    if (contracts.length > 0) {
      console.log(`     📝 Contracts:`);
      contracts.forEach(([name, address]) => {
        console.log(`        - ${name}: ${address}`);
      });
    } else {
      console.log(`     ⚠️  Chưa có contract addresses`);
    }
  });
}

console.log('\n');
