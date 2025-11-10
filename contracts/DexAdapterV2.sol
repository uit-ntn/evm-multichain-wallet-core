// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Uniswap V2 Router interface (chuẩn Pancake/Sushi/UniV2)
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);

    function getAmountsIn(uint amountOut, address[] calldata path)
        external view returns (uint[] memory amounts);

    function WETH() external pure returns (address);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/**
 * @title DexAdapterV2
 * @notice Adapter cho các DEX kiểu Uniswap V2 (PancakeSwap, SushiSwap, v.v.)
 * @dev Hỗ trợ routing linh hoạt (path tuỳ chỉnh), tính price impact, và token fee-on-transfer.
 */
contract DexAdapterV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Cấu hình router/factory theo chain
    struct DexConfig {
        address router;
        address factory;
        uint256 feeBps; // phí chuẩn DEX (nếu cần hiển thị/ghi nhận) — không dùng để trừ thêm
    }

    // Lưu cấu hình theo chainId
    mapping(uint256 => DexConfig) public chainConfigs;

    // Giới hạn slippage/price impact (bps)
    uint256 public constant MAX_SLIPPAGE_BPS      = 1000; // 10% (tham khảo, không cưỡng chế tại đây)
    uint256 public constant MAX_PRICE_IMPACT_BPS  = 500;  // 5%

    // Sự kiện
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed to
    );

    event PriceImpactCalculated(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 priceImpactBps
    );

    event ChainConfigUpdated(
        uint256 indexed chainId,
        address router,
        address factory,
        uint256 feeBps
    );

    constructor() {}

    // ==========================
    //        SWAP EXACT IN
    // ==========================
    /**
     * @notice Swap kiểu exact-in
     * @param tokenIn token vào
     * @param tokenOut token ra
     * @param amountIn lượng tokenIn mà caller cung cấp
     * @param amountOutMin tối thiểu tokenOut nhận
     * @param to người nhận đầu ra
     * @param deadline hạn giao dịch (timestamp)
     * @param extraData bytes-encoded path (address[]) hoặc rỗng để path trực tiếp
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
        require(tokenIn != address(0) && tokenOut != address(0), "Zero address");

        DexConfig memory config = chainConfigs[block.chainid];
        require(config.router != address(0), "Router not configured");
        require(config.factory != address(0), "Factory not configured");

        // Xác định path
        address[] memory path = _decodePath(tokenIn, tokenOut, extraData);

        // Tính price impact sơ bộ theo reserves
        uint256 priceImpactBps = _calculatePriceImpact(tokenIn, tokenOut, amountIn, config);
        require(priceImpactBps <= MAX_PRICE_IMPACT_BPS, "Price impact too high");

        // Nhận tokenIn (hỗ trợ fee-on-transfer): đo trước/sau
        uint256 actualAmountIn;
        {
            uint256 balBefore = IERC20(tokenIn).balanceOf(address(this));
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
            actualAmountIn = IERC20(tokenIn).balanceOf(address(this)) - balBefore;
            require(actualAmountIn > 0, "No tokens received");
        }

        // Approve đúng số cần dùng (tránh token kén approve)
        _approveExact(IERC20(tokenIn), config.router, actualAmountIn);

        // Thực hiện swap
        {
            IUniswapV2Router router = IUniswapV2Router(config.router);
            uint[] memory amounts = router.swapExactTokensForTokens(
                actualAmountIn,
                amountOutMin,
                path,
                to,
                deadline
            );
            amountOut = amounts[amounts.length - 1];
        }

        // (Tuỳ chính sách) reset allowance về 0 để an toàn
        _resetAllowance(IERC20(tokenIn), config.router);

        emit SwapExecuted(tokenIn, tokenOut, actualAmountIn, amountOut, to);
        emit PriceImpactCalculated(tokenIn, tokenOut, actualAmountIn, priceImpactBps);
    }

    // ==========================
    //       SWAP EXACT OUT
    // ==========================
    /**
     * @notice Swap kiểu exact-out
     * @param tokenIn token vào
     * @param tokenOut token ra
     * @param amountOut lượng tokenOut cố định muốn nhận
     * @param amountInMax tối đa tokenIn cho phép dùng
     * @param to người nhận đầu ra
     * @param deadline hạn giao dịch
     * @param extraData bytes-encoded path (address[]) hoặc rỗng để path trực tiếp
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
        require(tokenIn != address(0) && tokenOut != address(0), "Zero address");

        DexConfig memory config = chainConfigs[block.chainid];
        require(config.router != address(0), "Router not configured");
        require(config.factory != address(0), "Factory not configured");

        address[] memory path = _decodePath(tokenIn, tokenOut, extraData);

        IUniswapV2Router router = IUniswapV2Router(config.router);
        uint[] memory amountsIn = router.getAmountsIn(amountOut, path);
        uint256 requiredAmountIn = amountsIn[0];
        require(requiredAmountIn <= amountInMax, "Insufficient input amount");

        // Kiểm tra price impact dựa trên requiredAmountIn
        uint256 priceImpactBps = _calculatePriceImpact(tokenIn, tokenOut, requiredAmountIn, config);
        require(priceImpactBps <= MAX_PRICE_IMPACT_BPS, "Price impact too high");

        // Nhận tokenIn từ caller (fee-on-transfer vẫn ổn vì ta sẽ approve theo requiredAmountIn)
        {
            uint256 balBefore = IERC20(tokenIn).balanceOf(address(this));
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), requiredAmountIn);
            uint256 actuallyReceived = IERC20(tokenIn).balanceOf(address(this)) - balBefore;
            require(actuallyReceived >= requiredAmountIn, "Fee-on-transfer too high");
        }

        // Approve đúng số cần
        _approveExact(IERC20(tokenIn), config.router, requiredAmountIn);

        // Swap exact-out
        {
            uint[] memory amounts = router.swapTokensForExactTokens(
                amountOut,
                requiredAmountIn,
                path,
                to,
                deadline
            );
            amountIn = amounts[0];
        }

        // Reset allowance về 0 (an toàn)
        _resetAllowance(IERC20(tokenIn), config.router);

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, to);
        emit PriceImpactCalculated(tokenIn, tokenOut, amountIn, priceImpactBps);
    }

    // ==========================
    //          VIEWS
    // ==========================
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata extraData
    ) external view returns (uint256 amountOut) {
        DexConfig memory config = chainConfigs[block.chainid];
        require(config.router != address(0), "Router not configured");

        address[] memory path = _decodePath(tokenIn, tokenOut, extraData);
        IUniswapV2Router router = IUniswapV2Router(config.router);
        uint[] memory amounts = router.getAmountsOut(amountIn, path);
        amountOut = amounts[amounts.length - 1];
    }

    function getAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        bytes calldata extraData
    ) external view returns (uint256 amountIn) {
        DexConfig memory config = chainConfigs[block.chainid];
        require(config.router != address(0), "Router not configured");

        address[] memory path = _decodePath(tokenIn, tokenOut, extraData);
        IUniswapV2Router router = IUniswapV2Router(config.router);
        uint[] memory amounts = router.getAmountsIn(amountOut, path);
        amountIn = amounts[0];
    }

    function calculatePriceImpact(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 priceImpactBps) {
        DexConfig memory config = chainConfigs[block.chainid];
        return _calculatePriceImpact(tokenIn, tokenOut, amountIn, config);
    }

    // ==========================
    //          ADMIN
    // ==========================
    function setChainConfig(
        uint256 chainId,
        address router,
        address factory,
        uint256 feeBps
    ) external onlyOwner {
        require(router != address(0), "Invalid router");
        require(factory != address(0), "Invalid factory");
        require(feeBps <= 1000, "Fee too high"); // <=10%

        chainConfigs[chainId] = DexConfig({
            router: router,
            factory: factory,
            feeBps: feeBps
        });

        emit ChainConfigUpdated(chainId, router, factory, feeBps);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    // ==========================
    //        INTERNALS
    // ==========================
    /**
     * @dev Ưu tiên dùng path trong extraData (address[]), nếu decode lỗi thì fallback path trực tiếp [tokenIn, tokenOut].
     * Lưu ý: `try this.decodePath(...)` là external call hợp lệ để dùng với try/catch.
     */
    function _decodePath(
        address tokenIn,
        address tokenOut,
        bytes calldata extraData
    ) internal view returns (address[] memory path) {
        if (extraData.length > 0) {
            try this.decodePath(extraData) returns (address[] memory customPath) {
                require(customPath.length >= 2, "Invalid path length");
                require(customPath[0] == tokenIn, "Path start mismatch");
                require(customPath[customPath.length - 1] == tokenOut, "Path end mismatch");
                return customPath;
            } catch {
                // fallthrough -> dùng path trực tiếp
            }
        }
        path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
    }

    /// @notice External decoder để dùng cho try/catch
    function decodePath(bytes calldata data) external pure returns (address[] memory path) {
        path = abi.decode(data, (address[]));
    }

    /**
     * @dev Tính price impact sơ bộ theo tỉ lệ amountIn / reserveIn (bps).
     * - Nếu không có pair hoặc reserveIn=0 → return MAX_PRICE_IMPACT_BPS (bảo thủ).
     */
    function _calculatePriceImpact(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        DexConfig memory config
    ) internal view returns (uint256 priceImpactBps) {
        if (amountIn == 0) return 0;

        IUniswapV2Factory factory = IUniswapV2Factory(config.factory);
        address pair = factory.getPair(tokenIn, tokenOut);
        if (pair == address(0)) {
            return MAX_PRICE_IMPACT_BPS;
        }

        IUniswapV2Pair pairContract = IUniswapV2Pair(pair);
        (uint112 r0, uint112 r1, ) = pairContract.getReserves();
        if (r0 == 0 || r1 == 0) {
            return MAX_PRICE_IMPACT_BPS;
        }

        address token0 = pairContract.token0();
        uint256 reserveIn = (tokenIn == token0) ? uint256(r0) : uint256(r1);
        if (reserveIn == 0) {
            return MAX_PRICE_IMPACT_BPS;
        }

        // priceImpact ≈ amountIn / reserveIn (bps)
        priceImpactBps = (amountIn * 10000) / reserveIn;
        if (priceImpactBps > MAX_PRICE_IMPACT_BPS) {
            priceImpactBps = MAX_PRICE_IMPACT_BPS;
        }
    }

    /**
     * @dev Approve chính xác số cần dùng; nếu allowance hiện tại > 0 thì về 0 trước khi set (để tương thích token kén approve).
     */
    function _approveExact(IERC20 token, address spender, uint256 amount) internal {
        uint256 cur = token.allowance(address(this), spender);
        if (cur > 0) {
            token.safeApprove(spender, 0);
        }
        token.safeApprove(spender, amount);
    }

    /**
     * @dev Reset allowance về 0 (tuỳ chính sách an toàn).
     */
    function _resetAllowance(IERC20 token, address spender) internal {
        uint256 cur = token.allowance(address(this), spender);
        if (cur > 0) {
            token.safeApprove(spender, 0);
        }
    }
}
