// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Registry
 * @notice Central registry for contract addresses (FE/BE tra cứu theo tên)
 */
contract Registry is Ownable, ReentrancyGuard {
    event ContractRegistered(string indexed name, address indexed contractAddress, address indexed registeredBy);
    event ContractUpdated(string indexed name, address indexed oldAddress, address indexed newAddress, address updatedBy);
    event ContractRemoved(string indexed name, address indexed contractAddress, address indexed removedBy);

    mapping(string => address) private contracts;
    string[] private contractNames;
    mapping(string => bool) private contractExists;

    uint256 public constant VERSION = 1;
    uint256 public constant MAX_CONTRACTS = 100;

    modifier validName(string memory name) {
        require(bytes(name).length > 0, "Registry: name empty");
        require(bytes(name).length <= 64, "Registry: name too long");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "Registry: zero address");
        require(addr.code.length > 0, "Registry: not a contract");
        _;
    }

    function registerContract(string memory name, address contractAddress)
        external
        onlyOwner
        validName(name)
        validAddress(contractAddress)
        nonReentrant
    {
        require(!contractExists[name], "Registry: already registered");
        require(contractNames.length < MAX_CONTRACTS, "Registry: full");

        contracts[name] = contractAddress;
        contractExists[name] = true;
        contractNames.push(name);

        emit ContractRegistered(name, contractAddress, msg.sender);
    }

    function updateContract(string memory name, address newAddress)
        external
        onlyOwner
        validName(name)
        validAddress(newAddress)
        nonReentrant
    {
        require(contractExists[name], "Registry: not registered");

        address oldAddress = contracts[name];
        require(oldAddress != newAddress, "Registry: same address");

        contracts[name] = newAddress;
        emit ContractUpdated(name, oldAddress, newAddress, msg.sender);
    }

    function removeContract(string memory name)
        external
        onlyOwner
        validName(name)
        nonReentrant
    {
        require(contractExists[name], "Registry: not registered");

        address contractAddress = contracts[name];

        delete contracts[name];
        delete contractExists[name];

        uint256 len = contractNames.length;
        for (uint256 i = 0; i < len; i++) {
            if (keccak256(bytes(contractNames[i])) == keccak256(bytes(name))) {
                contractNames[i] = contractNames[len - 1];
                contractNames.pop();
                break;
            }
        }

        emit ContractRemoved(name, contractAddress, msg.sender);
    }

    function registerMultipleContracts(string[] memory names, address[] memory addresses_)
        external
        onlyOwner
        nonReentrant
    {
        require(names.length == addresses_.length, "Registry: length mismatch");
        require(names.length > 0, "Registry: empty arrays");
        require(contractNames.length + names.length <= MAX_CONTRACTS, "Registry: would exceed max");

        for (uint256 i = 0; i < names.length; i++) {
            require(bytes(names[i]).length > 0, "Registry: name empty");
            require(bytes(names[i]).length <= 64, "Registry: name too long");
            require(addresses_[i] != address(0), "Registry: zero address");
            require(addresses_[i].code.length > 0, "Registry: not contract");
            require(!contractExists[names[i]], "Registry: already registered");

            contracts[names[i]] = addresses_[i];
            contractExists[names[i]] = true;
            contractNames.push(names[i]);

            emit ContractRegistered(names[i], addresses_[i], msg.sender);
        }
    }

    function getContract(string memory name) external view returns (address) {
        return contracts[name];
    }

    function contractOf(string memory name) external view returns (address) {
        return contracts[name];
    }

    function isRegistered(string memory name) external view returns (bool) {
        return contractExists[name];
    }

    function getAllContracts()
        external
        view
        returns (string[] memory names, address[] memory addresses_)
    {
        uint256 len = contractNames.length;
        names = new string[](len);
        addresses_ = new address[](len);

        for (uint256 i = 0; i < len; i++) {
            string memory nm = contractNames[i];
            names[i] = nm;
            addresses_[i] = contracts[nm];
        }
    }

    function getContractCount() external view returns (uint256) {
        return contractNames.length;
    }

    function getContractNames(uint256 offset, uint256 limit) external view returns (string[] memory names) {
        uint256 len = contractNames.length;
        require(len > 0, "Registry: empty");
        require(offset < len, "Registry: offset out of bounds");

        uint256 end = offset + limit;
        if (end > len) end = len;

        uint256 size = end - offset;
        names = new string[](size);
        for (uint256 i = offset; i < end; i++) {
            names[i - offset] = contractNames[i];
        }
    }

    function getRegistryInfo()
        external
        view
        returns (uint256 version, address ownerAddress, uint256 contractCount, uint256 maxContracts)
    {
        return (VERSION, owner(), contractNames.length, MAX_CONTRACTS);
    }

    function emergencyFreeze() external onlyOwner {
        renounceOwnership();
    }
}
