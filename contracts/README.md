# Hợp Đồng Thông Minh

Hợp đồng thông minh Solidity cho Ví Đa Chuỗi EVM với Lệnh Giới Hạn, Staking, và Tích Hợp DEX.

## 📁 Hợp Đồng

### **LimitOrder.sol**
Hợp đồng chính cho chức năng lệnh giới hạn.

**Tính Năng:**
- Tạo lệnh giới hạn với chữ ký EIP-712
- Hủy lệnh (chỉ chủ sở hữu)
- Khớp lệnh (bất kỳ ai)
- Sự kiện cho theo dõi off-chain
- Cơ chế hết hạn lệnh

**Sự Kiện:**
```solidity
event OrderCreated(
    uint256 indexed orderId,
    address indexed user,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 limitPrice
);

event OrderCancelled(uint256 indexed orderId, address indexed user);

event OrderFilled(
    uint256 indexed orderId,
    address indexed user,
    uint256 amountOut,
    address filler
);
```

**Hàm Chính:**
```solidity
function createOrder(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 limitPrice,
    uint256 deadline
) external returns (uint256);

function cancelOrder(uint256 orderId) external;

function getOrder(uint256 orderId) external view returns (Order memory);
```

### **DexAdapterV2.sol**
Adapter cho tích hợp DEX V2 (Uniswap V2, SushiSwap, PancakeSwap).

**Tính Năng:**
- Tương tác với DEX V2 protocols
- Quản lý approval và swap tokens
- Tối ưu hóa gas cho giao dịch
- Kiểm tra slippage và deadline

### **DexAdapterV3.sol**
Adapter cho tích hợp DEX V3 (Uniswap V3).

**Tính Năng:**
- Hỗ trợ concentrated liquidity
- Tối ưu hóa phí giao dịch
- Xử lý tick ranges
- Quản lý nâng cao slippage

### **TradeToken.sol**
Token ERC20 của protocol với tính năng vesting và phí.

**Tính Năng:**
- Token quản trị và phần thưởng
- Vesting theo lịch trình
- Thu phí giao dịch tùy chỉnh
- Blacklist và whitelist

### **StakingRewards.sol**
Cơ chế staking với phân phối phần thưởng.

**Tính Năng:**
- Staking dựa trên epoch
- Phân phối phần thưởng linh hoạt
- Cooldown và unstaking delays
- Boost rewards cho long-term stakers

### **SystemAdmin.sol**
Hệ thống quản trị và bảo mật protocol.

**Tính Năng:**
- Tạm dừng/tiếp tục khẩn cấp
- Quản lý quyền admin đa cấp
- Cập nhật cấu hình protocol
- Quản lý danh sách contracts

### **SwapRouterProxy.sol**
Proxy thông minh cho hoạt động swap qua nhiều DEX.

**Tính Năng:**
- Split và route giao dịch
- Tìm đường đi tốt nhất
- Phân chia khối lượng
- Tối ưu hóa phí giao dịch

## 🚀 Phát Triển

### Yêu Cầu Hệ Thống
- Node.js v16+
- NPM v8+
- Git

### Cài Đặt
```bash
# Clone repository
git clone https://github.com/uit-ntn/evm-multichain-wallet-core.git
cd evm-multichain-wallet-core

# Cài đặt dependencies
npm install

# Biên dịch contracts
npx hardhat compile
```

### Triển Khai lên Testnet
```bash
# Sepolia Testnet
npx hardhat run scripts/deploy.js --network sepolia

# Polygon Amoy Testnet
npx hardhat run scripts/deploy.js --network polygonAmoy

# Base Sepolia Testnet
npx hardhat run scripts/deploy.js --network baseSepolia
```

### Xác Minh trên Explorer
```bash
# Xác minh trên Sepolia
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS [CONSTRUCTOR_ARGS]

# Xác minh trên Polygon Amoy
npx hardhat verify --network polygonAmoy DEPLOYED_CONTRACT_ADDRESS [CONSTRUCTOR_ARGS]

# Xác minh trên Base Sepolia
npx hardhat verify --network baseSepolia DEPLOYED_CONTRACT_ADDRESS [CONSTRUCTOR_ARGS]
```

### Kiểm Thử
```bash
# Chạy tất cả tests
npx hardhat test

# Chạy test cụ thể
npx hardhat test test/LimitOrder.test.js

# Chạy tests với gas report
REPORT_GAS=true npx hardhat test

# Chạy test coverage
npx hardhat coverage
```

## 🔧 Cấu Hình

### Cấu Hình Mạng
File `hardhat.config.js`:

```javascript
networks: {
  // Ethereum Sepolia
  sepolia: {
    url: process.env.RPC_SEPOLIA,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 11155111,
    gasPrice: "auto"
  },
  
  // Polygon Amoy
  polygonAmoy: {
    url: process.env.RPC_POLYGON_AMOY,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 80002,
    gasPrice: "auto"
  },
  
  // Base Sepolia
  baseSepolia: {
    url: process.env.RPC_BASE_SEPOLIA,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 84532,
    gasPrice: "auto"
  }
}
```

### Biến Môi Trường
Tạo file `.env`:
```bash
# RPC Endpoints
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
RPC_BASE_SEPOLIA=https://sepolia.base.org

# Wallet (Chỉ dùng ví testnet!)
PRIVATE_KEY=0x...

# API Keys cho xác minh contracts
ETHERSCAN_API_KEY=ABC123...
POLYGONSCAN_API_KEY=XYZ789...
BASESCAN_API_KEY=DEF456...

# Địa chỉ contracts đã deploy
LIMIT_ORDER_ADDRESS_SEPOLIA=0x...
DEX_ADAPTER_V2_ADDRESS_SEPOLIA=0x...
TRADE_TOKEN_ADDRESS_SEPOLIA=0x...

## 📋 Quy Trình Triển Khai

### 1. Chuẩn Bị
```bash
# Cài đặt dependencies
npm install

# Build contracts
npm run build
```

### 2. Triển Khai
```bash
# Deploy theo thứ tự
npx hardhat run scripts/deploy.js --network sepolia

# Output ví dụ:
# 🚀 Bắt đầu triển khai...
# 📡 Mạng: Sepolia
# 👤 Deployer: 0x742d35Cc6634C0532925a3b8D4C9db4c2c4b1234
# 
# � Triển khai SystemAdmin...
# ✅ SystemAdmin deployed: 0xabc...
#
# 📝 Triển khai TradeToken...
# ✅ TradeToken deployed: 0xdef...
#
# 📝 Triển khai StakingRewards...
# ✅ StakingRewards deployed: 0x123...
#
# 📝 Triển khai DexAdapterV2...
# ✅ DexAdapterV2 deployed: 0x456...
#
# 📝 Triển khai DexAdapterV3...
# ✅ DexAdapterV3 deployed: 0x789...
#
# 📝 Triển khai LimitOrder...
# ✅ LimitOrder deployed: 0xabc...
#
# � Triển khai SwapRouterProxy...
# ✅ SwapRouterProxy deployed: 0xdef...
```

### 3. Xác Minh
```bash
# Xác minh từng contract
npx hardhat run scripts/verify.js --network sepolia

# Kiểm tra xác minh
npx hardhat verify-check --network sepolia CONTRACT_ADDRESS
```

### 4. Thiết Lập Hệ Thống
```bash
# Cấu hình SystemAdmin
npx hardhat run scripts/setup/admin.js --network sepolia

# Khởi tạo DexAdapter
npx hardhat run scripts/setup/dex.js --network sepolia

# Cấu hình phí và quyền
npx hardhat run scripts/setup/fees.js --network sepolia
```

## 🧪 Testing Framework

### Unit Tests
```bash
# Test một contract
npm test test/LimitOrder.test.js
npm test test/DexAdapter.test.js
npm test test/StakingRewards.test.js

# Test tất cả
npm test

# Test với coverage
npm run coverage
```

### Integration Tests
```bash
# Test tích hợp DEX
npm test test/integration/dex-integration.test.js

# Test tích hợp staking
npm test test/integration/staking-integration.test.js

# Test hiệu suất
npm test test/performance/gas-benchmark.test.js
```

## � API & SDK

### JavaScript SDK
```javascript
const { WalletSDK } = require('@uit-ntn/multichain-wallet-sdk');

// Khởi tạo SDK
const sdk = new WalletSDK({
  rpc: process.env.RPC_URL,
  chainId: 11155111, // Sepolia
  privateKey: process.env.PRIVATE_KEY
});

// Tạo lệnh giới hạn
const order = await sdk.limitOrder.create({
  tokenIn: '0x...',
  tokenOut: '0x...',
  amountIn: '1000000000000000000',
  minAmountOut: '900000000000000000',
  limitPrice: '1100000000000000000'
});

// Staking
await sdk.staking.stake('1000000000000000000');
const rewards = await sdk.staking.getRewards();

// Swap tokens
const quote = await sdk.dex.getQuote({
  tokenIn: '0x...',
  tokenOut: '0x...',
  amountIn: '1000000000000000000'
});
await sdk.dex.swap(quote);
```

### GraphQL API
```graphql
# Queries
query GetOrders($user: Address!) {
  orders(where: { user: $user }) {
    id
    tokenIn
    tokenOut
    amountIn
    minAmountOut
    limitPrice
    status
  }
}

# Subscriptions
subscription OnOrderFilled($orderId: ID!) {
  orderFilled(orderId: $orderId) {
    id
    amountOut
    filler
    timestamp
  }
}
```

## 📊 Contract Addresses

### Sepolia Testnet
```
SystemAdmin:     0x...
TradeToken:     0x...
StakingRewards: 0x...
DexAdapterV2:   0x...
DexAdapterV3:   0x...
LimitOrder:     0x...
SwapRouter:     0x...
```

### Polygon Amoy
```
SystemAdmin:     0x...
TradeToken:     0x...
StakingRewards: 0x...
DexAdapterV2:   0x...
DexAdapterV3:   0x...
LimitOrder:     0x...
SwapRouter:     0x...
```

### Base Sepolia
```
SystemAdmin:     0x...
TradeToken:     0x...
StakingRewards: 0x...
DexAdapterV2:   0x...
DexAdapterV3:   0x...
LimitOrder:     0x...
SwapRouter:     0x...
```

## ⚡ Endpoints & Tools

### RPC Endpoints
- Sepolia: https://rpc.sepolia.org
- Polygon Amoy: https://rpc-amoy.polygon.technology
- Base Sepolia: https://sepolia.base.org

### Explorers
- Sepolia: https://sepolia.etherscan.io
- Polygon Amoy: https://www.oklink.com/amoy
- Base Sepolia: https://sepolia.basescan.org

### Development Tools
- **Testnet Faucets:**
  - Sepolia: https://sepoliafaucet.com
  - Polygon: https://faucet.polygon.technology
  - Base: https://www.coinbase.com/faucets/base-sepolia-faucet

- **Token Lists:**
  - Uniswap: https://tokens.uniswap.org
  - Sushiswap: https://tokens.sushi.com

## 🔒 Security & Best Practices

### Smart Contract Security
- ✅ Sử dụng OpenZeppelin contracts đã audit
- ✅ Implement các security patterns chuẩn
- ✅ Kiểm tra tràn số và phân quyền
- ✅ Sử dụng SafeMath và SafeERC20
- ✅ Cập nhật dependency thường xuyên

### Deployment Security
- ⚠️ Không commit private keys
- ⚠️ Chỉ dùng ví testnet cho development
- ⚠️ Audit code trước khi lên mainnet
- ⚠️ Verify tất cả contracts trên explorer
- ⚠️ Test kỹ trên testnet trước

### Gas Optimization
- ⚡ Tối ưu storage slots
- ⚡ Sử dụng batch operations
- ⚡ Cache external calls
- ⚡ Dùng assembly cho tính toán phức tạp
- ⚡ Optimize function selectors

## 📚 Resources & Links

### Documentation
- [Project Documentation](https://docs.uit-ntn.dev)
- [API Reference](https://api.uit-ntn.dev)
- [SDK Guide](https://sdk.uit-ntn.dev)

### Tools & Libraries
- [Hardhat](https://hardhat.org)
- [OpenZeppelin](https://openzeppelin.com)
- [Ethers.js](https://docs.ethers.org/v6)

### Community
- [Discord](https://discord.gg/uit-ntn)
- [Telegram](https://t.me/uit_ntn)
- [Twitter](https://twitter.com/uit_ntn)

---
