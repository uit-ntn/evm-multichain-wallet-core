# 🚀 EVM Multichain Wallet Core

**Smart Contracts & Backend API** cho ứng dụng ví đa chuỗi EVM với **Limit Orders**, **Token Swap**, **Staking Rewards**, và **IPFS Receipt Storage**.

---

## ✨ Tính Năng Chính

### 🔗 Smart Contracts
- **Registry System**: Quản lý địa chỉ contracts động
- **Limit Orders**: Đặt lệnh mua/bán với giá giới hạn
- **Token Swap**: Swap tokens qua multiple DEX (Uniswap V2, PancakeSwap)
- **Staking Rewards**: Stake tokens để nhận rewards với epoch system
- **Trade Token**: ERC20 token với mint/burn và pause functionality

### 🌐 Backend API
- **REST API** cho Orders, Receipts, Transactions, Users
- **EIP-712 Authentication** (không password, chống replay attacks)
- **Multichain Support** (Sepolia, BSC Testnet, Polygon Amoy)
- **Event Listeners** đồng bộ on-chain events
- **IPFS Integration** cho decentralized receipt storage
- **MongoDB** với Mongoose ODM

---

## 🏗️ Kiến Trúc Project

```
evm-multichain-wallet-core/
├── contracts/                    # 🔹 Smart Contracts (Solidity 0.8.20)
│   ├── Registry.sol             # Contract registry system
│   ├── LimitOrder.sol           # Limit order functionality
│   ├── SwapRouterProxy.sol      # Multi-DEX swap router
│   ├── UniswapV2Adapter.sol     # Uniswap V2 adapter
│   ├── StakingRewards.sol       # Epoch-based staking system
│   ├── TradeToken.sol           # ERC20 token với advanced features
│   └── MockERC20.sol            # Mock token cho testing
│
├── scripts/                     # 🔹 Deployment & Management Scripts
│   ├── 00_registry.js           # Deploy Registry contract
│   ├── 01_limitOrder.js         # Deploy LimitOrder contract
│   ├── 02_swap.js               # Deploy Swap system + seed liquidity
│   ├── 03_staking.js            # Deploy Staking contract
│   ├── 04_mint_tradetoken.js    # Mint TradeToken for testing
│   ├── 05_seedStaking.js        # Seed staking rewards
│   ├── 06_supported_tokens.js   # Configure supported tokens
│   └── 07_simple_stake.js       # Simple staking for testing
│
├── server/                      # 🔹 Node.js Backend API
│   ├── config/                  # Configuration management
│   ├── controllers/             # HTTP request handlers
│   ├── models/                  # MongoDB/Mongoose models
│   ├── services/                # Business logic layer
│   ├── routes/                  # Express routes
│   ├── middlewares/             # Express middlewares
│   ├── utils/                   # Helper utilities
│   └── app.js                   # Express application entry
│
├── test/                        # 🔹 Smart Contract Tests
├── deployments/                 # 🔹 Deployed contract addresses
├── artifacts/                   # 🔹 Compiled contracts (auto-generated)
├── hardhat.config.js            # Hardhat configuration
└── package.json                 # Dependencies & scripts
```

---

## 🚀 Quick Start

### 1. Cài Đặt Dependencies
```bash
git clone <repository-url>
cd evm-multichain-wallet-core

npm install
```

### 2. Cấu Hình Environment
```bash
# Tạo file .env
cp .env.example .env

# Chỉnh sửa .env với thông tin của bạn:
# - PRIVATE_KEY (testnet wallet)
# - RPC endpoints (Alchemy/Infura)
# - MongoDB URI
# - IPFS API keys (optional)
```

### 3. Compile Smart Contracts
```bash
npm run compile
```

### 4. Deploy Contracts (Sepolia Testnet)
```bash
# Bước 1: Deploy Registry
npx hardhat run scripts/00_registry.js --network sepolia

# Bước 2: Deploy LimitOrder
npx hardhat run scripts/01_limitOrder.js --network sepolia

# Bước 3: Deploy Swap System + Seed Liquidity
npx hardhat run scripts/02_swap.js --network sepolia

# Bước 4: Deploy Staking
npx hardhat run scripts/03_staking.js --network sepolia

# Bước 5: Mint TradeToken cho testing
npx hardhat run scripts/04_mint_tradetoken.js --network sepolia

# Bước 6: Seed Staking (tạo data test)
npx hardhat run scripts/07_simple_stake.js --network sepolia
```

### 5. Khởi Động Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:4000`

---

## 📋 Environment Variables

Tạo file `.env` với các biến sau:

```bash
# ===== General =====
NODE_ENV=development
PORT=4000

# ===== Database =====
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# ===== Blockchain RPC =====
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_BSC_TESTNET=https://data-seed-prebsc-1-s1.binance.org:8545/
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

# ===== Wallet =====
PRIVATE_KEY=0x...  # ⚠️ Chỉ dùng testnet wallet!

# ===== IPFS (Optional) =====
IPFS_PROVIDER=web3storage
IPFS_API_KEY=eyJhbGciOiJI...

# ===== Explorer API Keys (Optional - for verification) =====
ETHERSCAN_API_KEY=ABC123...
BSCSCAN_API_KEY=XYZ789...
POLYGONSCAN_API_KEY=DEF456...

# ===== Security =====
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 🔗 Hướng Dẫn Lấy API Keys

#### MongoDB Atlas (Database)
1. Đăng ký tại [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Tạo free cluster (M0)
3. Tạo database user với password
4. Whitelist IP (0.0.0.0/0 cho development)
5. Copy connection string → paste vào `MONGO_URI`

#### Alchemy (RPC Provider)
1. Đăng ký tại [Alchemy](https://www.alchemy.com)
2. Tạo apps cho Sepolia và Polygon Amoy
3. Copy HTTP URLs → paste vào `RPC_SEPOLIA`, `RPC_POLYGON_AMOY`

#### Web3.Storage (IPFS)
1. Đăng ký tại [Web3.Storage](https://web3.storage)
2. Tạo API token
3. Copy token → paste vào `IPFS_API_KEY`

---

## 🔗 Smart Contracts

### Core Contracts

#### **Registry.sol**
- **Mục đích**: Quản lý địa chỉ tất cả contracts khác
- **Functions**: `registerContract()`, `getContract()`, `getAllContracts()`
- **Benefits**: Backend tự động discover addresses, dễ upgrade

#### **LimitOrder.sol**
- **Mục đích**: Tạo và quản lý limit orders
- **Features**: EIP-712 signatures, order matching, expiration
- **Events**: `OrderCreated`, `OrderCancelled`, `OrderFilled`

#### **SwapRouterProxy.sol**
- **Mục đích**: Unified router cho multiple DEX
- **Features**: Protocol fees, adapter system, token whitelisting
- **Supported DEX**: Uniswap V2, PancakeSwap, SushiSwap

#### **UniswapV2Adapter.sol**
- **Mục đích**: Adapter cho Uniswap V2 và forks
- **Features**: Auto path finding, slippage protection

#### **StakingRewards.sol**
- **Mục đích**: Stake tokens để nhận rewards
- **Features**: Epoch-based rewards, lock periods, emergency withdraw
- **Tiers**: Bronze/Silver/Gold với discount benefits

#### **TradeToken.sol**
- **Mục đích**: Native token của protocol
- **Features**: ERC20 + mint/burn + pausable + capped supply

### Contract Addresses (Sepolia Testnet)

```javascript
{
  "registry": "0xA9816eEa32Eb99fcd34Bb10D3ccdF527c2024933",
  "limitOrder": "0x2a7F6A779f7dbF3222f97e8EC397B62ac4fA5DB2",
  "swapRouter": "0x2F752CE9a2709871Eb0e696dEFC985e12912a2F1",
  "uniswapV2Adapter": "0x62ebeA95a95326dDcb7b83D0572CFb41C4c14809",
  "stakingRewards": "0x38255A9d647229C641c9addD4e7A55724F9F0F71",
  "tradeToken": "0x9d354189653E8885E14B1E684B150e2e5c338370",
  "weth": "0xd063FE3D9782296503Aef5eA0B4374C1C11f5119",
  "mockLink": "0x76519Fe93AA139e45813BA73FBBffc35A39b13B0"
}
```

---

## 📜 Deployment Scripts

### Thứ Tự Deploy (Quan Trọng!)

```bash
# 1. Registry (foundation)
npx hardhat run scripts/00_registry.js --network sepolia

# 2. LimitOrder
npx hardhat run scripts/01_limitOrder.js --network sepolia

# 3. Swap System (SwapRouter + Adapters + Mock DEX + Liquidity)
npx hardhat run scripts/02_swap.js --network sepolia

# 4. Staking System
npx hardhat run scripts/03_staking.js --network sepolia

# 5. Mint TradeToken for testing
npx hardhat run scripts/04_mint_tradetoken.js --network sepolia

# 6. Seed staking data (optional)
npx hardhat run scripts/07_simple_stake.js --network sepolia
```

### Script Functions

| Script | Mục Đích | Output |
|--------|----------|---------|
| `00_registry.js` | Deploy Registry contract | Registry address |
| `01_limitOrder.js` | Deploy LimitOrder + register | LimitOrder address |
| `02_swap.js` | Deploy swap system + seed liquidity | SwapRouter, Adapters, Mock DEX |
| `03_staking.js` | Deploy StakingRewards | StakingRewards address |
| `04_mint_tradetoken.js` | Mint TradeToken cho users | Mint transactions |
| `07_simple_stake.js` | Stake tokens để test UI | Staking data |

### Environment Variables cho Scripts

```bash
# Swap script customization
SEED_TRADE=1000          # TRADE tokens per pool
SEED_LINK=1000           # mLINK tokens per pool  
SEED_WETH=0.05           # WETH per pool
SEED_ETH_FOR_WETH=0.15   # Total ETH to wrap

# Staking script customization
STAKE_AMOUNT=1000        # Amount to stake for testing
```

---

## 🌐 Backend API

### Server Architecture

```
server/
├── config/
│   ├── chains.js        # Multi-chain configuration
│   ├── env.js          # Environment validation
│   ├── logger.js       # Logging setup
│   └── DBConfig.js     # MongoDB connection
├── controllers/        # HTTP handlers (thin layer)
├── services/          # Business logic
├── models/            # Database models
├── routes/            # Express routes
├── middlewares/       # Cross-cutting concerns
└── utils/             # Helper functions
```

### API Endpoints

#### Authentication
```
POST /api/auth/nonce       # Get nonce for EIP-712 signing
POST /api/auth/verify      # Verify signature & get session
```

#### Orders
```
GET    /api/orders         # List user orders
POST   /api/orders         # Create new order
DELETE /api/orders/:id     # Cancel order
GET    /api/orders/:id     # Get order details
```

#### Transactions
```
GET /api/transactions      # List transactions
GET /api/transactions/:hash # Get transaction details
```

#### Receipts
```
GET /api/receipts          # List IPFS receipts
GET /api/receipts/:hash    # Get receipt by txHash
```

#### Users
```
GET    /api/users/profile  # Get user profile
PUT    /api/users/profile  # Update profile
GET    /api/users/stats    # Get user statistics
```

### Authentication Flow (EIP-712)

1. **Frontend** request nonce: `GET /api/auth/nonce?address=0x...`
2. **User** signs typed data với MetaMask
3. **Frontend** gửi signature: `POST /api/auth/verify`
4. **Backend** verify signature → issue JWT token
5. **Subsequent requests** dùng JWT trong Authorization header

---

## 🧪 Testing

### Smart Contract Tests
```bash
# Run all tests
npx hardhat test

# Run specific test
npx hardhat test test/LimitOrder.business.test.js

# Run with gas report
REPORT_GAS=true npx hardhat test

# Run coverage
npx hardhat coverage
```

### Backend API Tests
```bash
# Run Jest tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testPathPattern=order
```

---

## 🔧 Development

### Prerequisites
- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MongoDB** ≥ 5.0 (local hoặc Atlas)
- **MetaMask** với testnet tokens

### Local Development Setup

```bash
# 1. Clone & install
git clone <repo-url>
cd evm-multichain-wallet-core
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env với your keys

# 3. Start MongoDB (nếu local)
mongod --dbpath /path/to/db

# 4. Compile contracts
npm run compile

# 5. Deploy to testnet
npx hardhat run scripts/00_registry.js --network sepolia
# ... (follow deployment order)

# 6. Start backend
npm run dev
```

### Development Workflow

1. **Smart Contract Changes**:
   ```bash
   # Edit contracts/*.sol
   npm run compile
   npx hardhat test
   # Deploy to testnet
   ```

2. **Backend Changes**:
   ```bash
   # Edit server/**/*.js
   npm test
   npm run dev
   ```

3. **Integration Testing**:
   ```bash
   # Test full flow
   npm run test:integration
   ```

---

## 🌍 Multichain Support

### Supported Networks

| Network | Chain ID | RPC | Explorer | Faucet |
|---------|----------|-----|----------|--------|
| **Sepolia** | 11155111 | Alchemy/Infura | [etherscan.io](https://sepolia.etherscan.io) | [sepoliafaucet.com](https://sepoliafaucet.com) |
| **BSC Testnet** | 97 | Binance RPC | [bscscan.com](https://testnet.bscscan.com) | [bnbchain.org](https://testnet.bnbchain.org/faucet-smart) |
| **Polygon Amoy** | 80002 | Alchemy | [polygonscan.com](https://amoy.polygonscan.com) | [polygon.technology](https://faucet.polygon.technology) |

### Chain Configuration

Trong `server/config/chains.js`:
```javascript
export const CHAINS = {
  11155111: {
    name: "Sepolia",
    rpc: process.env.RPC_SEPOLIA,
    explorer: "https://sepolia.etherscan.io",
    nativeToken: { symbol: "ETH", decimals: 18 }
  },
  97: {
    name: "BSC Testnet", 
    rpc: process.env.RPC_BSC_TESTNET,
    explorer: "https://testnet.bscscan.com",
    nativeToken: { symbol: "BNB", decimals: 18 }
  }
};
```

---

## 💰 Testnet Tokens

### Lấy Testnet Tokens (Miễn Phí)

#### Sepolia ETH
- **Faucet**: [sepoliafaucet.com](https://sepoliafaucet.com)
- **Alternative**: [alchemy.com/faucets](https://www.alchemy.com/faucets/ethereum-sepolia)
- **Amount**: 0.5 ETH/day
- **Requirements**: GitHub account

#### BSC Testnet BNB  
- **Faucet**: [testnet.bnbchain.org](https://testnet.bnbchain.org/faucet-smart)
- **Amount**: 0.1 BNB/day
- **Requirements**: BNB wallet address

#### Polygon Amoy MATIC
- **Faucet**: [faucet.polygon.technology](https://faucet.polygon.technology)
- **Amount**: 1 MATIC/day
- **Requirements**: Alchemy account (free)

---

## 🔐 Security

### Smart Contract Security
- ✅ **OpenZeppelin** contracts cho security patterns
- ✅ **ReentrancyGuard** cho tất cả state-changing functions
- ✅ **Pausable** emergency controls
- ✅ **Ownable** access control
- ✅ **SafeERC20** cho token transfers

### Backend Security
- ✅ **EIP-712** authentication (no passwords)
- ✅ **Rate limiting** chống spam
- ✅ **CORS** whitelist
- ✅ **Input validation** và sanitization
- ✅ **Error handling** không leak sensitive info

### Best Practices
- ⚠️ **Never commit private keys**
- ⚠️ **Use testnet wallets only** cho development
- ⚠️ **Verify contracts** trên explorer
- ⚠️ **Test thoroughly** trước khi lên mainnet
- ⚠️ **Monitor gas prices** và optimize

---

## 📊 Features Deep Dive

### 🎯 Limit Orders
```solidity
// Tạo limit order
function createOrder(
    address tokenIn,
    address tokenOut, 
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 limitPrice,
    uint256 deadline
) external returns (uint256 orderId);

// Hủy order
function cancelOrder(uint256 orderId) external;

// Fill order (bất kỳ ai)
function fillOrder(uint256 orderId, uint256 amountOut) external;
```

### 🔄 Token Swap
```solidity
// Swap exact tokens for tokens
function swapExactTokensForTokens(SwapParams calldata params) 
    external returns (uint256 amountOut);

// Get quote
function getAmountOut(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    DexType dexType,
    bytes calldata extraData
) external view returns (uint256 amountOut);
```

### 💎 Staking System
```solidity
// Stake tokens
function stake(uint256 amount) external;

// Withdraw staked tokens
function withdraw(uint256 amount) external;

// Claim rewards
function claimRewards() external;

// Emergency withdraw (with penalty)
function emergencyWithdraw(uint256 amount) external;
```

---

## 🛠️ Troubleshooting

### Common Issues

#### "Insufficient funds for intrinsic transaction cost"
**Nguyên nhân**: Không đủ ETH/BNB/MATIC để trả gas
**Giải pháp**: Lấy testnet tokens từ faucets

#### "Router: token chưa support"
**Nguyên nhân**: Token chưa được add vào SwapRouter whitelist
**Giải pháp**: 
```bash
npx hardhat run scripts/06_supported_tokens.js --network sepolia
```

#### "Router: adapter chưa cấu hình"
**Nguyên nhân**: DEX adapter chưa được set
**Giải pháp**: Chạy lại `scripts/02_swap.js`

#### "Start time in past" (Staking)
**Nguyên nhân**: Epoch start time đã qua
**Giải pháp**: Dùng `scripts/07_simple_stake.js` thay vì epoch system

#### Backend không start
**Nguyên nhân**: MongoDB connection failed
**Giải pháp**: Check `MONGO_URI` trong `.env`

### Debug Commands

```bash
# Check network connection
npx hardhat run --network sepolia -e "console.log(await ethers.provider.getNetwork())"

# Check deployer balance  
npx hardhat run --network sepolia -e "
const [signer] = await ethers.getSigners();
const balance = await ethers.provider.getBalance(signer.address);
console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');
"

# Check contract exists
npx hardhat run --network sepolia -e "
const code = await ethers.provider.getCode('0x...');
console.log('Contract exists:', code !== '0x');
"

# MongoDB connection test
node -e "require('./server/config/DBConfig.js')"
```

---

## 📚 API Documentation

### Swagger UI
Sau khi start server, truy cập: `http://localhost:4000/api-docs`

### Example API Calls

#### Create Limit Order
```javascript
POST /api/orders
{
  "tokenIn": "0x9d354189653E8885E14B1E684B150e2e5c338370",
  "tokenOut": "0xd063FE3D9782296503Aef5eA0B4374C1C11f5119", 
  "amountIn": "1000000000000000000",
  "minAmountOut": "50000000000000000",
  "limitPrice": "20000000000000000",
  "deadline": 1735123200,
  "signature": "0x...",
  "nonce": 12345
}
```

#### Get User Orders
```javascript
GET /api/orders?address=0x...
Authorization: Bearer <jwt-token>
```

---

## 🚀 Production Deployment

### Smart Contracts
```bash
# Deploy to mainnet (⚠️ Use mainnet wallet with real ETH)
npx hardhat run scripts/00_registry.js --network mainnet
npx hardhat run scripts/01_limitOrder.js --network mainnet
# ... (follow same order)

# Verify contracts
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> [CONSTRUCTOR_ARGS]
```

### Backend Server
```bash
# Production environment
NODE_ENV=production
PORT=4000

# Start with PM2 (recommended)
pm2 start server/app.js --name "wallet-api"

# Or with Docker
docker build -t wallet-api .
docker run -p 4000:4000 --env-file .env wallet-api
```

### Infrastructure Recommendations
- **Reverse Proxy**: Nginx với SSL
- **Database**: MongoDB Atlas (managed)
- **Monitoring**: PM2 + DataDog/NewRelic
- **Backup**: Automated DB backups
- **CDN**: CloudFlare cho static assets

---

## 📈 Performance & Monitoring

### Metrics to Track
- **Transaction Success Rate**
- **Order Fill Rate** 
- **API Response Times**
- **Gas Usage** per transaction
- **IPFS Upload Success Rate**

### Health Checks
```bash
# API health
curl http://localhost:4000/health

# Database health
curl http://localhost:4000/health/db

# Blockchain health  
curl http://localhost:4000/health/blockchain
```

---

## 🤝 Contributing

### Development Guidelines
1. **Branch naming**: `feature/<scope>`, `fix/<scope>`, `docs/<scope>`
2. **Commit messages**: Conventional commits format
3. **PR size**: <300 LOC với tests và documentation
4. **Code review**: Required trước khi merge

### Pull Request Checklist
- [ ] Tests pass (`npm test` + `npx hardhat test`)
- [ ] Linter clean (`npm run lint`)
- [ ] Documentation updated
- [ ] Environment variables documented
- [ ] Breaking changes noted

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🆘 Support

### Documentation
- **Smart Contracts**: [contracts/README.md](./contracts/README.md)
- **Deployment Scripts**: [scripts/README.md](./scripts/README.md)
- **API Reference**: `http://localhost:4000/api-docs` (Swagger)

### Community
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

## 🎯 Roadmap

### ✅ Completed
- [x] Registry system với dynamic contract discovery
- [x] Limit Orders với EIP-712 signatures
- [x] Multi-DEX swap system
- [x] Epoch-based staking rewards
- [x] IPFS receipt storage
- [x] REST API với authentication
- [x] Multichain support (3 testnets)

### 🚧 In Progress
- [ ] Frontend DApp integration
- [ ] Advanced order types (stop-loss, take-profit)
- [ ] Liquidity mining programs
- [ ] Cross-chain bridge integration

### 🔮 Future
- [ ] Mainnet deployment
- [ ] Mobile app support
- [ ] Advanced analytics dashboard
- [ ] DAO governance integration

---

**Built with ❤️ for the DeFi ecosystem**

*Happy Trading! 🚀*