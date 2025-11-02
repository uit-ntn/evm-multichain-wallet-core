# Scripts Triển Khai

Scripts Hardhat cho triển khai và xác minh hợp đồng thông minh trên nhiều mạng.

## 📁 Scripts

### 🚀 **deploy.js**
Script triển khai chính cho tất cả hợp đồng.

**Tính Năng:**
- ✅ Triển khai hợp đồng lên Sepolia và Polygon Amoy
- ✅ Ước tính gas tự động
- ✅ Kiểm tra số dư trước triển khai
- ✅ Xuất địa chỉ hợp đồng
- ✅ Hướng dẫn cập nhật môi trường

**Usage:**
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Polygon Amoy
npx hardhat run scripts/deploy.js --network polygonAmoy

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

**Output Example:**
```
🚀 Starting deployment...
📡 Network: sepolia
👤 Deployer: 0x742d35Cc6634C0532925a3b8D4C9db4c2c4b1234
💰 Balance: 0.5 ETH

📝 Deploying LimitOrder...
✅ LimitOrder deployed to: 0x123456789abcdef123456789abcdef1234567890

✅ Deployment completed!

📋 Update your .env file:
LIMIT_ORDER_ADDRESS_SEPOLIA=0x123456789abcdef123456789abcdef1234567890
```

### 🔍 **verify.js**
Script xác minh hợp đồng cho block explorers.

**Tính Năng:**
- ✅ Xác minh trên Etherscan (Sepolia)
- ✅ Xác minh trên Polygonscan (Amoy)
- ✅ Tham số constructor tự động
- ✅ Xử lý lỗi cho hợp đồng đã được xác minh

**Usage:**
```bash
# Verify on Sepolia
npx hardhat run scripts/verify.js --network sepolia

# Verify on Polygon Amoy
npx hardhat run scripts/verify.js --network polygonAmoy
```

**Output Example:**
```
🔍 Starting contract verification...
📡 Network: sepolia

📝 Verifying LimitOrder at 0x123456789abcdef123456789abcdef1234567890...
✅ LimitOrder verified!

✅ Verification completed!
```

## 🔧 Cấu Hình

### Biến Môi Trường Cần Thiết
```bash
# RPC Endpoints
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

# Deployer Wallet
PRIVATE_KEY=0x...  # ⚠️ Testnet wallet only!

# Contract Addresses (generated after deployment)
LIMIT_ORDER_ADDRESS_SEPOLIA=0x...
LIMIT_ORDER_ADDRESS_POLYGON=0x...

# Explorer API Keys (for verification)
ETHERSCAN_API_KEY=ABC123XYZ789DEF456GHI012JKL345MNO678
POLYGONSCAN_API_KEY=PQR901STU234VWX567YZA890BCD123EFG456
```

### Cấu Hình Mạng
Trong `hardhat.config.js`:
```javascript
networks: {
  sepolia: {
    url: process.env.RPC_SEPOLIA || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 11155111,
  },
  polygonAmoy: {
    url: process.env.RPC_POLYGON_AMOY || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 80002,
  },
}
```

## 📋 Quy Trình Triển Khai

### 1. **Chuẩn Bị**
```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Check environment variables
echo $RPC_SEPOLIA
echo $PRIVATE_KEY
```

### 2. **Triển Khai lên Testnet**
```bash
# Deploy to Sepolia first
npx hardhat run scripts/deploy.js --network sepolia

# Copy contract address from output
# Update .env file:
LIMIT_ORDER_ADDRESS_SEPOLIA=0x123456789abcdef123456789abcdef1234567890

# Deploy to Polygon Amoy
npx hardhat run scripts/deploy.js --network polygonAmoy

# Update .env file:
LIMIT_ORDER_ADDRESS_POLYGON=0xabcdef123456789abcdef123456789abcdef1234
```

### 3. **Xác Minh Hợp Đồng**
```bash
# Verify on Sepolia
npx hardhat run scripts/verify.js --network sepolia

# Verify on Polygon Amoy
npx hardhat run scripts/verify.js --network polygonAmoy
```

### 4. **Cập Nhật Cấu Hình Backend**
Cập nhật địa chỉ hợp đồng trong cấu hình server:
```javascript
// server/adapters/config.adapter.js
contracts: {
  sepolia: {
    limitOrder: '0x123456789abcdef123456789abcdef1234567890',
  },
  polygon: {
    limitOrder: '0xabcdef123456789abcdef123456789abcdef1234',
  },
}
```

## 🛠️ Scripts Tùy Chỉnh

### Tạo Script Triển Khai Mới
```javascript
// scripts/deploy-token.js
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TradeToken...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Deploy TradeToken
  const TradeToken = await hre.ethers.getContractFactory("TradeToken");
  const tradeToken = await TradeToken.deploy("Trade Token", "TRD");
  await tradeToken.waitForDeployment();
  
  const address = await tradeToken.getAddress();
  console.log(`✅ TradeToken deployed to: ${address}`);
  
  console.log(`\n📋 Update your .env file:`);
  console.log(`TRADE_TOKEN_ADDRESS_${network.toUpperCase()}=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Chạy Script Tùy Chỉnh
```bash
npx hardhat run scripts/deploy-token.js --network sepolia
```

## 🔍 Scripts Gỡ Lỗi

### Kiểm Tra Trạng Thái Triển Khai
```javascript
// scripts/check-deployment.js
const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  const limitOrderAddress = process.env[`LIMIT_ORDER_ADDRESS_${network.toUpperCase()}`];
  
  if (!limitOrderAddress) {
    console.log(`❌ LimitOrder not deployed on ${network}`);
    return;
  }
  
  // Check if contract exists
  const code = await hre.ethers.provider.getCode(limitOrderAddress);
  if (code === '0x') {
    console.log(`❌ No contract found at ${limitOrderAddress}`);
    return;
  }
  
  console.log(`✅ LimitOrder found at ${limitOrderAddress}`);
  
  // Get contract instance
  const LimitOrder = await hre.ethers.getContractFactory("LimitOrder");
  const limitOrder = LimitOrder.attach(limitOrderAddress);
  
  // Check contract state
  const orderCount = await limitOrder.orderCount();
  console.log(`📊 Total orders: ${orderCount}`);
}

main().catch(console.error);
```

### Ước Tính Gas Triển Khai
```javascript
// scripts/estimate-gas.js
const hre = require("hardhat");

async function main() {
  const LimitOrder = await hre.ethers.getContractFactory("LimitOrder");
  
  // Estimate deployment gas
  const deployTx = await LimitOrder.getDeployTransaction();
  const gasEstimate = await hre.ethers.provider.estimateGas(deployTx);
  
  console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
  
  // Get current gas price
  const gasPrice = await hre.ethers.provider.getGasPrice();
  console.log(`💰 Gas price: ${hre.ethers.formatUnits(gasPrice, 'gwei')} gwei`);
  
  // Calculate cost
  const cost = gasEstimate * gasPrice;
  console.log(`💸 Estimated cost: ${hre.ethers.formatEther(cost)} ETH`);
}

main().catch(console.error);
```

## 📊 Thông Tin Mạng

### Sepolia Testnet
- **Chain ID**: 11155111
- **Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com
- **RPC**: https://rpc.sepolia.org (public)

### Polygon Amoy Testnet
- **Chain ID**: 80002
- **Explorer**: https://amoy.polygonscan.com
- **Faucet**: https://faucet.polygon.technology
- **RPC**: https://rpc-amoy.polygon.technology (public)

## 🚨 Khắc Phục Sự Cố

### Vấn Đề Thường Gặp

#### 1. **Số Dư Không Đủ**
```
Error: insufficient funds for intrinsic transaction cost
```
**Giải Pháp**: Lấy token testnet từ faucet

#### 2. **Khóa Riêng Không Hợp Lệ**
```
Error: invalid private key
```
**Giải Pháp**: Kiểm tra định dạng PRIVATE_KEY (tiền tố 0x)

#### 3. **Kết Nối Mạng**
```
Error: could not detect network
```
**Giải Pháp**: Kiểm tra URL điểm cuối RPC

#### 4. **Hợp Đồng Đã Được Xác Minh**
```
Error: Contract source code already verified
```
**Giải Pháp**: Điều này bình thường, hợp đồng đã được xác minh rồi

#### 5. **Ước Tính Gas Thất Bại**
```
Error: cannot estimate gas
```
**Giải Pháp**: Kiểm tra tham số constructor của hợp đồng

### Lệnh Gỡ Lỗi
```bash
# Check network connection
npx hardhat run --network sepolia -e "console.log(await ethers.provider.getNetwork())"

# Check deployer balance
npx hardhat run --network sepolia -e "
const [signer] = await ethers.getSigners();
const balance = await ethers.provider.getBalance(signer.address);
console.log('Balance:', ethers.formatEther(balance), 'ETH');
"

# Check contract code
npx hardhat run --network sepolia -e "
const code = await ethers.provider.getCode('0x...');
console.log('Contract exists:', code !== '0x');
"
```

## 📚 Thực Hành Tốt Nhất

### 1. **Danh Sách Kiểm Tra Trước Triển Khai**
- ✅ Compile contracts successfully
- ✅ Run all tests
- ✅ Check deployer balance
- ✅ Verify RPC endpoints
- ✅ Backup private key securely

### 2. **Nhiệm Vụ Sau Triển Khai**
- ✅ Verify contracts on explorer
- ✅ Update environment variables
- ✅ Test contract interactions
- ✅ Update backend configuration
- ✅ Document contract addresses

### 3. **Bảo Mật**
- ⚠️ Never commit private keys
- ⚠️ Use testnet wallets only
- ⚠️ Double-check network before deploy
- ⚠️ Verify contract source code
- ⚠️ Test thoroughly before mainnet

---

**Chúc Triển Khai Vui Vẻ! 🚀**
