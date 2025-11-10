// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SwapRouterProxy
 * @notice Unified proxy for DEX interactions across multiple chains
 * @dev Supports Uniswap V2/V3, PancakeSwap, SushiSwap via adapters
 */
contract SwapRouterProxy is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Supported DEX types
    enum DexType {
        UNISWAP_V2,
        UNISWAP_V3,
        PANCAKESWAP,
        SUSHISWAP
    }

    // Swap parameters structure
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        address to;
        uint256 deadline;
        DexType dexType;
        bytes extraData; // For V3 paths, fees, etc.
    }

    // Exact output swap parameters
    struct SwapExactOutParams {
        address tokenIn;
        address tokenOut;
        uint256 amountOut;
        uint256 amountInMax;
        address to;
        uint256 deadline;
        DexType dexType;
        bytes extraData;
    }

    // Registry of DEX adapters
    mapping(DexType => address) public dexAdapters;
    
    // Supported tokens registry (for security)
    mapping(address => bool) public supportedTokens;
    
    // Fee settings
    uint256 public protocolFee = 25; // 0.25% = 25/10000
    uint256 public constant MAX_PROTOCOL_FEE = 100; // 1% max
    address public feeRecipient;
    
    // Chain-specific WETH/WMATIC addresses
    address public immutable WETH;
    
    // Events
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        DexType dexType,
        uint256 fee
    );
    
    event AdapterCall(
        DexType indexed dexType,
        address indexed adapter,
        bytes data,
        bool success
    );
    
    event AdapterUpdated(DexType indexed dexType, address indexed oldAdapter, address indexed newAdapter);
    event TokenSupportUpdated(address indexed token, bool supported);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address _weth) {
        require(_weth != address(0), "Invalid WETH address");
        WETH = _weth;
        feeRecipient = msg.sender;
    }

    /**
     * @notice Execute exact input swap
     * @param params Swap parameters including tokens, amounts, and DEX type
     * @return amountOut Actual amount of output tokens received
     */
    function swapExactTokensForTokens(
        SwapParams calldata params
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        _validateSwapParams(params.tokenIn, params.tokenOut, params.amountIn, params.deadline);
        
        address adapter = dexAdapters[params.dexType];
        require(adapter != address(0), "Adapter not found");

        // Transfer tokens from user to this contract
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        
        // Calculate protocol fee
        uint256 fee = (params.amountIn * protocolFee) / 10000;
        uint256 amountAfterFee = params.amountIn - fee;
        
        // Transfer fee to recipient
        if (fee > 0) {
            IERC20(params.tokenIn).safeTransfer(feeRecipient, fee);
        }
        
        // Approve adapter to spend tokens
        IERC20(params.tokenIn).safeIncreaseAllowance(adapter, amountAfterFee);
        
        // Prepare adapter call data
        bytes memory adapterData = abi.encodeWithSignature(
            "swapExactTokensForTokens(address,address,uint256,uint256,address,uint256,bytes)",
            params.tokenIn,
            params.tokenOut,
            amountAfterFee,
            params.amountOutMin,
            params.to,
            params.deadline,
            params.extraData
        );
        
        // Execute swap through adapter
        (bool success, bytes memory returnData) = adapter.call(adapterData);
        require(success, "Adapter call failed");
        
        amountOut = abi.decode(returnData, (uint256));
        
        // Reset adapter allowance if possible
        uint256 remainingAllowance = IERC20(params.tokenIn).allowance(address(this), adapter);
        if (remainingAllowance > 0) {
            // Some tokens revert on decreaseAllowance, so we use approve instead
            IERC20(params.tokenIn).approve(adapter, 0);
        }
        
        emit SwapExecuted(
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.dexType,
            fee
        );
        
        emit AdapterCall(params.dexType, adapter, adapterData, success);
    }

    /**
     * @notice Execute exact output swap
     * @param params Exact output swap parameters
     * @return amountIn Actual amount of input tokens used
     */
    function swapTokensForExactTokens(
        SwapExactOutParams calldata params
    ) external nonReentrant whenNotPaused returns (uint256 amountIn) {
        _validateSwapParams(params.tokenIn, params.tokenOut, params.amountInMax, params.deadline);
        
        address adapter = dexAdapters[params.dexType];
        require(adapter != address(0), "Adapter not found");

        // Transfer max input tokens from user
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountInMax);
        
        // Approve adapter to spend tokens
        IERC20(params.tokenIn).safeIncreaseAllowance(adapter, params.amountInMax);
        
        // Prepare adapter call data
        bytes memory adapterData = abi.encodeWithSignature(
            "swapTokensForExactTokens(address,address,uint256,uint256,address,uint256,bytes)",
            params.tokenIn,
            params.tokenOut,
            params.amountOut,
            params.amountInMax,
            params.to,
            params.deadline,
            params.extraData
        );
        
        // Execute swap through adapter
        (bool success, bytes memory returnData) = adapter.call(adapterData);
        require(success, "Adapter call failed");
        
        amountIn = abi.decode(returnData, (uint256));
        
        // Calculate and take protocol fee from actual amount used
        uint256 fee = (amountIn * protocolFee) / 10000;
        
        // Refund unused tokens (minus fee)
        uint256 refundAmount = params.amountInMax - amountIn - fee;
        if (refundAmount > 0) {
            IERC20(params.tokenIn).safeTransfer(msg.sender, refundAmount);
        }
        
        // Transfer fee to recipient
        if (fee > 0) {
            IERC20(params.tokenIn).safeTransfer(feeRecipient, fee);
        }
        
        // Reset adapter allowance if possible
        uint256 remainingAllowance = IERC20(params.tokenIn).allowance(address(this), adapter);
        if (remainingAllowance > 0) {
            // Some tokens revert on decreaseAllowance, so we use approve instead
            IERC20(params.tokenIn).approve(adapter, 0);
        }
        
        emit SwapExecuted(
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            amountIn,
            params.amountOut,
            params.dexType,
            fee
        );
        
        emit AdapterCall(params.dexType, adapter, adapterData, success);
    }

    /**
     * @notice Get quote for exact input swap
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input amount
     * @param dexType DEX type to use for quote
     * @param extraData Additional data for complex routing
     * @return amountOut Expected output amount
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        DexType dexType,
        bytes calldata extraData
    ) external view returns (uint256 amountOut) {
        address adapter = dexAdapters[dexType];
        require(adapter != address(0), "Adapter not found");
        
        bytes memory quoteData = abi.encodeWithSignature(
            "getAmountOut(address,address,uint256,bytes)",
            tokenIn,
            tokenOut,
            amountIn,
            extraData
        );
        
        (bool success, bytes memory returnData) = adapter.staticcall(quoteData);
        require(success, "Quote call failed");
        
        amountOut = abi.decode(returnData, (uint256));
    }

    /**
     * @notice Get quote for exact output swap
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountOut Output amount
     * @param dexType DEX type to use for quote
     * @param extraData Additional data for complex routing
     * @return amountIn Expected input amount
     */
    function getAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        DexType dexType,
        bytes calldata extraData
    ) external view returns (uint256 amountIn) {
        address adapter = dexAdapters[dexType];
        require(adapter != address(0), "Adapter not found");
        
        bytes memory quoteData = abi.encodeWithSignature(
            "getAmountIn(address,address,uint256,bytes)",
            tokenIn,
            tokenOut,
            amountOut,
            extraData
        );
        
        (bool success, bytes memory returnData) = adapter.staticcall(quoteData);
        require(success, "Quote call failed");
        
        amountIn = abi.decode(returnData, (uint256));
    }

    // ================= ADMIN FUNCTIONS =================

    /**
     * @notice Set DEX adapter for a specific DEX type
     * @param dexType DEX type
     * @param adapter Adapter contract address
     */
    function setDexAdapter(DexType dexType, address adapter) external onlyOwner {
        require(adapter != address(0), "Invalid adapter address");
        
        address oldAdapter = dexAdapters[dexType];
        dexAdapters[dexType] = adapter;
        
        emit AdapterUpdated(dexType, oldAdapter, adapter);
    }

    /**
     * @notice Update token support status
     * @param token Token address
     * @param supported Whether token is supported
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    /**
     * @notice Update protocol fee
     * @param newFee New fee rate (max 1%)
     */
    function setProtocolFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_PROTOCOL_FEE, "Fee too high");
        
        uint256 oldFee = protocolFee;
        protocolFee = newFee;
        
        emit FeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update fee recipient
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw stuck tokens
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    // ================= INTERNAL FUNCTIONS =================

    /**
     * @notice Validate swap parameters
     */
    function _validateSwapParams(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 deadline
    ) internal view {
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid token address");
        require(tokenIn != tokenOut, "Same token");
        require(amount > 0, "Amount must be > 0");
        require(deadline >= block.timestamp, "Deadline expired");
        require(supportedTokens[tokenIn] && supportedTokens[tokenOut], "Token not supported");
    }

    /**
     * @notice Check if contract can receive ETH (for WETH unwrapping)
     */
    receive() external payable {
        // Allow receiving ETH for WETH operations
    }
}