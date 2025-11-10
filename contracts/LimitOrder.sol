// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title LimitOrder
 * @notice Advanced smart contract for managing limit orders with EIP-712 signatures
 * @dev Supports partial fills, front-running protection, and secure execution
 */
contract LimitOrder is ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;
    // EIP-712 Domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    
    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "Order(address user,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 limitPrice,uint256 deadline,uint256 nonce)"
    );
    
    bytes32 public DOMAIN_SEPARATOR;
    
    struct Order {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 limitPrice;
        uint256 deadline;
        uint256 nonce;
        uint256 filledAmount;
        bool isCancelled;
        bytes32 orderHash;
    }
    
    // Order ID counter
    uint256 public orderCount;
    
    // Mapping from order ID to Order
    mapping(uint256 => Order) public orders;
    
    // Mapping from user to their order IDs
    mapping(address => uint256[]) public userOrders;
    
    // Mapping from user to nonce (prevent replay attacks)
    mapping(address => uint256) public userNonces;
    
    // Mapping from order hash to order ID (for signature-based orders)
    mapping(bytes32 => uint256) public hashToOrderId;
    
    // Remove duplicate - use orders[orderId].filledAmount instead
    
    // Fee settings
    uint256 public feeRate = 30; // 0.3% = 30/10000
    uint256 public constant MAX_FEE_RATE = 100; // 1% max
    address public feeRecipient;
    
    // Events
    event OrderCreated(
        uint256 indexed orderId,
        bytes32 indexed orderHash,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 limitPrice,
        uint256 deadline,
        uint256 nonce
    );
    
    event OrderCancelled(
        uint256 indexed orderId,
        bytes32 indexed orderHash,
        address indexed user
    );
    
    event OrderFilled(
        uint256 indexed orderId,
        bytes32 indexed orderHash,
        address indexed user,
        address executor,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        bool isFullyFilled
    );
    
    event FeeUpdated(uint256 newFeeRate);
    event FeeRecipientUpdated(address newFeeRecipient);

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("LimitOrder")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
        feeRecipient = msg.sender;
    }
    
    /**
     * @notice Create a new limit order with signature verification (relayer-compatible)
     * @param user Order owner (signer)
     * @param tokenIn Input token address
     * @param tokenOut Output token address  
     * @param amountIn Amount of input token
     * @param minAmountOut Minimum amount of output token (slippage protection)
     * @param limitPrice Limit price for the order (1e18 scale: tokenOut per tokenIn)
     * @param deadline Order expiration timestamp
     * @param nonce User nonce (prevent replay)
     * @param signature EIP-712 signature from user
     */
    function createOrder(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 limitPrice,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(user != address(0), "Invalid user");
        require(tokenIn != address(0), "Invalid tokenIn");
        require(tokenOut != address(0), "Invalid tokenOut");
        require(tokenIn != tokenOut, "Same tokens");
        require(amountIn > 0, "Amount must be > 0");
        require(minAmountOut > 0, "MinAmountOut must be > 0");
        require(deadline > block.timestamp, "Invalid deadline");
        require(nonce == userNonces[user], "Invalid nonce");
        
        // Create order hash for EIP-712
        bytes32 orderHash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        ORDER_TYPEHASH,
                        user,
                        tokenIn,
                        tokenOut,
                        amountIn,
                        minAmountOut,
                        limitPrice,
                        deadline,
                        nonce
                    )
                )
            )
        );
        
        // Verify signature (user signs, anyone can submit)
        address signer = orderHash.recover(signature);
        require(signer == user, "Invalid signature");
        require(hashToOrderId[orderHash] == 0, "Order already exists");
        
        // Increment nonce AFTER verification
        userNonces[user]++;
        
        // Transfer tokens from user to contract
        IERC20(tokenIn).safeTransferFrom(user, address(this), amountIn);
        
        orderCount++;
        uint256 orderId = orderCount;
        
        orders[orderId] = Order({
            user: user,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            limitPrice: limitPrice,
            deadline: deadline,
            nonce: nonce,
            filledAmount: 0,
            isCancelled: false,
            orderHash: orderHash
        });
        
        userOrders[user].push(orderId);
        hashToOrderId[orderHash] = orderId;
        
        emit OrderCreated(
            orderId,
            orderHash,
            user,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            limitPrice,
            deadline,
            nonce
        );
        
        return orderId;
    }
    
    /**
     * @notice Cancel an order and refund remaining tokens
     * @param orderId Order ID to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.user == msg.sender, "Not order owner");
        require(!order.isCancelled, "Order already cancelled");
        require(order.filledAmount < order.amountIn, "Order fully filled");
        
        uint256 remainingAmount = order.amountIn - order.filledAmount;
        order.isCancelled = true;
        
        // Refund remaining tokens using SafeERC20
        if (remainingAmount > 0) {
            IERC20(order.tokenIn).safeTransfer(order.user, remainingAmount);
        }
        
        emit OrderCancelled(orderId, order.orderHash, msg.sender);
    }

    /**
     * @notice Execute/fill an order (partial or full) - FIXED TOKEN SETTLEMENT
     * @param orderId Order ID to execute
     * @param amountToFill Amount of input token to fill
     * @param amountOut Amount of output token to provide
     */
    function executeOrder(
        uint256 orderId,
        uint256 amountToFill,
        uint256 amountOut
    ) external nonReentrant whenNotPaused {
        Order storage order = orders[orderId];
        
        require(order.user != address(0), "Order not found");
        require(!order.isCancelled, "Order cancelled");
        require(block.timestamp <= order.deadline, "Order expired");
        require(order.filledAmount < order.amountIn, "Order fully filled");
        require(amountToFill > 0, "Amount must be > 0");
        
        uint256 remainingAmount = order.amountIn - order.filledAmount;
        require(amountToFill <= remainingAmount, "Exceeds remaining amount");
        
        // Price check: amountOut/amountToFill >= limitPrice (both normalized to 1e18)
        // limitPrice = tokenOut per tokenIn (1e18 scale)
        require(
            amountOut * 1e18 >= amountToFill * order.limitPrice,
            "Price below limit"
        );
        
        // Slippage protection for partial fills
        if (amountToFill < remainingAmount) {
            uint256 expectedMinOut = (amountToFill * order.minAmountOut) / order.amountIn;
            require(amountOut >= expectedMinOut, "Insufficient output for partial fill");
        } else {
            require(amountOut >= order.minAmountOut, "Insufficient output");
        }
        
        // Calculate fee on output token
        uint256 fee = (amountOut * feeRate) / 10000;
        uint256 userReceives = amountOut - fee;
        
        // Update filled amount
        order.filledAmount += amountToFill;
        bool isFullyFilled = order.filledAmount >= order.amountIn;
        
        // ⭐ CRITICAL FIX: Proper token settlement
        // 1. Transfer tokenOut from executor to user (minus fee)
        IERC20(order.tokenOut).safeTransferFrom(msg.sender, order.user, userReceives);
        
        // 2. Transfer fee to fee recipient
        if (fee > 0) {
            IERC20(order.tokenOut).safeTransferFrom(msg.sender, feeRecipient, fee);
        }
        
        // 3. Transfer tokenIn from contract to executor (this was missing!)
        IERC20(order.tokenIn).safeTransfer(msg.sender, amountToFill);
        
        emit OrderFilled(
            orderId,
            order.orderHash,
            order.user,
            msg.sender,
            amountToFill,
            amountOut,
            fee,
            isFullyFilled
        );
    }
    
    /**
     * @notice Get order details
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    /**
     * @notice Get user's orders
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }
    
    /**
     * @notice Get order by hash
     */
    function getOrderByHash(bytes32 orderHash) external view returns (Order memory) {
        uint256 orderId = hashToOrderId[orderHash];
        require(orderId != 0, "Order not found");
        return orders[orderId];
    }
    
    /**
     * @notice Check if order can be executed (fixed to match executeOrder logic)
     * @param orderId Order ID to check
     * @param amountToFill Amount of input token to fill
     * @param amountOut Amount of output token to provide
     */
    function canExecuteOrder(uint256 orderId, uint256 amountToFill, uint256 amountOut) external view returns (bool) {
        Order memory order = orders[orderId];
        
        if (order.user == address(0) || order.isCancelled) return false;
        if (block.timestamp > order.deadline) return false;
        if (order.filledAmount >= order.amountIn) return false;
        if (amountToFill == 0) return false;
        
        uint256 remainingAmount = order.amountIn - order.filledAmount;
        if (amountToFill > remainingAmount) return false;
        
        // Price check: same as executeOrder
        if (amountOut * 1e18 < amountToFill * order.limitPrice) return false;
        
        // Slippage check: same as executeOrder
        if (amountToFill < remainingAmount) {
            uint256 expectedMinOut = (amountToFill * order.minAmountOut) / order.amountIn;
            return amountOut >= expectedMinOut;
        } else {
            return amountOut >= order.minAmountOut;
        }
    }
    
    /**
     * @notice Get user's current nonce
     */
    function getUserNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }
    
    /**
     * @notice Admin: Set fee rate (max 1%)
     */
    function setFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= MAX_FEE_RATE, "Fee too high");
        feeRate = newFeeRate;
        emit FeeUpdated(newFeeRate);
    }
    
    /**
     * @notice Admin: Set fee recipient
     */
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid address");
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(newFeeRecipient);
    }
    
    /**
     * @notice Admin: Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Admin: Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency: Withdraw stuck tokens (admin only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    /**
     * @notice Get remaining fillable amount for an order
     */
    function getRemainingAmount(uint256 orderId) external view returns (uint256) {
        Order memory order = orders[orderId];
        if (order.filledAmount >= order.amountIn) return 0;
        return order.amountIn - order.filledAmount;
    }
    
    /**
     * @notice Calculate expected output for a given input amount (for UI/estimation)
     * @param orderId Order ID
     * @param amountToFill Amount of input token
     * @return Expected minimum output amount
     */
    function calculateExpectedOutput(uint256 orderId, uint256 amountToFill) external view returns (uint256) {
        Order memory order = orders[orderId];
        require(order.user != address(0), "Order not found");
        
        if (amountToFill >= order.amountIn) {
            return order.minAmountOut;
        } else {
            return (amountToFill * order.minAmountOut) / order.amountIn;
        }
    }
}

