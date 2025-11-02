# Hợp Đồng Thông Minh

Hợp đồng thông minh Solidity cho Ví Đa Chuỗi EVM với Lệnh Giới Hạn và biên lai IPFS.

## 📁 Hợp Đồng

###  **LimitOrder.sol**
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

###  **TradeToken.sol** (TODO)
Token ERC20 để kiểm tra chức năng giao dịch.

###  **StakingRewards.sol** (TODO)
Cơ chế staking với phân phối phần thưởng.

###  **SystemAdmin.sol** (TODO)
Chức năng quản trị như tạm dừng/tiếp tục hệ thống.

###  **ReceiptGenerator.sol** (TODO)
Tạo biên lai cho giao dịch.

###  **DexAdapterV2.sol** (TODO)
Adapter cho tích hợp DEX (Uniswap, SushiSwap, v.v.).

###  **SwapRouterProxy.sol** (TODO)
Proxy cho hoạt động swap với nhiều DEX.

## 🚀 Phát Triển

### Biên Dịch Hợp Đồng
```bash
npx hardhat compile
```

### Triển Khai lên Testnet
```bash
# Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Polygon Amoy
npx hardhat run scripts/deploy.js --network polygonAmoy
```

### Xác Minh trên Explorer
```bash
npx hardhat run scripts/verify.js --network sepolia
```

### Chạy Kiểm Thử
```bash
npx hardhat test
```

## 🔧 Cấu Hình

### Mạng Hardhat
Được cấu hình trong `hardhat.config.js`:

```javascript
networks: {
  sepolia: {
    url: process.env.RPC_SEPOLIA,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 11155111,
  },
  polygonAmoy: {
    url: process.env.RPC_POLYGON_AMOY,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 80002,
  }
}
```

### Biến Môi Trường
```bash
# RPC Endpoints
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

# Deployer Wallet
PRIVATE_KEY=0x...  # Testnet wallet only!

# Explorer API Keys (for verification)
ETHERSCAN_API_KEY=ABC123...
POLYGONSCAN_API_KEY=XYZ789...
```

## 📋 Quy Trình Triển Khai

### 1. Biên Dịch
```bash
npm run compile
```

### 2. Triển Khai
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Output example:
# 🚀 Starting deployment...
# 📡 Network: sepolia
# 👤 Deployer: 0x742d35Cc6634C0532925a3b8D4C9db4c2c4b1234
# 💰 Balance: 0.5 ETH
# 
# 📝 Deploying LimitOrder...
# ✅ LimitOrder deployed to: 0x123456789abcdef123456789abcdef1234567890
# 
# ✅ Deployment completed!
# 📋 Update your .env file:
# LIMIT_ORDER_ADDRESS_SEPOLIA=0x123456789abcdef123456789abcdef1234567890
```

### 3. Cập Nhật Môi Trường
Sao chép địa chỉ hợp đồng vào `.env`:
```bash
LIMIT_ORDER_ADDRESS_SEPOLIA=0x123456789abcdef123456789abcdef1234567890
LIMIT_ORDER_ADDRESS_POLYGON=0xabcdef123456789abcdef123456789abcdef1234
```

### 4. Xác Minh
```bash
npx hardhat run scripts/verify.js --network sepolia

# Output example:
# 🔍 Starting contract verification...
# 📡 Network: sepolia
# 
# 📝 Verifying LimitOrder at 0x123...
# ✅ LimitOrder verified!
# 
# ✅ Verification completed!
```

## 🧪 Kiểm Thử

### Kiểm Thử Đơn Vị
```bash
npx hardhat test

# Output example:
# LimitOrder
#   Order Creation
#     ✓ Should create a new order
#     ✓ Should fail with invalid token addresses
#   Order Cancellation
#     ✓ Should cancel an order
#     ✓ Should fail if not order owner
#   View Functions
#     ✓ Should get user orders
```

### Độ Bao Phủ Kiểm Thử
```bash
npx hardhat coverage
```

### Báo Cáo Gas
```bash
REPORT_GAS=true npx hardhat test
```

## 🔍 Tương Tác Hợp Đồng

### Sử Dụng Ethers.js
```javascript
const { ethers } = require('ethers');

// Connect to contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

// Read functions
const order = await contract.getOrder(orderId);
const userOrders = await contract.getUserOrders(userAddress);

// Write functions (need signer)
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contractWithSigner = contract.connect(signer);

const tx = await contractWithSigner.createOrder(
  tokenIn,
  tokenOut,
  amountIn,
  minAmountOut,
  limitPrice,
  deadline
);

await tx.wait(); // Wait for confirmation
```

### Sử Dụng Hardhat Console
```bash
npx hardhat console --network sepolia

# In console:
const LimitOrder = await ethers.getContractFactory("LimitOrder");
const limitOrder = await LimitOrder.attach("0x123...");
const order = await limitOrder.getOrder(1);
console.log(order);
```

## 📊 Địa Chỉ Hợp Đồng

### Sepolia Testnet
```
LimitOrder:     0x... (update after deployment)
TradeToken:     0x... (TODO)
StakingRewards: 0x... (TODO)
SystemAdmin:    0x... (TODO)
```

### Polygon Amoy Testnet
```
LimitOrder:     0x... (update after deployment)
TradeToken:     0x... (TODO)
StakingRewards: 0x... (TODO)
SystemAdmin:    0x... (TODO)
```

## 🔗 Liên Kết Explorer

### Sepolia
- **Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com

### Polygon Amoy
- **Explorer**: https://amoy.polygonscan.com
- **Faucet**: https://faucet.polygon.technology

## Mẹo Phát Triển

### Thêm Hợp Đồng Mới
1. Create `.sol` file trong `contracts/`
2. Add deployment logic trong `scripts/deploy.js`
3. Add verification trong `scripts/verify.js`
4. Write tests trong `test/`
5. Update contract addresses trong `.env`

### Gỡ Lỗi Giao Dịch
```bash
# Get transaction receipt
npx hardhat run --network sepolia scripts/debug.js

# Or use console
npx hardhat console --network sepolia
const tx = await ethers.provider.getTransactionReceipt("0x...");
console.log(tx);
```

### Ước Tính Gas
```javascript
const gasEstimate = await contract.estimateGas.createOrder(
  tokenIn,
  tokenOut,
  amountIn,
  minAmountOut,
  limitPrice,
  deadline
);
console.log(`Estimated gas: ${gasEstimate.toString()}`);
```

## Lưu Ý Bảo Mật

- ⚠️ **Không bao giờ commit khóa riêng**
- ⚠️ **Chỉ sử dụng ví testnet** cho phát triển
- ⚠️ **Kiểm toán hợp đồng** trước khi triển khai mainnet
- ⚠️ **Kiểm thử kỹ lưỡng** trên testnet trước
- ⚠️ **Xác minh hợp đồng** trên explorer sau triển khai

## Tài Nguyên

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

---
