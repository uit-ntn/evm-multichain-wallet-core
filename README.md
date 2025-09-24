# EVM Multichain Wallet Core API

Multi-chain wallet API server hỗ trợ EVM chains (Ethereum, Polygon, BSC) và Sui network. Chỉ đọc dữ liệu (read-only), không lưu trữ private key.

## Tính năng

### EVM Chains
- Lấy số dư ETH/MATIC/BNB
- Lịch sử giao dịch
- Gas price
- Broadcast giao dịch đã ký

### Sui Network  
- Lấy số dư SUI (MIST)
- Lấy thông tin object
- Lịch sử giao dịch
- Dry run giao dịch
- Move call relay (cho server tasks)

## Cài đặt

```bash
# Clone project
cd evm-multichain-wallet-core

# Cài dependencies
npm install

# Copy environment config
copy .env.example .env

# Chạy development
npm run dev

# Hoặc chạy production
npm start
```

## Cấu hình

Chỉnh sửa file `.env`:

```env
NODE_ENV=development
PORT=3000

# EVM RPC URLs
ETH_RPC_URL=
POLYGON_RPC_URL=
BSC_RPC_URL=

# Sui RPC
SUI_RPC_URL=

# Explorer API Keys (tùy chọn, để lấy lịch sử giao dịch)
ETHERSCAN_API_KEY=your-key
POLYGONSCAN_API_KEY=your-key
BSCSCAN_API_KEY=your-key
```

## API Endpoints

### EVM Chains

#### Lấy số dư
```http
GET /api/evm/balance/:address?chain=eth

# Ví dụ
GET /api/evm/balance/0x742d35Cc6634C0532925a3b8D9c3ac5fb2c96c02?chain=polygon
```

#### Lịch sử giao dịch
```http
GET /api/evm/txs/:address?chain=eth&limit=10

# Ví dụ  
GET /api/evm/txs/0x742d35Cc6634C0532925a3b8D9c3ac5fb2c96c02?chain=bsc&limit=20
```

#### Gas price
```http
GET /api/evm/gas/:chain

# Ví dụ
GET /api/evm/gas/eth
```

#### Gửi giao dịch đã ký
```http
POST /api/evm/sendTx
Content-Type: application/json

{
  "signedTransaction": "0x...",
  "chain": "eth"
}
```

### Sui Network

#### Lấy số dư SUI
```http
GET /api/sui/balance/:owner

# Ví dụ
GET /api/sui/balance/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

#### Lấy tất cả số dư
```http
GET /api/sui/balances/:owner
```

#### Lấy thông tin object
```http
GET /api/sui/object/:id

# Ví dụ (Counter object)
GET /api/sui/object/0x123...abc
```

#### Lịch sử giao dịch
```http
GET /api/sui/txs/:address?limit=10
```

#### Move call relay (server tasks)
```http
POST /api/sui/relay/movecall
Content-Type: application/json

{
  "target": "0x2::counter::increment",
  "args": ["0x123..."],
  "typeArgs": [],
  "dryRun": true
}
```

## Response Format

Tất cả API trả về format chuẩn:

```json
{
  "success": true,
  "data": {
    // Dữ liệu
  }
}
```

Hoặc khi có lỗi:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Cài đặt Sui CLI

Để sử dụng đầy đủ tính năng Sui:

```bash
# Windows (PowerShell)
iwr -Uri https://github.com/MystenLabs/sui/releases/latest/download/sui-windows-x86_64.zip -OutFile sui.zip
Expand-Archive sui.zip -DestinationPath C:\\tools\\sui
# Thêm C:\\tools\\sui vào PATH

# Hoặc dùng Chocolatey
choco install sui

# Kiểm tra
sui --version
```

## Cấu trúc dự án

```
src/
├── app.js              # Main application
├── config/             # Configuration
├── middleware/         # Express middleware
├── routes/            # API routes
│   ├── index.js       # Health check & info
│   ├── evm.js         # EVM chains routes
│   └── sui.js         # Sui network routes
├── services/          # Business logic
│   ├── evmService.js  # EVM chains service
│   └── suiService.js  # Sui network service
└── utils/             # Helper functions
    └── helpers.js     # Common utilities
```

## Chạy thử

1. **Health check:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Lấy số dư ETH:**
   ```bash
   curl "http://localhost:3000/api/evm/balance/0x742d35Cc6634C0532925a3b8D9c3ac5fb2c96c02?chain=eth"
   ```

3. **Lấy số dư SUI:**
   ```bash
   curl http://localhost:3000/api/sui/balance/0x1234...
   ```

## Bảo mật

- Helmet.js - Security headers
- CORS enabled
- Rate limiting
- Input validation
- Error handling
- Read-only operations (không lưu private key)

## Ghi chú

- Server chỉ đọc dữ liệu, không ký giao dịch user
- Frontend chịu trách nhiệm ký và gửi giao dịch
- Move call relay chỉ dành cho server-owned tasks
- Cần API key từ explorer để lấy full lịch sử giao dịch