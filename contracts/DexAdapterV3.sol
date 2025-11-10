// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Uniswap V3 Router interface
interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
    function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn);
    function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn);
}

// Uniswap V3 Quoter interface
interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);

    function quoteExactInput(bytes memory path, uint256 amountIn)
        external returns (uint256 amountOut);

    function quoteExactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountOut,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountIn);

    function quoteExactOutput(bytes memory path, uint256 amountOut)
        external returns (uint256 amountIn);
}

// Uniswap V3 Pool interface
interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

// Uniswap V3 Factory interface
interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

/**
 * @title DexAdapterV3
 * @notice Adapter for Uniswap V3 style DEXs with concentrated liquidity
 * @dev Supports multi-hop routing, fee tiers, and advanced price calculations
 */
contract DexAdapterV3 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Configuration for V3 DEX
    struct DexV3Config {
        address router;
        address quoter;
        address factory;
        uint24[] supportedFees; // Fee tiers (500, 3000, 10000)
    }

    // V3-specific swap parameters
    struct SwapV3Params {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 amountIn;
        uint256 amountOutMin;
        address recipient;
        uint256 deadline;
        uint160 sqrtPriceLimitX96;
        bytes path; // For multi-hop swaps
    }

    // Chain configurations
    mapping(uint256 => DexV3Config) public chainConfigs;
    
    // Default fee tiers
    uint24 public constant LOW_FEE = 500;     // 0.05%
    uint24 public constant MEDIUM_FEE = 3000; // 0.3%
    uint24 public constant HIGH_FEE = 10000;  // 1%
    
    // Maximum price impact allowed (in basis points)
    uint256 public constant MAX_PRICE_IMPACT_BPS = 500; // 5%
    
    // Events
    event SwapV3Executed(
        address indexed tokenIn,
        address indexed tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOut,
        address indexed to
    );
    
    event PriceImpactCalculated(
        address indexed tokenIn,
        address indexed tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 priceImpactBps
    );

    constructor() {}

    /**
     * @notice Execute exact input swap on V3
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum amount of output tokens
     * @param to Recipient address
     * @param deadline Transaction deadline
     * @param extraData V3-specific data (fee tier, path, etc.)
     * @return amountOut Actual amount of output tokens received
     */
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,  
        address to,
        uint256 deadline,
        bytes calldata extraData
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be > 0");
        require(deadline >= block.timestamp, "Deadline expired");
        
        DexV3Config memory config = chainConfigs[block.chainid];
        require(config.router != address(0), "Router not configured");
        
        SwapV3Params memory params = _decodeV3Params(tokenIn, tokenOut, amountIn, amountOutMin, to, deadline, extraData);
        
        // Check price impact
        uint256 priceImpactBps = _calculateV3PriceImpact(params, config);
        require(priceImpactBps <= MAX_PRICE_IMPACT_BPS, "Price impact too high");
        
        // Transfer tokens from caller
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Approve router
        IERC20(tokenIn).safeIncreaseAllowance(config.router, amountIn);
        
        IUniswapV3Router router = IUniswapV3Router(config.router);
        
        if (params.path.length > 0) {
            // Multi-hop swap
            IUniswapV3Router.ExactInputParams memory exactInputParams = IUniswapV3Router.ExactInputParams({
                path: params.path,
                recipient: to,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin
            });
            
            amountOut = router.exactInput(exactInputParams);
        } else {
            // Single hop swap
            IUniswapV3Router.ExactInputSingleParams memory exactInputSingleParams = IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: params.fee,
                recipient: to,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            });
            
            amountOut = router.exactInputSingle(exactInputSingleParams);
        }
        
        // Reset allowance
        uint256 currentAllowance = IERC20(tokenIn).allowance(address(this), config.router);
        if (currentAllowance > 0) {
            IERC20(tokenIn).safeDecreaseAllowance(config.router, currentAllowance);
        }
        
        emit SwapV3Executed(tokenIn, tokenOut, params.fee, amountIn, amountOut, to);
        emit PriceImpactCalculated(tokenIn, tokenOut, params.fee, amountIn, priceImpactBps);
    }

    /**
     * @notice Execute exact output swap on V3
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountOut Exact amount of output tokens
     * @param amountInMax Maximum amount of input tokens
     * @param to Recipient address
     * @param deadline Transaction deadline
     * @param extraData V3-specific data (fee tier, path, etc.)
     * @return amountIn Actual amount of input tokens used
     */
    function swapTokensForExactTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMax,
        address to,
        uint256 deadline,
        bytes calldata extraData
    ) external nonReentrant returns (uint256 amountIn) {
        require(amountOut > 0, "Amount must be > 0");
        require(deadline >= block.timestamp, "Deadline expired");
        
        DexV3Config memory config = chainConfigs[block.chainid];
        require(config.router != address(0), "Router not configured");
        
        SwapV3Params memory params = _decodeV3Params(tokenIn, tokenOut, 0, 0, to, deadline, extraData);
        
        // Transfer tokens from caller
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountInMax);
        
        // Approve router
        IERC20(tokenIn).safeIncreaseAllowance(config.router, amountInMax);
        
        IUniswapV3Router router = IUniswapV3Router(config.router);
        
        if (params.path.length > 0) {
            // Multi-hop swap (reverse path for exact output)
            IUniswapV3Router.ExactOutputParams memory exactOutputParams = IUniswapV3Router.ExactOutputParams({
                path: params.path,
                recipient: to,
                deadline: deadline,
                amountOut: amountOut,
                amountInMaximum: amountInMax
            });
            
            amountIn = router.exactOutput(exactOutputParams);
        } else {
            // Single hop swap
            IUniswapV3Router.ExactOutputSingleParams memory exactOutputSingleParams = IUniswapV3Router.ExactOutputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: params.fee,
                recipient: to,
                deadline: deadline,
                amountOut: amountOut,
                amountInMaximum: amountInMax,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            });
            
            amountIn = router.exactOutputSingle(exactOutputSingleParams);
        }
        
        // Refund unused tokens
        uint256 refundAmount = amountInMax - amountIn;
        if (refundAmount > 0) {
            IERC20(tokenIn).safeTransfer(msg.sender, refundAmount);
        }
        
        // Reset allowance
        uint256 currentAllowance = IERC20(tokenIn).allowance(address(this), config.router);
        if (currentAllowance > 0) {
            IERC20(tokenIn).safeDecreaseAllowance(config.router, currentAllowance);
        }
        
        emit SwapV3Executed(tokenIn, tokenOut, params.fee, amountIn, amountOut, to);
    }

    /**
     * @notice Get amount out for exact input using quoter
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input amount
     * @param extraData V3-specific data (fee tier, path, etc.)
     * @return amountOut Expected output amount
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata extraData
    ) external returns (uint256 amountOut) {
        DexV3Config memory config = chainConfigs[block.chainid];
        require(config.quoter != address(0), "Quoter not configured");
        
        SwapV3Params memory params = _decodeV3Params(tokenIn, tokenOut, amountIn, 0, address(0), 0, extraData);
        
        IUniswapV3Quoter quoter = IUniswapV3Quoter(config.quoter);
        
        if (params.path.length > 0) {
            // Multi-hop quote
            amountOut = quoter.quoteExactInput(params.path, amountIn);
        } else {
            // Single hop quote
            amountOut = quoter.quoteExactInputSingle(
                tokenIn,
                tokenOut,
                params.fee,
                amountIn,
                params.sqrtPriceLimitX96
            );
        }
    }

    /**
     * @notice Get amount in for exact output using quoter
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountOut Output amount
     * @param extraData V3-specific data (fee tier, path, etc.)
     * @return amountIn Expected input amount
     */
    function getAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        bytes calldata extraData
    ) external returns (uint256 amountIn) {
        DexV3Config memory config = chainConfigs[block.chainid];
        require(config.quoter != address(0), "Quoter not configured");
        
        SwapV3Params memory params = _decodeV3Params(tokenIn, tokenOut, 0, 0, address(0), 0, extraData);
        
        IUniswapV3Quoter quoter = IUniswapV3Quoter(config.quoter);
        
        if (params.path.length > 0) {
            // Multi-hop quote (reverse path)
            amountIn = quoter.quoteExactOutput(params.path, amountOut);
        } else {
            // Single hop quote
            amountIn = quoter.quoteExactOutputSingle(
                tokenIn,
                tokenOut,
                params.fee,
                amountOut,
                params.sqrtPriceLimitX96
            );
        }
    }

    /**
     * @notice Find best fee tier for a token pair
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return bestFee Best fee tier with highest liquidity
     */
    function findBestFee(address tokenIn, address tokenOut) external view returns (uint24 bestFee) {
        DexV3Config memory config = chainConfigs[block.chainid];
        require(config.factory != address(0), "Factory not configured");
        
        IUniswapV3Factory factory = IUniswapV3Factory(config.factory);
        uint128 maxLiquidity = 0;
        bestFee = MEDIUM_FEE; // Default
        
        // Check all supported fee tiers
        for (uint i = 0; i < config.supportedFees.length; i++) {
            uint24 fee = config.supportedFees[i];
            address pool = factory.getPool(tokenIn, tokenOut, fee);
            
            if (pool != address(0)) {
                uint128 liquidity = IUniswapV3Pool(pool).liquidity();
                if (liquidity > maxLiquidity) {
                    maxLiquidity = liquidity;
                    bestFee = fee;
                }
            }
        }
    }

    // ================= ADMIN FUNCTIONS =================

    /**
     * @notice Set DEX V3 configuration for a chain
     * @param chainId Chain ID
     * @param router Router address
     * @param quoter Quoter address
     * @param factory Factory address
     * @param supportedFees Array of supported fee tiers
     */
    function setChainConfig(
        uint256 chainId,
        address router,
        address quoter,
        address factory,
        uint24[] calldata supportedFees
    ) external onlyOwner {
        require(router != address(0), "Invalid router");
        require(quoter != address(0), "Invalid quoter");
        require(factory != address(0), "Invalid factory");
        require(supportedFees.length > 0, "No fee tiers");
        
        chainConfigs[chainId] = DexV3Config({
            router: router,
            quoter: quoter,
            factory: factory,
            supportedFees: supportedFees
        });
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
     * @notice Decode V3-specific parameters from extraData
     */
    function _decodeV3Params(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline,
        bytes calldata extraData
    ) internal view returns (SwapV3Params memory params) {
        params.tokenIn = tokenIn;
        params.tokenOut = tokenOut;
        params.amountIn = amountIn;
        params.amountOutMin = amountOutMin;
        params.recipient = to;
        params.deadline = deadline;
        
        if (extraData.length > 0) {
            // Try to decode complex parameters
            try this.decodeV3ExtraData(extraData) returns (uint24 fee, bytes memory path, uint160 sqrtPriceLimitX96) {
                params.fee = fee;
                params.path = path;
                params.sqrtPriceLimitX96 = sqrtPriceLimitX96;
            } catch {
                // Default to medium fee tier
                params.fee = MEDIUM_FEE;
                params.sqrtPriceLimitX96 = 0;
            }
        } else {
            // Use best available fee tier
            params.fee = this.findBestFee(tokenIn, tokenOut);
            params.sqrtPriceLimitX96 = 0;
        }
    }

    /**
     * @notice External function to decode V3 extra data (used for try-catch)
     */
    function decodeV3ExtraData(bytes calldata data) external pure returns (uint24 fee, bytes memory path, uint160 sqrtPriceLimitX96) {
        (fee, path, sqrtPriceLimitX96) = abi.decode(data, (uint24, bytes, uint160));
    }

    /**
     * @notice Calculate price impact for V3 swap
     */
    function _calculateV3PriceImpact(
        SwapV3Params memory params,
        DexV3Config memory config
    ) internal view returns (uint256 priceImpactBps) {
        IUniswapV3Factory factory = IUniswapV3Factory(config.factory);
        address pool = factory.getPool(params.tokenIn, params.tokenOut, params.fee);
        
        if (pool == address(0)) {
            return MAX_PRICE_IMPACT_BPS; // No pool found
        }
        
        uint128 liquidity = IUniswapV3Pool(pool).liquidity();
        
        // Simplified price impact calculation
        // In reality, this would need more complex math with tick calculations
        priceImpactBps = (params.amountIn * 10000) / uint256(liquidity);
        
        if (priceImpactBps > MAX_PRICE_IMPACT_BPS) {
            priceImpactBps = MAX_PRICE_IMPACT_BPS;
        }
    }
}