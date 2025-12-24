// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ReceiptGenerator
 * @notice Lưu & đối soát biên lai: gắn txHash <-> CID IPFS (+ metadata tối thiểu)
 * @dev Chỉ writer/owner được phép ghi receipt để tránh spam dữ liệu on-chain.
 */
contract ReceiptGenerator is Ownable, Pausable, ReentrancyGuard {
    // ===== Struct =====
    struct Receipt {
        bytes32 txHash;       // Transaction hash (bytes32)
        address user;         // Ví gắn với biên lai (thường là người thực hiện)
        string cid;           // CID IPFS (JSON/PDF)
        string txType;        // Loại giao dịch: SWAP / LIMIT / STAKE / APPROVE / ...
        uint256 createdAt;    // Timestamp ghi nhận
        address createdBy;    // Ai gọi ghi receipt (BE/executor)
    }

    // ===== Storage =====
    mapping(bytes32 => Receipt) private _receipts;
    mapping(bytes32 => bool) private _exists;

    // index theo user để FE/BE truy vấn lịch sử
    mapping(address => bytes32[]) private _userReceipts;

    // allowlist writers (backend/executor)
    mapping(address => bool) public isWriter;

    uint256 private _totalReceipts;

    // ===== Events =====
    event WriterUpdated(address indexed writer, bool allowed);
    event ReceiptCreated(
        bytes32 indexed txHash,
        address indexed user,
        address indexed createdBy,
        string cid,
        string txType,
        uint256 createdAt
    );

    // ===== Modifiers =====
    modifier onlyWriter() {
        require(isWriter[msg.sender] || msg.sender == owner(), "Receipt: not writer");
        _;
    }

    // ===== Constructor =====
    constructor() {
        // owner mặc định là writer
        isWriter[msg.sender] = true;
        emit WriterUpdated(msg.sender, true);
    }

    // ===== Admin =====
    function setWriter(address writer, bool allowed) external onlyOwner {
        require(writer != address(0), "Receipt: writer=0");
        isWriter[writer] = allowed;
        emit WriterUpdated(writer, allowed);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ===== Core: create receipt =====
    /**
     * @notice Ghi nhận biên lai giao dịch
     * @param txHash tx hash của giao dịch on-chain (bytes32)
     * @param user ví người dùng gắn với biên lai
     * @param cid CID IPFS (không để rỗng)
     * @param txType loại nghiệp vụ (không để rỗng)
     */
    function createReceipt(
        bytes32 txHash,
        address user,
        string calldata cid,
        string calldata txType
    ) external onlyWriter whenNotPaused nonReentrant {
        require(txHash != bytes32(0), "Receipt: txHash=0");
        require(user != address(0), "Receipt: user=0");
        require(!_exists[txHash], "Receipt: exists");
        require(bytes(cid).length > 0, "Receipt: cid empty");
        require(bytes(cid).length <= 200, "Receipt: cid too long");
        require(bytes(txType).length > 0, "Receipt: type empty");
        require(bytes(txType).length <= 32, "Receipt: type too long");

        Receipt memory r = Receipt({
            txHash: txHash,
            user: user,
            cid: cid,
            txType: txType,
            createdAt: block.timestamp,
            createdBy: msg.sender
        });

        _receipts[txHash] = r;
        _exists[txHash] = true;
        _userReceipts[user].push(txHash);
        _totalReceipts += 1;

        emit ReceiptCreated(txHash, user, msg.sender, cid, txType, block.timestamp);
    }

    // ===== Views =====
    function receiptExists(bytes32 txHash) external view returns (bool) {
        return _exists[txHash];
    }

    function totalReceipts() external view returns (uint256) {
        return _totalReceipts;
    }

    /**
     * @notice Lấy receipt theo txHash
     * @dev Trả về tuple để FE dễ dùng
     */
    function getReceipt(bytes32 txHash)
        external
        view
        returns (
            bytes32 outTxHash,
            address user,
            string memory cid,
            string memory txType,
            uint256 createdAt,
            address createdBy
        )
    {
        require(_exists[txHash], "Receipt: not found");
        Receipt storage r = _receipts[txHash];
        return (r.txHash, r.user, r.cid, r.txType, r.createdAt, r.createdBy);
    }

    /**
     * @notice Lấy danh sách txHash receipts theo user (toàn bộ)
     * @dev FE có thể gọi getReceipt(txHash) cho từng phần tử
     */
    function getReceiptsByUser(address user) external view returns (bytes32[] memory) {
        return _userReceipts[user];
    }

    /**
     * @notice Lấy danh sách txHash receipts theo user (phân trang)
     */
    function getReceiptsByUserPaged(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory page) {
        bytes32[] storage arr = _userReceipts[user];
        uint256 len = arr.length;

        if (offset >= len) return new bytes32[](0);

        uint256 end = offset + limit;
        if (end > len) end = len;

        uint256 size = end - offset;
        page = new bytes32[](size);
        for (uint256 i = 0; i < size; i++) {
            page[i] = arr[offset + i];
        }
    }
}
