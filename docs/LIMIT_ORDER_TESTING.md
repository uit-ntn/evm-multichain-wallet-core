# 🚀 **LimitOrder Smart Contract - E2E Testing Guide**

## 📋 **Tổng Quan**

Smart contract **LimitOrder.sol** đã được nâng cấp với các tính năng bảo mật cao:
- ✅ **EIP-712 Signature Verification** - Chống replay attacks
- ✅ **Partial Fills** - Hỗ trợ khớp lệnh từng phần  
- ✅ **Front-running Protection** - Nonce system
- ✅ **Gas Optimization** - ReentrancyGuard, Pausable
- ✅ **Fee Management** - Configurable trading fees
- ✅ **Emergency Controls** - Pause/unpause, emergency withdraw

---

## 🛠️ **Cài Đặt & Thiết Lập**

### 1. **Cài Dependencies**
```bash
npm install @openzeppelin/contracts
npm install @nomicfoundation/hardhat-network-helpers
```

### 2. **Compile Contracts**
```bash
npx hardhat compile
```

### 3. **Chạy Tests Local**
```bash
# Run comprehensive tests
npx hardhat test test/LimitOrder.comprehensive.test.js

# Run with gas reports
REPORT_GAS=true npx hardhat test

# Run specific test categories
npx hardhat test --grep "Order Creation"
npx hardhat test --grep "Order Execution"
npx hardhat test --grep "Security"
```

---

## 🌐 **Deploy lên Testnets**

### 1. **Deploy lên Sepolia**
```bash
npx hardhat run scripts/deploy-limitorder.js --network sepolia
```

### 2. **Deploy lên Polygon Amoy**
```bash
npx hardhat run scripts/deploy-limitorder.js --network polygonAmoy
```

### 3. **Deploy lên BSC Testnet**
```bash
npx hardhat run scripts/deploy-limitorder.js --network bscTestnet
```

---

## 🧪 **E2E Testing Scenarios**

### **Scenario 1: Basic Limit Order Flow**

#### **Step 1: Create Order**
```javascript
// Frontend/Backend tạo EIP-712 signature
const orderData = {
  tokenIn: "0xTokenA_Address",
  tokenOut: "0xTokenB_Address", 
  amountIn: ethers.parseEther("100"),
  minAmountOut: ethers.parseEther("95"),
  limitPrice: ethers.parseEther("0.95"), // 1 TokenA = 0.95 TokenB
  deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  nonce: userNonce
};

const signature = await user.signTypedData(domain, types, orderData);

// Submit to contract
const tx = await limitOrder.createOrder(
  orderData.tokenIn,
  orderData.tokenOut,
  orderData.amountIn,
  orderData.minAmountOut,
  orderData.limitPrice,
  orderData.deadline,
  signature
);
```

#### **Step 2: Execute Order**
```javascript
// Executor (bot/market maker) fills order
const executeTx = await limitOrder.connect(executor).executeOrder(
  orderId,
  ethers.parseEther("100"), // Fill full amount
  ethers.parseEther("95")   // Provide exact minimum
);
```

#### **Step 3: Verify Results**
- ✅ User receives 95 TokenB (minus 0.3% fee)
- ✅ Fee recipient receives trading fee
- ✅ Order status = FILLED
- ✅ Events emitted correctly

---

### **Scenario 2: Partial Fill Workflow**

```javascript
// Step 1: Create 100 TokenA order
await limitOrder.createOrder(/*... 100 TokenA order ...*/);

// Step 2: Partial fill 60 TokenA
await limitOrder.executeOrder(orderId, ethers.parseEther("60"), ethers.parseEther("57"));

// Step 3: Check remaining amount
const order = await limitOrder.getOrder(orderId);
expect(order.filledAmount).to.equal(ethers.parseEther("60"));

// Step 4: Fill remaining 40 TokenA  
await limitOrder.executeOrder(orderId, ethers.parseEther("40"), ethers.parseEther("38"));

// Step 5: Verify fully filled
const finalOrder = await limitOrder.getOrder(orderId);
expect(finalOrder.filledAmount).to.equal(ethers.parseEther("100"));
```

---

### **Scenario 3: Security & Edge Cases**

#### **Front-running Protection Test**
```javascript
// Attempt to reuse signature (should fail)
await expect(
  limitOrder.createOrder(/* same signature */)
).to.be.revertedWith("Order already exists");

// Nonce increment test
const nonceBefore = await limitOrder.getUserNonce(user.address);
await limitOrder.createOrder(/* valid order */);
const nonceAfter = await limitOrder.getUserNonce(user.address);
expect(nonceAfter).to.equal(nonceBefore + 1);
```

#### **Price Protection Test**
```javascript
// Try to execute below limit price
await expect(
  limitOrder.executeOrder(orderId, amountIn, belowLimitAmount)
).to.be.revertedWith("Price below limit");
```

#### **Deadline Protection Test**
```javascript
// Advance time past deadline
await time.increase(3700); // 1 hour + 100 seconds

await expect(
  limitOrder.executeOrder(orderId, amountIn, validAmount)
).to.be.revertedWith("Order expired");
```

---

## 📊 **Gas Analysis & Optimization**

### **Expected Gas Costs:**
- **createOrder()**: ~150,000 - 200,000 gas
- **executeOrder()**: ~100,000 - 150,000 gas  
- **cancelOrder()**: ~50,000 - 80,000 gas

### **Gas Testing Command:**
```bash
REPORT_GAS=true npx hardhat test
```

### **Gas Spike Protection:**
```javascript
// Simulate high gas price scenario
await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
  ethers.parseUnits("100", "gwei").toString()
]);

// Test still executes successfully
const tx = await limitOrder.executeOrder(orderId, amountIn, amountOut);
const receipt = await tx.wait();
console.log(`Gas used in high-gas scenario: ${receipt.gasUsed}`);
```

---

## 🔍 **Block Explorer Verification**

### **After Deploy - Verify Contract:**
```bash
# Sepolia
npx hardhat verify --network sepolia 0xYourContractAddress

# Polygon Amoy  
npx hardhat verify --network polygonAmoy 0xYourContractAddress

# BSC Testnet
npx hardhat verify --network bscTestnet 0xYourContractAddress
```

### **Explorer Links:**
- **Sepolia**: https://sepolia.etherscan.io/address/CONTRACT_ADDRESS
- **Polygon Amoy**: https://amoy.polygonscan.com/address/CONTRACT_ADDRESS  
- **BSC Testnet**: https://testnet.bscscan.com/address/CONTRACT_ADDRESS

---

## 🚨 **Error Scenarios & Debugging**

### **Common Errors & Solutions:**

| **Error** | **Cause** | **Solution** |
|-----------|-----------|--------------|
| `Invalid signature` | Wrong signer or malformed EIP-712 | Check domain, types, and signer |
| `Order expired` | Deadline passed | Create new order with future deadline |
| `Price below limit` | amountOut too low | Increase amountOut to meet limit |
| `Order already exists` | Duplicate order hash | Use new nonce or change parameters |
| `Not order owner` | Wrong user cancelling | Ensure correct user calls cancel |

### **Debug Commands:**
```bash
# Check order details
npx hardhat console --network sepolia
> const limitOrder = await ethers.getContractAt("LimitOrder", "CONTRACT_ADDRESS");
> await limitOrder.getOrder(1);

# Check user nonce
> await limitOrder.getUserNonce("USER_ADDRESS");

# Check contract status
> await limitOrder.paused();
> await limitOrder.feeRate();
```

---

## 🎯 **Production Checklist**

### **Pre-Launch Verification:**
- [ ] All tests pass (100% coverage)
- [ ] Gas costs within acceptable limits
- [ ] Contract verified on all target networks
- [ ] Admin functions tested (pause/unpause)
- [ ] Fee configuration validated
- [ ] Emergency procedures documented

### **Launch Monitoring:**
- [ ] Monitor first transactions closely
- [ ] Check gas usage in production
- [ ] Verify events emission
- [ ] Test frontend integration
- [ ] Monitor for unusual patterns

### **Post-Launch:**
- [ ] Set up alerts for large orders
- [ ] Monitor fee collection
- [ ] Regular security reviews
- [ ] Community feedback integration

---

## 🔐 **Security Best Practices**

### **Smart Contract Level:**
- ✅ ReentrancyGuard prevents re-entrancy attacks
- ✅ Pausable allows emergency stops
- ✅ Ownable restricts admin functions
- ✅ EIP-712 prevents signature replay
- ✅ Nonce system prevents front-running

### **Integration Level:**
- ⚠️ Always validate user inputs
- ⚠️ Use secure randomization for nonces
- ⚠️ Implement rate limiting
- ⚠️ Monitor for MEV attacks
- ⚠️ Regular security audits

---

## 📈 **Performance Metrics**

### **Target Benchmarks:**
- **Order Creation**: < 200k gas
- **Order Execution**: < 150k gas
- **Transaction Confirmation**: < 30 seconds
- **Failed Transaction Rate**: < 1%
- **Front-end Response Time**: < 2 seconds

### **Monitoring Commands:**
```bash
# Monitor gas usage
npx hardhat test --grep "gas" --reporter spec

# Load testing (simulate multiple concurrent orders)
npx hardhat test test/LimitOrder.load.test.js

# Performance profiling
REPORT_GAS=true npx hardhat test --reporter json > gas-report.json
```

---

**Happy Testing! 🚀 Contract sẵn sàng cho production deployment và E2E testing trên các testnets.**