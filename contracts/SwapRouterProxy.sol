// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SwapRouterProxy
 * @notice Unified Router: nhận token từ user -> gọi adapter swap -> trả tokenOut về user
 */
contract SwapRouterProxy is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    enum DexType { UNISWAP_V2, UNISWAP_V3, PANCAKESWAP, SUSHISWAP }

    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        address to;
        uint256 deadline;
        DexType dexType;
        bytes extraData; // abi.encode(address[] path) cho V2; V3 tuỳ bạn mở rộng sau
    }

    struct SwapExactOutParams {
        address tokenIn;
        address tokenOut;
        uint256 amountOut;
        uint256 amountInMax;     // user chịu tối đa (bao gồm phí)
        address to;
        uint256 deadline;
        DexType dexType;
        bytes extraData;
    }

    mapping(DexType => address) public dexAdapters;
    mapping(address => bool) public supportedTokens;

    uint256 public protocolFeeBps = 25; // 0.25%
    uint256 public constant MAX_PROTOCOL_FEE_BPS = 100; // 1%
    address public feeRecipient;

    address public immutable WETH;

    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountInUsedOrProvided,
        uint256 amountOut,
        DexType dexType,
        uint256 feeTaken
    );

    event AdapterUpdated(DexType indexed dexType, address indexed oldAdapter, address indexed newAdapter);
    event TokenSupportUpdated(address indexed token, bool supported);
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    constructor(address _weth) {
        require(_weth != address(0), "Router: invalid WETH");
        WETH = _weth;
        feeRecipient = msg.sender;
    }

    // ========================= USER FUNCTIONS =========================

    function swapExactTokensForTokens(SwapParams calldata p)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 amountOut)
    {
        _validateCommon(p.tokenIn, p.tokenOut, p.amountIn, p.deadline, p.to);

        address adapter = dexAdapters[p.dexType];
        require(adapter != address(0), "Router: adapter not set");

        // pull tokenIn from user
        IERC20(p.tokenIn).safeTransferFrom(msg.sender, address(this), p.amountIn);

        // take fee on amountIn
        uint256 fee = (p.amountIn * protocolFeeBps) / 10_000;
        uint256 amountAfterFee = p.amountIn - fee;
        if (fee > 0) IERC20(p.tokenIn).safeTransfer(feeRecipient, fee);

        // approve adapter to spend
        IERC20(p.tokenIn).safeIncreaseAllowance(adapter, amountAfterFee);

        bytes memory data = abi.encodeWithSignature(
            "swapExactTokensForTokens(address,address,uint256,uint256,address,uint256,bytes)",
            p.tokenIn,
            p.tokenOut,
            amountAfterFee,
            p.amountOutMin,
            p.to,
            p.deadline,
            p.extraData
        );

        (bool ok, bytes memory ret) = adapter.call(data);
        require(ok, "Router: adapter call failed");

        amountOut = abi.decode(ret, (uint256));

        // reset allowance (best-effort)
        _resetAllowance(p.tokenIn, adapter);

        emit SwapExecuted(msg.sender, p.tokenIn, p.tokenOut, p.amountIn, amountOut, p.dexType, fee);
    }

    /**
     * Exact-output: để tránh bài toán "fee lấy từ đâu" (vì amountInUsed đã đi swap),
     * ta lấy phí "trần" theo amountInMax ngay từ đầu.
     */
    function swapTokensForExactTokens(SwapExactOutParams calldata p)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 amountInUsed)
    {
        _validateCommon(p.tokenIn, p.tokenOut, p.amountInMax, p.deadline, p.to);

        address adapter = dexAdapters[p.dexType];
        require(adapter != address(0), "Router: adapter not set");

        // pull max from user
        IERC20(p.tokenIn).safeTransferFrom(msg.sender, address(this), p.amountInMax);

        // fee trần theo amountInMax
        uint256 feeMax = (p.amountInMax * protocolFeeBps) / 10_000;
        uint256 amountInMaxAfterFee = p.amountInMax - feeMax;

        if (feeMax > 0) IERC20(p.tokenIn).safeTransfer(feeRecipient, feeMax);

        // approve adapter with amountInMaxAfterFee
        IERC20(p.tokenIn).safeIncreaseAllowance(adapter, amountInMaxAfterFee);

        bytes memory data = abi.encodeWithSignature(
            "swapTokensForExactTokens(address,address,uint256,uint256,address,uint256,bytes)",
            p.tokenIn,
            p.tokenOut,
            p.amountOut,
            amountInMaxAfterFee,
            p.to,
            p.deadline,
            p.extraData
        );

        (bool ok, bytes memory ret) = adapter.call(data);
        require(ok, "Router: adapter call failed");

        amountInUsed = abi.decode(ret, (uint256));

        // adapter refund phần dư (nếu có) về Router (msg.sender=Router), Router hoàn lại user
        uint256 remaining = IERC20(p.tokenIn).balanceOf(address(this));
        if (remaining > 0) {
            IERC20(p.tokenIn).safeTransfer(msg.sender, remaining);
        }

        _resetAllowance(p.tokenIn, adapter);

        emit SwapExecuted(msg.sender, p.tokenIn, p.tokenOut, amountInUsed, p.amountOut, p.dexType, feeMax);
    }

    // ========================= QUOTE (VIEW) =========================

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        DexType dexType,
        bytes calldata extraData
    ) external view returns (uint256 amountOut) {
        address adapter = dexAdapters[dexType];
        require(adapter != address(0), "Router: adapter not set");

        bytes memory data = abi.encodeWithSignature(
            "getAmountOut(address,address,uint256,bytes)",
            tokenIn,
            tokenOut,
            amountIn,
            extraData
        );

        (bool ok, bytes memory ret) = adapter.staticcall(data);
        require(ok, "Router: quote failed");
        amountOut = abi.decode(ret, (uint256));
    }

    function getAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        DexType dexType,
        bytes calldata extraData
    ) external view returns (uint256 amountIn) {
        address adapter = dexAdapters[dexType];
        require(adapter != address(0), "Router: adapter not set");

        bytes memory data = abi.encodeWithSignature(
            "getAmountIn(address,address,uint256,bytes)",
            tokenIn,
            tokenOut,
            amountOut,
            extraData
        );

        (bool ok, bytes memory ret) = adapter.staticcall(data);
        require(ok, "Router: quote failed");
        amountIn = abi.decode(ret, (uint256));
    }

    // ========================= ADMIN =========================

    function setDexAdapter(DexType dexType, address adapter) external onlyOwner {
        require(adapter != address(0), "Router: invalid adapter");
        require(adapter.code.length > 0, "Router: adapter not contract");

        address old = dexAdapters[dexType];
        dexAdapters[dexType] = adapter;
        emit AdapterUpdated(dexType, old, adapter);
    }

    function setDexAdapters(DexType[] calldata types, address[] calldata adapters) external onlyOwner {
        require(types.length == adapters.length && types.length > 0, "Router: length mismatch");
        for (uint256 i = 0; i < types.length; i++) {
            require(adapters[i] != address(0), "Router: invalid adapter");
            require(adapters[i].code.length > 0, "Router: adapter not contract");
            address old = dexAdapters[types[i]];
            dexAdapters[types[i]] = adapters[i];
            emit AdapterUpdated(types[i], old, adapters[i]);
        }
    }

    function setSupportedToken(address token, bool supported) external onlyOwner {
        require(token != address(0), "Router: invalid token");
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    function setSupportedTokens(address[] calldata tokens, bool supported) external onlyOwner {
        require(tokens.length > 0, "Router: empty");
        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "Router: invalid token");
            supportedTokens[tokens[i]] = supported;
            emit TokenSupportUpdated(tokens[i], supported);
        }
    }

    function setProtocolFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_PROTOCOL_FEE_BPS, "Router: fee too high");
        uint256 old = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        emit FeeUpdated(old, newFeeBps);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Router: invalid recipient");
        address old = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(old, newRecipient);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    receive() external payable {}

    // ========================= INTERNAL =========================

    function _validateCommon(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 deadline,
        address to
    ) internal view {
        require(tokenIn != address(0) && tokenOut != address(0), "Router: invalid token");
        require(tokenIn != tokenOut, "Router: same token");
        require(to != address(0), "Router: invalid to");
        require(amount > 0, "Router: amount=0");
        require(deadline >= block.timestamp, "Router: deadline expired");
        require(supportedTokens[tokenIn] && supportedTokens[tokenOut], "Router: token not supported");
    }

    function _resetAllowance(address token, address spender) internal {
        uint256 cur = IERC20(token).allowance(address(this), spender);
        if (cur > 0) {
            // some tokens require approve(0) before set, we just reset to 0
            IERC20(token).approve(spender, 0);
        }
    }
}
