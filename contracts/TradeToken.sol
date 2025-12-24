// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TradeToken
 * @notice ERC20 demo token cho swap/testnet
 */
contract TradeToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    uint256 public immutable MAX_SUPPLY;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 initialMintToOwner_
    ) ERC20(name_, symbol_) {
        require(maxSupply_ > 0, "Token: max=0");
        MAX_SUPPLY = maxSupply_;

        if (initialMintToOwner_ > 0) {
            require(initialMintToOwner_ <= MAX_SUPPLY, "Token: initial > max");
            _mint(msg.sender, initialMintToOwner_);
        }
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Token: exceed max");
        _mint(to, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}
