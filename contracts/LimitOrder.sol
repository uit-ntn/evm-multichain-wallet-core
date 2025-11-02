// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LimitOrder
 * @notice Smart contract for managing limit orders
 */
contract LimitOrder {
    struct Order {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 limitPrice;
        uint256 deadline;
        bool isFilled;
        bool isCancelled;
    }
    
    // Order ID counter
    uint256 public orderCount;
    
    // Mapping from order ID to Order
    mapping(uint256 => Order) public orders;
    
    // Mapping from user to their order IDs
    mapping(address => uint256[]) public userOrders;
    
    // Events
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
    
    /**
     * @notice Create a new limit order
     */
    function createOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 limitPrice,
        uint256 deadline
    ) external returns (uint256) {
        require(tokenIn != address(0), "Invalid tokenIn");
        require(tokenOut != address(0), "Invalid tokenOut");
        require(amountIn > 0, "Amount must be > 0");
        require(deadline > block.timestamp, "Invalid deadline");
        
        orderCount++;
        uint256 orderId = orderCount;
        
        orders[orderId] = Order({
            user: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            limitPrice: limitPrice,
            deadline: deadline,
            isFilled: false,
            isCancelled: false
        });
        
        userOrders[msg.sender].push(orderId);
        
        emit OrderCreated(
            orderId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            limitPrice
        );
        
        return orderId;
    }
    
    /**
     * @notice Cancel an order
     */
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.user == msg.sender, "Not order owner");
        require(!order.isFilled, "Order already filled");
        require(!order.isCancelled, "Order already cancelled");
        
        order.isCancelled = true;
        
        emit OrderCancelled(orderId, msg.sender);
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
}

