# Server - Node.js API Backend

Máy chủ API backend cho Ví Đa Chuỗi EVM với kiến trúc sạch, hỗ trợ đa chuỗi và biên lai IPFS.

## 📁 Cấu Trúc Thư Mục

```
server/
├── adapters/           # Tích hợp dịch vụ bên ngoài
│   ├── config.adapter.js       # Quản lý cấu hình tập trung
│   ├── logger.adapter.js       # Morgan HTTP logger + app logger
│   └── blockchain.adapter.js   # Nhà cung cấp blockchain & hợp đồng
│
├── config/             # Tệp cấu hình
│   ├── chains.js       # Đăng ký chuỗi (Sepolia, Polygon Amoy)
│   ├── env.js          # Trình tải biến môi trường
│   ├── logger.js       # Cấu hình ghi log
│   └── DBConfig.js     # Kết nối MongoDB
│
├── controllers/        # Xử lý yêu cầu HTTP
│   ├── orderController.js
│   ├── transactionController.js
│   ├── userController.js
│   ├── receiptController.js
│   ├── settingController.js
│   └── authController.js
│
├── models/             # Mô hình cơ sở dữ liệu (MongoDB/Mongoose)
│   ├── user.model.js           # Tài khoản người dùng & vai trò
│   ├── order.model.js          # Lệnh giới hạn
│   ├── transaction.model.js    # Lịch sử giao dịch
│   ├── receipt.model.js        # Biên lai IPFS
│   └── setting.model.js        # Cài đặt hệ thống
│
├── services/           # Lớp logic nghiệp vụ
│   ├── order.service.js
│   ├── transaction.service.js
│   ├── user.service.js
│   ├── receipt.service.js
│   └── setting.service.js
│
├── routes/             # Tuyến đường Express
│   ├── index.js
│   ├── evm.route.js
│   ├── sui.route.js
│   └── auth.route.js
│
├── middlewares/        # Middleware Express
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   └── authMiddleware.js
│
├── listeners/          # Trình lắng nghe sự kiện blockchain
│   └── blockchain.listener.js  # Sự kiện lệnh (Tạo/Hủy/Khớp)
│
├── utils/              # Tiện ích hỗ trợ
│   └── helpers.js
│
└── app.js              # Điểm vào ứng dụng Express
```

## 🚀 Khởi Động Máy Chủ

### Chế Độ Phát Triển
```bash
npm run dev
# Tự động khởi động lại với nodemon, log có màu
```

### Chế Độ Sản Xuất
```bash
npm start
# Log JSON có cấu trúc, hiệu suất tối ưu
```

## 📋 Biến Môi Trường

Tạo tệp `.env` ở thư mục gốc dự án với các biến sau:

```bash
# Máy chủ
NODE_ENV=development
PORT=4000

# Cơ sở dữ liệu
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/evm-multichain-wallet

# Nhà cung cấp RPC
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

# Ví
PRIVATE_KEY=0x...  # Chỉ ví testnet!

# Địa chỉ hợp đồng (sau khi triển khai)
LIMIT_ORDER_ADDRESS_SEPOLIA=0x...
LIMIT_ORDER_ADDRESS_POLYGON=0x...

# IPFS
IPFS_PROVIDER=web3storage
IPFS_API_KEY=eyJhbGci...

# Bảo mật
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT=60
LOG_LEVEL=info
```

## 🏗️ Kiến Trúc

### **Adapters** - Tích Hợp Bên Ngoài
- **config.adapter.js**: Cấu hình tập trung với xác thực
- **logger.adapter.js**: Ghi log HTTP (Morgan) + ghi log ứng dụng
- **blockchain.adapter.js**: Nhà cung cấp Ethereum, hợp đồng, giao dịch

### **Models** - Lớp Dữ Liệu
- **MongoDB/Mongoose** schemas với xác thực
- **Static methods** cho các truy vấn phổ biến
- **Instance methods** cho các hoạt động nghiệp vụ
- **Indexes** cho tối ưu hiệu suất

### **Controllers** - Lớp HTTP
- Lớp mỏng chỉ xử lý HTTP requests/responses
- Xác thực đầu vào và ánh xạ lỗi
- Gọi services cho logic nghiệp vụ

### **Services** - Logic Nghiệp Vụ
- Logic miền cốt lõi và quy tắc nghiệp vụ
- Điều phối models, adapters và dịch vụ bên ngoài
- Hoạt động không trạng thái khi có thể

### **Listeners** - Xử Lý Sự Kiện
- Lắng nghe sự kiện blockchain (OrderCreated, OrderFilled, v.v.)
- Xử lý idempotent với xử lý lỗi
- Hỗ trợ đa chuỗi

## 📊 Điểm Cuối API

### Kiểm Tra Sức Khỏe
```
GET /health
```

### Người Dùng
```
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
```

### Lệnh (TODO)
```
GET    /api/orders
POST   /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id/cancel
```

### Giao Dịch (TODO)
```
GET    /api/transactions
GET    /api/transactions/:txHash
POST   /api/transactions
```

## 🔧 Phát Triển

### Thêm Model Mới
1. Tạo file trong `models/`
2. Define Mongoose schema với validation
3. Add indexes cho performance
4. Export model

```javascript
// models/example.model.js
const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // ... other fields
}, { timestamps: true });

// Indexes
exampleSchema.index({ name: 1 });

module.exports = mongoose.model('Example', exampleSchema);
```

### Thêm Controller Mới
1. Tạo file trong `controllers/`
2. Import services cần thiết
3. Implement HTTP handlers
4. Add route trong `routes/`

```javascript
// controllers/example.controller.js
const exampleService = require('../services/example.service');

exports.getAll = async (req, res) => {
  try {
    const results = await exampleService.getAll();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Thêm Service Mới
1. Tạo file trong `services/`
2. Import models và adapters
3. Implement business logic
4. Export service functions

```javascript
// services/example.service.js
const Example = require('../models/example.model');

exports.getAll = async () => {
  return await Example.find().sort({ createdAt: -1 });
};

exports.create = async (data) => {
  const example = new Example(data);
  return await example.save();
};
```

## 📝 Ghi Log

### Log Ứng Dụng
```javascript
const { logger } = require('./adapters/logger.adapter');

logger.info('Operation completed', { userId: 123, duration: '50ms' });
logger.error('Operation failed', { error: error.message });
```

### Log HTTP
- Tự động ghi log tất cả HTTP requests với Morgan
- Theo dõi Request ID
- Giám sát thời gian phản hồi
- Làm nổi bật yêu cầu lỗi

### Log Chuyên Biệt
```javascript
const { 
  logDatabaseQuery,
  logBlockchainTransaction,
  logIpfsOperation 
} = require('./adapters/logger.adapter');

logDatabaseQuery('users', 'find', { status: 'active' }, 25);
logBlockchainTransaction(11155111, '0x123...', 'SUCCESS', '21000');
logIpfsOperation('pin', 'QmXXX...', 'SUCCESS');
```

## 🔗 Tích Hợp Blockchain

### Lấy Provider
```javascript
const { getProvider } = require('./adapters/blockchain.adapter');

const provider = getProvider(11155111); // Sepolia
const blockNumber = await provider.getBlockNumber();
```

### Tương Tác Hợp Đồng
```javascript
const { getContract } = require('./adapters/blockchain.adapter');

const contract = getContract(11155111, 'limitOrder', ABI);
const result = await contract.someMethod();
```

### Lắng Nghe Sự Kiện
Các sự kiện được tự động lắng nghe trong `listeners/blockchain.listener.js`:
- OrderCreated (Lệnh được tạo)
- OrderCancelled (Lệnh bị hủy)
- OrderFilled (Lệnh được khớp)

## 🛠️ Tiện Ích

### Cấu Hình
```javascript
const { config, getEnabledChains } = require('./adapters/config.adapter');

console.log(config.port); // 4000
const chains = getEnabledChains(); // Chains với RPC configured
```

### Xác Thực
```javascript
const { isValidAddress } = require('./adapters/blockchain.adapter');

if (!isValidAddress(userAddress)) {
  throw new Error('Invalid Ethereum address');
}
```

## 🔍 Gỡ Lỗi

### Bật Log Gỡ Lỗi
```bash
LOG_LEVEL=debug npm run dev
```

### Kiểm Tra Sức Khỏe
```bash
curl http://localhost:4000/health
```

### Kiểm Tra Kết Nối Blockchain
```javascript
const { healthCheck } = require('./adapters/blockchain.adapter');
const status = await healthCheck();
console.log(status);
```

## 📚 Phụ Thuộc

### Cốt Lõi
- **express**: Web framework
- **mongoose**: MongoDB ODM
- **ethers**: Ethereum library
- **morgan**: HTTP request logger

### Bảo Mật
- **helmet**: Security headers
- **cors**: Cross-origin requests
- **express-rate-limit**: Rate limiting

### Phát Triển
- **nodemon**: Auto-restart server
- **dotenv**: Environment variables

## 🚨 Khắc Phục Sự Cố

### Máy chủ không khởi động
1. Kiểm tra kết nối MongoDB
2. Xác minh biến môi trường
3. Kiểm tra xung đột cổng

### Sự kiện blockchain không nhận được
1. Kiểm tra điểm cuối RPC
2. Xác minh địa chỉ hợp đồng
3. Kiểm tra quyền khóa riêng

### Lỗi cơ sở dữ liệu
1. Kiểm tra MongoDB URI
2. Xác minh quyền truy cập mạng
3. Kiểm tra quyền bộ sưu tập

---

**Chúc Lập Trình Vui Vẻ! 🚀**
