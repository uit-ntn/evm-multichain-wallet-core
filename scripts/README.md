# 🚀 Scripts Triển Khai - PHIÊN BẢN ĐÃ SỬA

Scripts Hardhat đã được **SỬA LỖI** cho triển khai hợp đồng với Registry tích hợp.

## ✅ Các Lỗi Đã Sửa

- **Đã sửa**: `TypeError: registry.set is not a function` → Giờ dùng `registry.registerContract()`
- **Đã sửa**: Lỗi insufficient funds → Thêm kiểm tra balance và link faucet
- **Đã sửa**: Xử lý lỗi kém → Thêm xử lý lỗi graceful với thông báo hữu ích
- **Đã thêm**: Kiểm tra balance tự động trước khi deploy
- **Đã thêm**: Link faucet và troubleshooting tích hợp

## 📁 Scripts

### 🚀 **deploy.js** (ĐÃ SỬA)
Script triển khai chính với Registry integration và balance checking.

**Tính Năng Mới:**
- ✅ **Kiểm tra balance tự động** với link faucet nếu thiếu tiền
- ✅ **Registry integration** - tự động đăng ký contracts
- ✅ **Error handling tốt hơn** với thông báo chi tiết
- ✅ **Faucet links tích hợp** cho từng network
- ✅ Triển khai Registry + LimitOrder + TradeToken
- ✅ Backend tự động discover addresses

**Usage:**
```bash
# Deploy to Sepolia (với balance check)
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Polygon Amoy (với balance check)
npx hardhat run scripts/deploy.js --network polygonAmoy

# Deploy to BSC Testnet
npx hardhat run scripts/deploy.js --network bscTestnet
```

### 🌐 **deploy-all.js** (ĐÃ SỬA)
Multi-network deployment với balance checking tích hợp.

**Tính Năng Mới:**
- ✅ **Kiểm tra balance tất cả networks** trước khi deploy
- ✅ **Automatic faucet links** nếu thiếu funds
- ✅ **Graceful error handling** với solutions
- ✅ **Deployment summary** với success rate
- ✅ **Contract address parsing** từ output

**Usage:**
```bash
# Deploy to tất cả networks với balance check
npx hardhat run scripts/deploy-all.js
```

**Output Example (ĐÃ SỬA):**
```
🚀 Starting deployment...
📡 Network: sepolia (11155111)
👤 Deployer: 0x742d35Cc6634C0532925a3b8D4C9db4c2c4b1234
💰 Balance: 0.05 ETH

📝 Deploying Registry...
✅ Registry deployed at: 0xabcd...1234

📝 Deploying LimitOrder...
✅ LimitOrder deployed to: 0xefgh...5678

📝 Deploying TradeToken...
✅ TradeToken deployed to: 0xijkl...9012

📝 Registering contracts in Registry...
✅ LimitOrder registered in Registry
✅ TradeToken registered in Registry

🎉 ===== DEPLOYMENT COMPLETE =====
📋 Registry: 0xabcd...1234
🔄 LimitOrder: 0xefgh...5678
🪙 TradeToken: 0xijkl...9012

💡 Backend will automatically discover contracts via Registry!
```

**Nếu thiếu funds:**
```
❌ Insufficient balance! Need at least 0.01 ETH for deployment
📍 Get testnet tokens:
   sepolia: https://sepoliafaucet.com/
   Polygon Amoy: https://faucet.polygon.technology/
   BSC Testnet: https://testnet.bnbchain.org/faucet-smart
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

## 💰 Lấy Testnet Tokens (TÍCH HỢP)

Scripts giờ tự động hiện link faucet nếu bạn thiếu token:

### Sepolia (Ethereum Testnet)
- **Faucet**: https://sepoliafaucet.com/
- **Amount**: 0.5 ETH per day
- **Requirements**: GitHub account

### Polygon Amoy (Polygon Testnet)  
- **Faucet**: https://faucet.polygon.technology/
- **Amount**: 1 MATIC per day
- **Requirements**: Alchemy account (free)

### BSC Testnet (Binance Smart Chain)
- **Faucet**: https://testnet.bnbchain.org/faucet-smart
- **Amount**: 0.1 BNB per day
- **Requirements**: BNB wallet

## 🔍 Registry Integration (MỚI)

Backend giờ tự động discover contract addresses:

```javascript
// Backend code - không cần hardcode addresses nữa!
const registryAddress = "0xabcd...1234"; // Từ deployment output
const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);

// Lấy contract addresses động
const limitOrderAddress = await registry.getContract("limitOrder");
const tradeTokenAddress = await registry.getContract("tradeToken");

// Lấy tất cả contracts một lần
const [names, addresses] = await registry.getAllContracts();
console.log("Available contracts:", names); // ["limitOrder", "tradeToken"]
```

## 🚨 Khắc Phục Sự Cố (TOÀN DIỆN)

### Lỗi Đã Sửa ✅

#### 1. **"TypeError: registry.set is not a function"**
- **ĐÃ SỬA**: Giờ dùng `registry.registerContract(name, address)`
- **Nguyên nhân**: Sai tên function trong deployment script

#### 2. **"Insufficient funds for intrinsic transaction cost"**
- **ĐÃ SỬA**: Tự động kiểm tra balance với faucet links
- **Giải pháp**: Lấy testnet tokens từ faucet links được cung cấp

### Vấn Đề Thường Gặp & Giải Pháp

#### 3. **"Contract not found"**
```bash
# Compile contracts trước
npx hardhat compile
```

#### 4. **"Network not configured"**
- Kiểm tra `hardhat.config.js` network settings
- Verify RPC URLs trong `.env` file

#### 5. **"Private key not set"**
- Thêm `PRIVATE_KEY=your_key` vào `.env` file
- Không bao giờ commit private keys lên git

#### 6. **"RPC URL not working"**
- Thử alternative RPC providers
- Kiểm tra IP có bị block không

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

## 🎉 Tóm Tắt

Deployment scripts giờ đã **HOÀN TOÀN SỬA** và bao gồm:

- ✅ **Kiểm tra balance tự động** trước khi deploy
- ✅ **Registry integration đúng** dùng `registerContract()`  
- ✅ **Error handling toàn diện** với thông báo hữu ích
- ✅ **Faucet links tích hợp** để lấy testnet tokens
- ✅ **Multi-network support** với graceful failure handling
- ✅ **Backend integration** để tự động discover contracts

**Không cần cập nhật .env thủ công nữa!** Backend sẽ tự động discover contract addresses qua Registry. 🚀

---

**Chúc Triển Khai Vui Vẻ! 🎯**
