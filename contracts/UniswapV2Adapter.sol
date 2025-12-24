// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Uniswap V2 Router interface
interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
}

/**
 * @title UniswapV2Adapter
 * @notice Adapter cho Uniswap V2-style DEX (Uniswap/Pancake/Sushi...)
 * @dev Được SwapRouterProxy gọi qua low-level call():
 *  - swapExactTokensForTokens(tokenIn, tokenOut, amountIn, amountOutMin, to, deadline, extraData)
 *  - swapTokensForExactTokens(tokenIn, tokenOut, amountOut, amountInMax, to, deadline, extraData)
 *  - getAmountOut(tokenIn, tokenOut, amountIn, extraData)
 *  - getAmountIn(tokenIn, tokenOut, amountOut, extraData)
 *
 * extraData:
 *  - nếu có: abi.encode(address[] path)
 *  - nếu không: tự build path [tokenIn, tokenOut] nếu 1 trong 2 là WETH, ngược lại [tokenIn, WETH, tokenOut]
 */
contract UniswapV2Adapter {
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public immutable router;
    address public immutable WETH;

    event SwapExecuted(
        address indexed caller,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOutOrExactOut,
        address to
    );

    constructor(address _router, address _weth) {
        require(_router != address(0), "Adapter: router=0");
        require(_weth != address(0), "Adapter: weth=0");
        router = IUniswapV2Router02(_router);
        WETH = _weth;
    }

    // ============ SWAP: EXACT INPUT ============

    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline,
        bytes calldata extraData
    ) external returns (uint256 amountOut) {
        require(tokenIn != address(0) && tokenOut != address(0), "Adapter: bad token");
        require(tokenIn != tokenOut, "Adapter: same token");
        require(amountIn > 0, "Adapter: amountIn=0");
        require(to != address(0), "Adapter: to=0");
        require(deadline >= block.timestamp, "Adapter: deadline");

        // Pull tokenIn from caller (SwapRouterProxy)
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router
        IERC20(tokenIn).safeIncreaseAllowance(address(router), amountIn);

        address[] memory path = _buildPath(tokenIn, tokenOut, extraData);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );

        amountOut = amounts[amounts.length - 1];

        // Best-effort reset allowance
        // (Một số token "khó tính" có thể revert khi approve(0); nếu gặp, ta sẽ bỏ reset ở proxy/adapter)
        try IERC20(tokenIn).approve(address(router), 0) {} catch {}

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, to);
    }

    // ============ SWAP: EXACT OUTPUT ============

    function swapTokensForExactTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMax,
        address to,
        uint256 deadline,
        bytes calldata extraData
    ) external returns (uint256 amountIn) {
        require(tokenIn != address(0) && tokenOut != address(0), "Adapter: bad token");
        require(tokenIn != tokenOut, "Adapter: same token");
        require(amountOut > 0, "Adapter: amountOut=0");
        require(amountInMax > 0, "Adapter: amountInMax=0");
        require(to != address(0), "Adapter: to=0");
        require(deadline >= block.timestamp, "Adapter: deadline");

        // Pull max tokenIn from caller (SwapRouterProxy)
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountInMax);

        // Approve router max
        IERC20(tokenIn).safeIncreaseAllowance(address(router), amountInMax);

        address[] memory path = _buildPath(tokenIn, tokenOut, extraData);

        uint256[] memory amounts = router.swapTokensForExactTokens(
            amountOut,
            amountInMax,
            path,
            to,
            deadline
        );

        amountIn = amounts[0];

        // Refund unused tokenIn back to caller (SwapRouterProxy)
        uint256 refund = amountInMax - amountIn;
        if (refund > 0) {
            IERC20(tokenIn).safeTransfer(msg.sender, refund);
        }

        try IERC20(tokenIn).approve(address(router), 0) {} catch {}

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, to);
    }

    // ============ QUOTES ============

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata extraData
    ) external view returns (uint256 amountOut) {
        require(tokenIn != address(0) && tokenOut != address(0), "Adapter: bad token");
        require(amountIn > 0, "Adapter: amountIn=0");

        address[] memory path = _buildPath(tokenIn, tokenOut, extraData);
        uint256[] memory amounts = router.getAmountsOut(amountIn, path);
        amountOut = amounts[amounts.length - 1];
    }

    function getAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        bytes calldata extraData
    ) external view returns (uint256 amountIn) {
        require(tokenIn != address(0) && tokenOut != address(0), "Adapter: bad token");
        require(amountOut > 0, "Adapter: amountOut=0");

        address[] memory path = _buildPath(tokenIn, tokenOut, extraData);
        uint256[] memory amounts = router.getAmountsIn(amountOut, path);
        amountIn = amounts[0];
    }

    // ============ INTERNAL ============

    function _buildPath(
        address tokenIn,
        address tokenOut,
        bytes calldata extraData
    ) internal view returns (address[] memory path) {
        // Custom path
        if (extraData.length > 0) {
            path = abi.decode(extraData, (address[]));
            require(path.length >= 2, "Adapter: bad path");
            require(path[0] == tokenIn, "Adapter: path start");
            require(path[path.length - 1] == tokenOut, "Adapter: path end");
            return path;
        }

        // Default path
        if (tokenIn == WETH || tokenOut == WETH) {
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
        } else {
            path = new address[](3);
            path[0] = tokenIn;
            path[1] = WETH;
            path[2] = tokenOut;
        }
    }
}
