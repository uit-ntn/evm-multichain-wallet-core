# EVM Multichain Wallet - Limit Orders + IPFS Receipts

Một **Hardhat cho Backend project** production-ready cho EVM DApp hỗ trợ **Limit Orders**, **multichain event sync**, và **decentralized receipts trên IPFS**.  
Repository này tích hợp **Smart Contracts** và **Backend API** để đồng bộ ABI/addresses và đơn giản hóa CI/CD.

---

## ✨ Tính Năng Chính

- **Kiến trúc Clean** chia tách rõ ràng: **middleware / controller / model / service / listener / config**
- **REST API** cho Orders, Receipts, Transactions, Settings, Admin
- **EIP‑712 authentication** (không mật khẩu; nonces an toàn chống replay)
- **Multichain** registry (Sepolia, Polygon Amoy, BSC Testnet) với **timeout / retry / fallback RPC**
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
RPC_BSC_TESTNET=https://data-seed-prebsc-1-s1.binance.org:8545/

# --- WALLET / DEPLOYER ---
PRIVATE_KEY=0xYOUR_METAMASK_PRIVATE_KEY   # ⚠️ Chỉ dùng ví testnet!

# --- SMART CONTRACT ADDRESSES (sau khi deploy) ---
LIMIT_ORDER_ADDRESS_SEPOLIA=0x...
LIMIT_ORDER_ADDRESS_POLYGON=0x...
LIMIT_ORDER_ADDRESS_BSC_TESTNET=0x...
TRADE_TOKEN_ADDRESS_SEPOLIA=0x...
TRADE_TOKEN_ADDRESS_POLYGON=0x...
TRADE_TOKEN_ADDRESS_BSC_TESTNET=0x...
STAKING_REWARD_ADDRESS_SEPOLIA=0x...
STAKING_REWARD_ADDRESS_POLYGON=0x...
STAKING_REWARD_ADDRESS_BSC_TESTNET=0x...

# --- IPFS STORAGE ---
IPFS_PROVIDER=web3storage
IPFS_API_KEY=eyJhbGciOiJI...  # Token từ web3.storage hoặc Pinata

# --- SECURITY & LOGGING ---
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT=60
LOG_LEVEL=info

# --- ETHERSCAN / POLYGONSCAN / BSCSCAN (để verify contracts) ---
ETHERSCAN_API_KEY=XXXXXXXXXXXXXX
POLYGONSCAN_API_KEY=XXXXXXXXXXXXXX
BSCSCAN_API_KEY=XXXXXXXXXXXXXX
```

## 📋 Hướng Dẫn Lấy Environment Variables

### 🌍 **1. Environment Config**

#### `NODE_ENV`
```bash
NODE_ENV=development  # hoặc production
```
**Giá trị**: `development` (cho dev) hoặc `production` (cho production)

#### `PORT`
```bash
PORT=4000
```
**Giá trị**: Port cho backend server (mặc định: 4000)

---

### 🗄️ **2. MongoDB (Database)**

#### `MONGODB_URI`
```bash
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database_name?retryWrites=true&w=majority
```

**Cách lấy MongoDB URI từ MongoDB Atlas:**

1. **Đăng ký tài khoản MongoDB Atlas**:
   - Truy cập: [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
   - Click "Try Free" → Đăng ký tài khoản (miễn phí)

2. **Tạo Cluster mới**:
   - Chọn **FREE tier (M0)**
   - Chọn Cloud Provider & Region (gần bạn nhất)
   - Đặt tên cluster (ví dụ: `Cluster0`)
   - Click "Create Cluster" (mất khoảng 1-3 phút)

3. **Tạo Database User**:
   - Vào **Database Access** (menu bên trái)
   - Click "Add New Database User"
   - Chọn "Password" authentication
   - Nhập username và password (lưu lại!)
   - Chọn quyền: "Atlas Admin" hoặc "Read and write to any database"
   - Click "Add User"

4. **Whitelist IP Address**:
   - Vào **Network Access** (menu bên trái)
   - Click "Add IP Address"
   - Chọn "Allow Access from Anywhere" (0.0.0.0/0) cho development
   - Hoặc thêm IP cụ thể cho production
   - Click "Confirm"

5. **Lấy Connection String**:
   - Vào **Database** → Click "Connect" ở cluster của bạn
   - Chọn "Connect your application"
   - Chọn Driver: "Node.js", Version: "5.5 or later"
   - Copy connection string
   - **Thay thế**: 
     - `<password>` → password bạn đã tạo ở bước 3
     - `<dbname>` → tên database (ví dụ: `trade_dapp`)
   - Paste vào `.env`: `MONGODB_URI=mongodb+srv://...`

**Ví dụ hoàn chỉnh:**
```bash
MONGODB_URI=mongodb+srv://npthanhnhan2003:123456NTN@cluster0.s1cw26e.mongodb.net/trade_dapp?retryWrites=true&w=majority
```

---

### 🌐 **3. RPC (EVM Testnets)**

#### `RPC_SEPOLIA` (Ethereum Sepolia Testnet)
```bash
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

**Cách lấy từ Alchemy:**

1. **Đăng ký Alchemy**:
   - Truy cập: [https://www.alchemy.com](https://www.alchemy.com)
   - Click "Sign Up" → Đăng ký tài khoản (miễn phí)

2. **Tạo App mới**:
   - Đăng nhập → Click "Create App"
   - Đặt tên app (ví dụ: "EVM Wallet - Sepolia")
   - Chọn Chain: **"Ethereum"**
   - Chọn Network: **"Sepolia"** (Testnet)
   - Click "Create App"

3. **Lấy API Key**:
   - Click vào app vừa tạo
   - Trong tab "View Key"
   - Copy **HTTP URL** (có dạng: `https://eth-sepolia.g.alchemy.com/v2/xxxxx`)
   - Paste vào `.env`: `RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`

**Alternative - RPC miễn phí (không cần API key):**
```bash
# Public RPC (có thể bị rate limit)
RPC_SEPOLIA=https://rpc.sepolia.org

# Hoặc Infura (cần đăng ký)
RPC_SEPOLIA=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

#### `RPC_POLYGON_AMOY` (Polygon Amoy Testnet)
```bash
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

**Cách lấy từ Alchemy:**

1. **Tạo App mới cho Polygon Amoy**:
   - Trong Alchemy Dashboard → Click "Create App"
   - Đặt tên app (ví dụ: "EVM Wallet - Polygon Amoy")
   - Chọn Chain: **"Polygon"**
   - Chọn Network: **"Polygon Amoy"** (Testnet)
   - Click "Create App"

2. **Lấy API Key**:
   - Click vào app vừa tạo
   - Copy **HTTP URL** (có dạng: `https://polygon-amoy.g.alchemy.com/v2/xxxxx`)
   - Paste vào `.env`: `RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY`

**Alternative - RPC miễn phí:**
```bash
# Public RPC (có thể bị rate limit)
RPC_POLYGON_AMOY=https://rpc-amoy.polygon.technology

# Hoặc DRPC (miễn phí)
RPC_POLYGON_AMOY=https://polygon-amoy.drpc.org
```

#### `RPC_BSC_TESTNET` (Binance Smart Chain Testnet)
```bash
RPC_BSC_TESTNET=https://data-seed-prebsc-1-s1.binance.org:8545/
```

**BSC Testnet RPC:**

**RPC miễn phí (khuyên dùng):**
```bash
# Binance official RPC (khuyên dùng)
RPC_BSC_TESTNET=https://data-seed-prebsc-1-s1.binance.org:8545/

# Alternative endpoints
RPC_BSC_TESTNET=https://data-seed-prebsc-2-s1.binance.org:8545/
RPC_BSC_TESTNET=https://data-seed-prebsc-1-s2.binance.org:8545/

# Hoặc nodereal.io (miễn phí)
RPC_BSC_TESTNET=https://bsc-testnet.nodereal.io/v1/e9a36765eb8a40b9bd12e680a1fd2bc5
```

**Lưu ý**: BSC Testnet có nhiều RPC endpoints miễn phí và ổn định, không cần API key từ Alchemy/Infura.

---

### 👛 **4. Wallet (Testnet Account)**

#### `PRIVATE_KEY`
```bash
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**⚠️ LƯU Ý QUAN TRỌNG**: 
- **CHỈ DÙNG VÍ TESTNET**, không bao giờ dùng ví có tiền thật!
- **KHÔNG BAO GIỜ** commit private key lên Git
- Tạo ví riêng biệt cho development

**Cách lấy Private Key từ MetaMask:**

1. **Mở MetaMask Extension/App**

2. **Export Private Key**:
   - Click vào avatar/icon account ở góc trên
   - Chọn **"Account details"**
   - Click **"Export Private Key"**
   - Nhập password của MetaMask
   - Copy private key (có dạng: `0x1234567890abcdef...`)

3. **Paste vào .env**: 
   ```bash
   PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ```

**Tạo ví testnet mới (Khuyên dùng):**

1. **Tạo Account mới trong MetaMask**:
   - MetaMask → Click menu (3 dấu gạch ngang)
   - Chọn **"Create Account"** hoặc **"Add Account"**
   - Đặt tên: "Testnet Wallet" hoặc "Development"
   - Click "Create"

2. **Lấy Testnet Tokens** (để deploy contracts):
   
   **Sepolia ETH**:
   - Truy cập: [https://sepoliafaucet.com](https://sepoliafaucet.com)
   - Hoặc: [https://www.alchemy.com/faucets/ethereum-sepolia](https://www.alchemy.com/faucets/ethereum-sepolia)
   - Nhập địa chỉ ví → Click "Send Me ETH"
   - Chờ 1-5 phút để nhận ETH

   **Polygon Amoy MATIC**:
   - Truy cập: [https://faucet.polygon.technology](https://faucet.polygon.technology)
   - Chọn "Polygon Amoy Testnet"
   - Nhập địa chỉ ví → Click "Submit"
   - Chờ 1-5 phút để nhận MATIC

   **BSC Testnet BNB**:
   - Truy cập: [https://testnet.bnbchain.org/faucet-smart](https://testnet.bnbchain.org/faucet-smart)
   - Nhập địa chỉ ví → Click "Give me BNB"
   - Hoặc: [https://testnet.binance.org/faucet-smart](https://testnet.binance.org/faucet-smart)
   - Chờ 1-5 phút để nhận BNB testnet

3. **Export Private Key của ví testnet mới** (theo bước 2 ở trên)

---

### 🏗️ **5. Smart Contract Addresses (sẽ có sau khi deploy)**

#### `LIMIT_ORDER_ADDRESS_SEPOLIA`
```bash
LIMIT_ORDER_ADDRESS_SEPOLIA=0x742d35Cc6634C0532925a3b8D4C9db4c2c4b1234
```

#### `LIMIT_ORDER_ADDRESS_POLYGON`
```bash
LIMIT_ORDER_ADDRESS_POLYGON=0x8ba1f109551bD432803012645Hac136c0567890
```

**Cách lấy Contract Addresses:**

1. **Deploy Contracts**:
   ```bash
   # Deploy lên Sepolia
   npx hardhat run scripts/deploy.js --network sepolia
   
   # Deploy lên Polygon Amoy
   npx hardhat run scripts/deploy.js --network polygonAmoy
   ```

2. **Copy Address từ Console Output**:
   - Sau khi deploy thành công, bạn sẽ thấy output như:
   ```
   ✅ LimitOrder deployed to: 0x742d35Cc6634C0532925a3b8D4C9db4c2c4b1234
   ```
   - Copy địa chỉ này

3. **Paste vào .env**:
   ```bash
   LIMIT_ORDER_ADDRESS_SEPOLIA=0x742d35Cc6634C0532925a3b8D4C9db4c2c4b1234
   LIMIT_ORDER_ADDRESS_POLYGON=0x8ba1f109551bD432803012645Hac136c0567890
   ```

**Lưu ý**: Để trống cho đến khi deploy contracts xong!

---

### 📦 **6. IPFS Storage**

#### `IPFS_PROVIDER`
```bash
IPFS_PROVIDER=web3storage  # hoặc pinata
```

#### `IPFS_API_KEY`
```bash
IPFS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Cách lấy từ Web3.Storage (Miễn phí, Khuyên dùng):**

1. **Đăng ký tài khoản**:
   - Truy cập: [https://web3.storage](https://web3.storage)
   - Click "Sign Up" → Đăng ký bằng email hoặc GitHub
   - Xác nhận email

2. **Tạo API Token**:
   - Đăng nhập → Click **"Create API Token"** ở dashboard
   - Đặt tên token (ví dụ: "EVM Wallet Development")
   - Click "Create"
   - **Copy token ngay** (chỉ hiện 1 lần! Lưu lại)

3. **Paste vào .env**:
   ```bash
   IPFS_PROVIDER=web3storage
   IPFS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjpleGFtcGxl...
   ```

**Alternative - Pinata:**

1. **Đăng ký Pinata**:
   - Truy cập: [https://pinata.cloud](https://pinata.cloud)
   - Click "Sign Up" → Đăng ký tài khoản

2. **Tạo API Key**:
   - Đăng nhập → Vào **"API Keys"**
   - Click **"New Key"**
   - Đặt tên key
   - Chọn quyền: "PinFileToIPFS", "PinJSONToIPFS"
   - Click "Create Key"
   - Copy **JWT Token**

3. **Cấu hình trong .env**:
   ```bash
   IPFS_PROVIDER=pinata
   IPFS_API_KEY=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

### 🔍 **7. Verify (Optional - cho deploy scripts)**

#### `ETHERSCAN_API_KEY`
```bash
ETHERSCAN_API_KEY=ABC123XYZ789DEF456GHI012
```

**Cách lấy Etherscan API Key:**

1. **Đăng ký Etherscan**:
   - Truy cập: [https://etherscan.io/register](https://etherscan.io/register)
   - Điền thông tin → Click "Create Account"
   - Xác nhận email

2. **Tạo API Key**:
   - Đăng nhập → Click **"My Account"** (góc trên bên phải)
   - Vào tab **"API-KEYs"**
   - Click **"Add"** để tạo API key mới
   - Đặt tên (ví dụ: "Development")
   - Click "Create"
   - Copy **API Key Token**

3. **Paste vào .env**:
   ```bash
   ETHERSCAN_API_KEY=ABC123XYZ789DEF456GHI012JKL345MNO678
   ```

#### `POLYGONSCAN_API_KEY`
```bash
POLYGONSCAN_API_KEY=PQR901STU234VWX567YZA890BCD123
```

**Cách lấy Polygonscan API Key:**

1. **Đăng ký Polygonscan**:
   - Truy cập: [https://polygonscan.com/register](https://polygonscan.com/register)
   - Điền thông tin → Click "Create Account"
   - Xác nhận email

2. **Tạo API Key**:
   - Đăng nhập → Click **"My Account"** (góc trên bên phải)
   - Vào tab **"API-KEYs"**
   - Click **"Add"** để tạo API key mới
   - Đặt tên (ví dụ: "Development")
   - Click "Create"
   - Copy **API Key Token**

3. **Paste vào .env**:
   ```bash
   POLYGONSCAN_API_KEY=PQR901STU234VWX567YZA890BCD123EFG456
   ```

#### `BSCSCAN_API_KEY`
```bash
BSCSCAN_API_KEY=EFG456HIJ789KLM012NOP345QRS678
```

**Cách lấy BSCScan API Key:**

1. **Đăng ký BSCScan**:
   - Truy cập: [https://bscscan.com/register](https://bscscan.com/register)
   - Điền thông tin → Click "Create Account"
   - Xác nhận email

2. **Tạo API Key**:
   - Đăng nhập → Click **"My Account"** (góc trên bên phải)
   - Vào tab **"API-KEYs"**
   - Click **"Add"** để tạo API key mới
   - Đặt tên (ví dụ: "Development")
   - Click "Create"
   - Copy **API Key Token**

3. **Paste vào .env**:
   ```bash
   BSCSCAN_API_KEY=EFG456HIJ789KLM012NOP345QRS678TUV901
   ```

**Lưu ý**: API keys này chỉ cần khi bạn muốn verify contracts trên explorer. Có thể để trống nếu không cần verify.

---

### 🚦 **8. Rate Limiting**

#### `RATE_LIMIT_WINDOW_MS`
```bash
RATE_LIMIT_WINDOW_MS=900000  # 15 phút = 900,000 milliseconds
```

**Giá trị**: Thời gian window tính bằng milliseconds
- `60000` = 1 phút
- `300000` = 5 phút
- `900000` = 15 phút (khuyên dùng)

#### `RATE_LIMIT_MAX_REQUESTS`
```bash
RATE_LIMIT_MAX_REQUESTS=100  # Số requests tối đa trong window
```

**Giá trị**: Số lượng requests tối đa trong một window
- `60` = 60 requests
- `100` = 100 requests (khuyên dùng)
- `200` = 200 requests

**Giải thích**: Nếu set `RATE_LIMIT_WINDOW_MS=900000` và `RATE_LIMIT_MAX_REQUESTS=100`, nghĩa là cho phép tối đa 100 requests trong 15 phút từ cùng 1 IP.

---

### 🛡️ **9. Security & Logs**

#### `CORS_ORIGIN`
```bash
CORS_ORIGIN=http://localhost:3000
```

**Giá trị**: URL của frontend application
- Development: `http://localhost:3000`
- Multiple origins: `http://localhost:3000,https://yourdomain.com`
- Production: `https://yourdomain.com`

**Lưu ý**: Nếu frontend chạy trên port khác, thay đổi cho phù hợp.

#### `LOG_LEVEL`
```bash
LOG_LEVEL=info
```

**Giá trị có thể**:
- `error` - Chỉ log lỗi
- `warn` - Log cảnh báo và lỗi
- `info` - Log thông tin, cảnh báo và lỗi (khuyên dùng cho production)
- `debug` - Log chi tiết (cho development)
- `trace` - Log tất cả (rất chi tiết, chỉ cho debug)

---

### 📝 **File .env Hoàn Chỉnh Mẫu**

```bash
# ===== Environment Config =====
NODE_ENV=development
PORT=4000

# ===== MongoDB (Database) =====
MONGODB_URI=mongodb+srv://npthanhnhan2003:123456NTN@cluster0.s1cw26e.mongodb.net/trade_dapp?retryWrites=true&w=majority

# ===== RPC (EVM Testnets) =====
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/abc123def456ghi789jkl012mno345pqr678
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/xyz789uvw456rst123tuv456wxy789
RPC_BSC_TESTNET=https://data-seed-prebsc-1-s1.binance.org:8545/

# ===== Wallet (Testnet Account) =====
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# ===== Smart Contract Addresses (sẽ có sau khi deploy) =====
LIMIT_ORDER_ADDRESS_SEPOLIA=
LIMIT_ORDER_ADDRESS_POLYGON=
LIMIT_ORDER_ADDRESS_BSC_TESTNET=

# ===== IPFS Storage =====
IPFS_PROVIDER=web3storage
IPFS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjpleGFtcGxl...

# ===== Verify (optional for deploy scripts) =====
ETHERSCAN_API_KEY=ABC123XYZ789DEF456GHI012JKL345MNO678
POLYGONSCAN_API_KEY=PQR901STU234VWX567YZA890BCD123EFG456
BSCSCAN_API_KEY=EFG456HIJ789KLM012NOP345QRS678TUV901

# ===== Rate Limiting =====
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===== Security & Logs =====
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
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

# Deploy lên BSC Testnet
npx hardhat run scripts/deploy.js --network bscTestnet

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

- `backend/config/chains.js` export **array các chains được enable** (Sepolia, Polygon Amoy, BSC Testnet)
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

# Deploy lên BSC Testnet
npx hardhat run scripts/deploy.js --network bscTestnet

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
