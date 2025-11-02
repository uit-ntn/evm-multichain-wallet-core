# EVM Multichain Wallet - Limit Orders + IPFS Receipts

Một **Hardhat cho Backend project** production-ready cho EVM DApp hỗ trợ **Limit Orders**, **multichain event sync**, và **decentralized receipts trên IPFS**.  
Repository này tích hợp **Smart Contracts** và **Backend API** để đồng bộ ABI/addresses và đơn giản hóa CI/CD.

---

## ✨ Tính Năng Chính

- **Kiến trúc Clean** chia tách rõ ràng: **middleware / controller / model / service / listener / config**
- **REST API** cho Orders, Receipts, Transactions, Settings, Admin
- **EIP‑712 authentication** (không mật khẩu; nonces an toàn chống replay)
- **Multichain** registry (Sepolia, Polygon Amoy) với **timeout / retry / fallback RPC**
- **Event listeners** idempotent cho mỗi chain
- **IPFS receipts** với mapping `txHash ↔ CID`
- **MongoDB + Mongoose** với indexing phù hợp
- Testing (unit/integration/E2E) + performance monitoring

---

## 🗂️ Cấu Trúc Project

```
/contracts/                # 🔹 Smart Contracts (Solidity)
  LimitOrder.sol          # Contract chính cho limit orders
  TradeToken.sol          # Token để trade
  StakingRewards.sol      # Staking rewards
  ReceiptGenerator.sol    # Tạo receipts
  SystemAdmin.sol         # Admin functions
  DexAdapterV2.sol        # DEX adapter
  SwapRouterProxy.sol     # Swap router

/scripts/                  # 🔹 Hardhat deploy & verify scripts
  deploy.js               # Deploy contracts lên networks
  verify.js               # Verify contracts trên explorer

/test/                     # 🔹 Smart contract tests (Hardhat)
  LimitOrder.test.js      # Unit tests cho LimitOrder
  StakingRewards.test.js  # Tests cho staking

/server/                  # 🔹 Node.js API Server
  /config/                # Cấu hình app, DB, chains, logger
    chains.js             # Registry chains & contract addresses
    env.js                # Environment loader/validator
    logger.js             # Logging configuration
    DBConfig.js           # MongoDB connection
  /controllers/           # HTTP handlers (routing layer)
    order.controller.js
    transaction.controller.js
    user.controller.js
  /models/                # Database models (MongoDB/Mongoose)
    order.model.js
    transaction.model.js
    user.model.js
  /services/              # Business logic layer
    order.service.js
    transaction.service.js
    user.service.js
  /routes/                # Express routes
    index.js
    evm.js
    sui.js
    user.route.js
  /middleware/            # Express middlewares
    errorHandler.js
    rateLimiter.js
  /utils/                 # Helper functions
    helpers.js
  /adapters/              # External integrations (empty)
  /listeners/             # Event listeners (empty)
  app.js                  # Express app entry point

/artifacts/               # (auto-generated) Compiled contracts & ABIs
hardhat.config.js         # Cấu hình Hardhat networks & compiler
package.json              # Dependencies & scripts
.env                      # Environment variables
```

> **Lý do thiết kế**: **controllers** xử lý HTTP; **services** implement business logic; **models** xử lý database; **listeners** đồng bộ on-chain events; **middlewares** xử lý cross-cutting concerns; **config** tập trung cấu hình.

---

## 🔧 Yêu Cầu Hệ Thống

- **Node.js** ≥ 18.x (ES2022), **npm** ≥ 9
- **MongoDB** ≥ 5.0 (local hoặc MongoDB Atlas)
- RPC endpoints cho các EVM chains (Alchemy, Infura, ...)
- Metamask wallet với testnet ETH/MATIC
- (Tùy chọn) IPFS provider keys (Web3.Storage, Pinata)

---

## 🔐 Cấu Hình Environment (`.env`)

Tạo file `.env` ở thư mục gốc:

```bash
# --- GENERAL CONFIG ---
NODE_ENV=development
PORT=4000

# --- DATABASE ---
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/evm-multichain-wallet?retryWrites=true&w=majority

# --- RPC PROVIDERS ---
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/<YOUR_ALCHEMY_KEY>
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/<YOUR_ALCHEMY_KEY>

# --- WALLET / DEPLOYER ---
PRIVATE_KEY=0xYOUR_METAMASK_PRIVATE_KEY   # ⚠️ Chỉ dùng ví testnet!

# --- SMART CONTRACT ADDRESSES (sau khi deploy) ---
LIMIT_ORDER_ADDRESS_SEPOLIA=0x...
LIMIT_ORDER_ADDRESS_POLYGON=0x...
TRADE_TOKEN_ADDRESS_SEPOLIA=0x...
TRADE_TOKEN_ADDRESS_POLYGON=0x...
STAKING_REWARD_ADDRESS_SEPOLIA=0x...
STAKING_REWARD_ADDRESS_POLYGON=0x...

# --- IPFS STORAGE ---
IPFS_PROVIDER=web3storage
IPFS_API_KEY=eyJhbGciOiJI...  # Token từ web3.storage hoặc Pinata

# --- SECURITY & LOGGING ---
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT=60
LOG_LEVEL=info

# --- ETHERSCAN / POLYGONSCAN (để verify contracts) ---
ETHERSCAN_API_KEY=XXXXXXXXXXXXXX
POLYGONSCAN_API_KEY=XXXXXXXXXXXXXX
```

## 📋 Hướng Dẫn Lấy Environment Variables

### 🗄️ **1. MongoDB URI**
```bash
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/evm-multichain-wallet
```

**Cách lấy:**
1. **Đăng ký MongoDB Atlas**: [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. **Tạo cluster mới** (chọn FREE tier)
3. **Tạo database user**: Database Access → Add New Database User
4. **Whitelist IP**: Network Access → Add IP Address (0.0.0.0/0 cho development)
5. **Lấy connection string**: Clusters → Connect → Connect your application → Copy connection string
6. **Thay thế**: `<username>`, `<password>`, `<cluster-url>`

### 🌐 **2. RPC Endpoints**
```bash
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
```

**Cách lấy từ Alchemy:**
1. **Đăng ký Alchemy**: [https://www.alchemy.com](https://www.alchemy.com)
2. **Tạo app mới**: Create App → Chọn chain (Ethereum Sepolia / Polygon Amoy)
3. **Copy API Key**: Dashboard → View Key → HTTP URL
4. **Paste vào .env**: Thay thế `YOUR_API_KEY`

**Alternative - RPC miễn phí:**
```bash
# Sepolia (miễn phí)
RPC_SEPOLIA=https://rpc.sepolia.org
RPC_SEPOLIA=https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161

# Polygon Amoy (miễn phí)  
RPC_POLYGON_AMOY=https://rpc-amoy.polygon.technology
RPC_POLYGON_AMOY=https://polygon-amoy.drpc.org
```

### 👛 **3. Private Key**
```bash
PRIVATE_KEY=0x1234567890abcdef...
```

**Cách lấy từ MetaMask:**
1. **Mở MetaMask** → Click avatar → Account details
2. **Export Private Key** → Nhập password → Copy private key
3. **⚠️ LƯU Ý**: Chỉ dùng ví testnet, không dùng ví có tiền thật!

**Tạo ví testnet mới:**
1. **MetaMask** → Create Account → Account 2 (dành riêng cho testnet)
2. **Lấy testnet ETH**: [https://sepoliafaucet.com](https://sepoliafaucet.com)
3. **Lấy testnet MATIC**: [https://faucet.polygon.technology](https://faucet.polygon.technology)

### 🔍 **4. Explorer API Keys**
```bash
ETHERSCAN_API_KEY=ABC123XYZ789
POLYGONSCAN_API_KEY=DEF456UVW012
```

**Etherscan API Key:**
1. **Đăng ký**: [https://etherscan.io/register](https://etherscan.io/register)
2. **Tạo API Key**: My Account → API Keys → Add → Copy API Key Token

**Polygonscan API Key:**
1. **Đăng ký**: [https://polygonscan.com/register](https://polygonscan.com/register)  
2. **Tạo API Key**: My Account → API Keys → Add → Copy API Key Token

### 📦 **5. IPFS Storage**
```bash
IPFS_PROVIDER=web3storage
IPFS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Web3.Storage (Miễn phí):**
1. **Đăng ký**: [https://web3.storage](https://web3.storage)
2. **Tạo API Token**: Account → Create an API Token → Copy token
3. **Paste vào .env**: `IPFS_API_KEY=eyJhbGci...`

**Pinata (Alternative):**
1. **Đăng ký**: [https://pinata.cloud](https://pinata.cloud)
2. **Tạo API Key**: API Keys → New Key → Copy JWT
3. **Cấu hình**:
```bash
IPFS_PROVIDER=pinata
IPFS_API_KEY=Bearer eyJhbGci...
```

### 🏗️ **6. Contract Addresses (Sau khi deploy)**
```bash
LIMIT_ORDER_ADDRESS_SEPOLIA=0x742d35Cc6634C0532925a3b8D4C9db4c2c4b1234
TRADE_TOKEN_ADDRESS_SEPOLIA=0x8ba1f109551bD432803012645Hac136c0567890
```

**Cách lấy:**
1. **Deploy contracts**: `npx hardhat run scripts/deploy.js --network sepolia`
2. **Copy addresses** từ console output
3. **Paste vào .env**: Cập nhật từng contract address

### 📝 **File .env Hoàn Chỉnh Mẫu**
```bash
# --- GENERAL CONFIG ---
NODE_ENV=development
PORT=4000

# --- DATABASE ---
MONGO_URI=mongodb+srv://myuser:mypass123@cluster0.abc123.mongodb.net/evm-multichain-wallet?retryWrites=true&w=majority

# --- RPC PROVIDERS ---
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/abc123def456ghi789
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/xyz789uvw456rst123

# --- WALLET / DEPLOYER ---
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# --- SMART CONTRACT ADDRESSES ---
LIMIT_ORDER_ADDRESS_SEPOLIA=0x742d35Cc6634C0532925a3b8D4C9db4c2c4b1234
LIMIT_ORDER_ADDRESS_POLYGON=0x8ba1f109551bD432803012645Hac136c0567890
TRADE_TOKEN_ADDRESS_SEPOLIA=0x123456789abcdef123456789abcdef1234567890
TRADE_TOKEN_ADDRESS_POLYGON=0xabcdef123456789abcdef123456789abcdef1234

# --- IPFS STORAGE ---
IPFS_PROVIDER=web3storage
IPFS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjp4MTIz

# --- SECURITY & LOGGING ---
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT=60
LOG_LEVEL=info

# --- ETHERSCAN / POLYGONSCAN ---
ETHERSCAN_API_KEY=ABC123XYZ789DEF456GHI012JKL345MNO678
POLYGONSCAN_API_KEY=PQR901STU234VWX567YZA890BCD123EFG456
```

---

## 🚀 Bắt Đầu Nhanh

### 1. Cài Đặt Dependencies
```bash
npm install
```

### 2. Cấu Hình Environment
```bash
# Copy file mẫu và chỉnh sửa
cp .env.example .env
# Điền thông tin RPC, MongoDB, private key vào .env
```

### 3. Compile Smart Contracts
```bash
npm run compile
```

### 4. Deploy Contracts lên Testnet
```bash
# Deploy lên Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy lên Polygon Amoy
npx hardhat run scripts/deploy.js --network polygonAmoy

# Cập nhật contract addresses vào .env
```

### 5. Verify Contracts
```bash
npx hardhat run scripts/verify.js --network sepolia
```

### 6. Chạy Tests
```bash
# Test smart contracts
npx hardhat test

# Test backend API
npm test
```

### 7. Khởi Động Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

---

## 🧱 Trách Nhiệm Từng Layer

### Smart Contracts
- **LimitOrder.sol**: Core logic cho limit orders, events `OrderCreated/Cancelled/Filled`
- **TradeToken.sol**: ERC20 token để test trading
- **StakingRewards.sol**: Staking mechanism với rewards
- **SystemAdmin.sol**: Admin functions như pause/unpause

### Backend Layers

#### Controllers
- **HTTP layer mỏng**: validate input, gọi services, map errors → HTTP status
- **Pagination**: metadata cho list endpoints
- Ví dụ: `order.controller.js`, `transaction.controller.js`

#### Services  
- **Business logic**: tạo/hủy/cập nhật orders, transaction lifecycle
- Gọi adapters (`web3`, `ipfs`) và models, enforce business rules
- Stateless khi có thể

#### Models
- **MongoDB/Mongoose entities**: chỉ persistence và mapping
- **Không có business rules** - chỉ database operations
- Repository pattern cho clean separation

#### Middleware
- **Error handler**: consistent JSON errors với trace ID
- **Rate limiting**: bảo vệ endpoints khỏi abuse
- **CORS**: whitelist allowed origins

#### Config
- **Centralized configuration**: env parsing, chain registry, logger
- **Single source of truth** cho contract addresses & RPC endpoints
- Support multiple chains (Sepolia, Polygon Amoy)

---

## 🌐 Multichain & Chain Registry

- `backend/config/chains.js` export **array các chains được enable** (Sepolia, Polygon Amoy)
- Mỗi chain có: chainId, name, RPC endpoints, explorer, contract addresses
- Auto-detect enabled chains dựa trên RPC configuration
- Explorer helpers tạo links cho tx/address theo từng chain

---

## 🔗 Smart Contracts

### Contracts Chính
- **`LimitOrder.sol`**: Core logic & events (`OrderCreated`, `OrderCancelled`, `OrderFilled`)
- **`TradeToken.sol`**: ERC20 token để test trading
- **`StakingRewards.sol`**: Staking mechanism với rewards
- **`SystemAdmin.sol`**: Admin functions (`pause()` / `unpause()`)
- **`ReceiptGenerator.sol`**: Tạo receipts cho transactions
- **`DexAdapterV2.sol`**: Adapter cho DEX integrations
- **`SwapRouterProxy.sol`**: Proxy cho swap operations

### Commands
```bash
# Compile contracts
npm run compile

# Deploy lên Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy lên Polygon Amoy  
npx hardhat run scripts/deploy.js --network polygonAmoy

# Verify contracts
npx hardhat run scripts/verify.js --network sepolia

# Run tests
npx hardhat test
```

Sau khi deploy, cập nhật contract addresses vào `.env`.

---

> Write endpoints require **EIP‑712** verification; Admin endpoints require `role=admin`.

---

## 🔐 Authentication - EIP‑712 Flow

1. **Request nonce**: `GET /api/auth/nonce?address=0x...`
2. **Sign typed data**: Client ký message với MetaMask
3. **Verify signature**: `POST /api/auth/verify` với signature
4. **Session/JWT**: Server verify và issue token

**Bảo mật**: Nonce có TTL, chống replay attacks, chỉ dùng 1 lần.

---

## 📦 IPFS Receipts

- Backend tạo receipt metadata sau khi transaction confirm và **pin lên IPFS**
- Lưu mapping `txHash ↔ CID` trong database
- Expose public endpoints để retrieve receipts
- Support Web3.Storage hoặc Pinata làm IPFS provider

---

## 🧪 Testing

### Smart Contract Tests
```bash
# Hardhat tests cho contract logic & events
npx hardhat test
```

### Backend API Tests  
```bash
# Jest tests cho API endpoints
npm test
```

### Test Coverage
- **Unit tests**: Contract functions và business logic
- **Integration tests**: API endpoints với database
- **E2E scenarios**: Full flow từ create order → execute → receipt

---

## 🛡️ Bảo Mật

- **EIP‑712** cho tất cả sensitive actions; validate domain/version/chainId
- **Không log** private keys hoặc raw signatures; mask addresses khi cần
- **CORS whitelist** + rate limiting; SSL cho database
- **Secrets** trong `.env` (không commit); sử dụng environment variables
- **Pausable state** cả on-chain và API level

---

## ⚙️ Deployment

### Production Deployment
```bash
# Deploy contracts lên mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Start backend server
NODE_ENV=production PORT=4000 npm start
```

### Best Practices
- Chạy sau reverse proxy (Nginx)
- Configure health checks tại `/health`
- Centralize logs và monitoring
- Backup database thường xuyên

---

## 🧭 Troubleshooting

### Các Lỗi Thường Gặp

- **Contract deployment failed** → Check RPC endpoint, private key, gas limit
- **Backend không start** → Kiểm tra MongoDB connection, port conflicts
- **Transaction failed** → Check gas price, nonce, contract address
- **IPFS upload failed** → Verify API key, network connection

### Debug Commands
```bash
# Check Hardhat networks
npx hardhat run scripts/deploy.js --network sepolia --dry-run

# Test MongoDB connection
node -e "require('./backend/config/DBConfig.js')"

# Check contract addresses
npx hardhat console --network sepolia
```

---

## 🤝 Đóng Góp

### Quy Tắc
- **Branch naming**: `feature/<scope>`, `fix/<scope>`
- **PR nhỏ**: <300 LOC với tests và docs
- **Sync config**: Cập nhật `.env.example` khi thay đổi contracts/RPCs

### Development Flow
1. Fork repository
2. Tạo feature branch
3. Implement + tests
4. Update documentation
5. Submit PR với mô tả chi tiết

---

## ✅ Definition of Done

### Smart Contracts
- ✅ Contracts compiled thành công
- ✅ Deploy lên ít nhất 2 testnets (Sepolia, Polygon Amoy)
- ✅ Verify trên block explorers
- ✅ Unit tests coverage > 80%

### Backend
- ✅ Controllers mỏng; business logic trong services
- ✅ Database operations trong models
- ✅ API endpoints hoạt động với proper error handling
- ✅ Configuration đúng cho multichain

### Integration
- ✅ Contract addresses configured trong backend config
- ✅ Event listeners hoạt động (nếu implement)
- ✅ IPFS receipts tạo valid CIDs
- ✅ End-to-end flow hoạt động trên testnet

## 📚 Tài Liệu Tham Khảo

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js v6 Documentation](https://docs.ethers.org/v6/)
- [MongoDB + Mongoose Guide](https://mongoosejs.com/docs/guide.html)
- [Express.js Documentation](https://expressjs.com/)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)

---

**Happy Coding! 🚀**
