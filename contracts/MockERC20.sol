// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev Mock ERC20 token dùng cho testnet & demo đồ án
 * - Chỉ owner mới có quyền mint/burn
 * - Không dùng cho production
 */
contract MockERC20 is ERC20, Ownable {

    /**
     * @notice Deploy token và mint initial supply cho deployer
     * @param name_ Tên token (vd: Trade Token)
     * @param symbol_ Ký hiệu token (vd: TT)
     * @param initialSupply_ Tổng cung ban đầu (đã scale theo decimals)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_
    ) ERC20(name_, symbol_) {
        _mint(msg.sender, initialSupply_);
    }

    /**
     * @notice Mint token cho địa chỉ bất kỳ (chỉ owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn token từ địa chỉ bất kỳ (chỉ owner)
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
