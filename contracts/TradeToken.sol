// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TradeToken
 * @notice Platform utility token for the DeFi ecosystem
 * @dev ERC20 token with burn, pause, and governance features
 */
contract TradeToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ReentrancyGuard {
    
    // ============ CONSTANTS ============
    
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18; // 1 billion tokens
    uint256 public constant INITIAL_MINT = 100_000_000 * 1e18;  // 100 million tokens
    
    // Vesting schedule constants
    uint256 public constant VESTING_DURATION = 365 days; // 1 year vesting
    uint256 public constant VESTING_CLIFF = 90 days;     // 3 month cliff
    
    // ============ STATE VARIABLES ============
    
    // Minting controls
    bool public mintingFinished = false;
    uint256 public totalMinted;
    
    // Vesting for team and advisors
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliff;
        uint256 duration;
        uint256 released;
        bool revocable;
        bool revoked;
    }
    
    mapping(address => VestingSchedule) public vestingSchedules;
    address[] public vestingBeneficiaries;
    
    // Fee controls for transfers
    uint256 public transferFee = 0; // 0% initially
    uint256 public constant MAX_TRANSFER_FEE = 500; // 5% max
    address public feeRecipient;
    
    // Blacklist for security
    mapping(address => bool) public blacklisted;
    
    // Special roles
    mapping(address => bool) public minters;
    mapping(address => bool) public pausers;
    
    // ============ EVENTS ============
    
    event MintingFinished();
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event PauserAdded(address indexed pauser);
    event PauserRemoved(address indexed pauser);
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount);
    event VestingTokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event TransferFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event AddressBlacklisted(address indexed account);
    event AddressUnblacklisted(address indexed account);
    
    // ============ MODIFIERS ============
    
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    modifier onlyPauser() {
        require(pausers[msg.sender] || msg.sender == owner(), "Not authorized to pause");
        _;
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "Address is blacklisted");
        _;
    }
    
    modifier whenMintingNotFinished() {
        require(!mintingFinished, "Minting is finished");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        address _feeRecipient
    ) ERC20(name, symbol) {
        require(initialOwner != address(0), "Invalid owner address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        _transferOwnership(initialOwner);
        feeRecipient = _feeRecipient;
        
        // Mint initial supply to owner
        _mint(initialOwner, INITIAL_MINT);
        totalMinted = INITIAL_MINT;
    }
    
    // ============ MINTING FUNCTIONS ============
    
    /**
     * @notice Mint tokens to specified address
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyMinter whenMintingNotFinished {
        require(to != address(0), "Cannot mint to zero address");
        require(totalMinted + amount <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(to, amount);
        totalMinted += amount;
    }
    
    /**
     * @notice Batch mint to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to mint
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyMinter whenMintingNotFinished {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length <= 100, "Too many recipients");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalMinted + totalAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            _mint(recipients[i], amounts[i]);
        }
        
        totalMinted += totalAmount;
    }
    
    /**
     * @notice Finish minting permanently
     */
    function finishMinting() external onlyOwner {
        require(!mintingFinished, "Minting already finished");
        mintingFinished = true;
        emit MintingFinished();
    }
    
    // ============ VESTING FUNCTIONS ============
    
    /**
     * @notice Create vesting schedule for beneficiary
     * @param beneficiary Address of the beneficiary
     * @param amount Total amount to vest
     * @param startTime Vesting start time
     * @param revocable Whether vesting can be revoked
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        bool revocable
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be > 0");
        require(startTime >= block.timestamp, "Start time in past");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting already exists");
        
        // Transfer tokens to this contract for vesting
        _transfer(msg.sender, address(this), amount);
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            startTime: startTime,
            cliff: startTime + VESTING_CLIFF,
            duration: VESTING_DURATION,
            released: 0,
            revocable: revocable,
            revoked: false
        });
        
        vestingBeneficiaries.push(beneficiary);
        
        emit VestingScheduleCreated(beneficiary, amount);
    }
    
    /**
     * @notice Release vested tokens for beneficiary
     * @param beneficiary Address of the beneficiary
     */
    function releaseVestedTokens(address beneficiary) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Vesting revoked");
        require(block.timestamp >= schedule.cliff, "Cliff not reached");
        
        uint256 vested = _calculateVestedAmount(schedule);
        uint256 releasable = vested - schedule.released;
        
        require(releasable > 0, "No tokens to release");
        
        schedule.released += releasable;
        _transfer(address(this), beneficiary, releasable);
        
        emit VestingTokensReleased(beneficiary, releasable);
    }
    
    /**
     * @notice Revoke vesting schedule (if revocable)
     * @param beneficiary Address of the beneficiary
     */
    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(schedule.revocable, "Vesting not revocable");
        require(!schedule.revoked, "Vesting already revoked");
        
        // Calculate already vested amount
        uint256 vested = _calculateVestedAmount(schedule);
        uint256 releasable = vested - schedule.released;
        
        // Release vested tokens to beneficiary
        if (releasable > 0) {
            schedule.released += releasable;
            _transfer(address(this), beneficiary, releasable);
        }
        
        // Return unvested tokens to owner
        uint256 unvested = schedule.totalAmount - schedule.released;
        if (unvested > 0) {
            _transfer(address(this), owner(), unvested);
        }
        
        schedule.revoked = true;
        
        emit VestingRevoked(beneficiary);
    }
    
    // ============ TRANSFER FUNCTIONS ============
    
    /**
     * @notice Transfer with fee handling
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override notBlacklisted(from) notBlacklisted(to) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        
        if (transferFee > 0 && from != owner() && to != owner()) {
            uint256 fee = (amount * transferFee) / 10000;
            uint256 amountAfterFee = amount - fee;
            
            // Transfer fee to fee recipient
            super._transfer(from, feeRecipient, fee);
            // Transfer remaining amount to recipient
            super._transfer(from, to, amountAfterFee);
        } else {
            super._transfer(from, to, amount);
        }
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Add minter role
     * @param minter Address to add as minter
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!minters[minter], "Already a minter");
        
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @notice Remove minter role
     * @param minter Address to remove from minters
     */
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");
        
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @notice Add pauser role
     * @param pauser Address to add as pauser
     */
    function addPauser(address pauser) external onlyOwner {
        require(pauser != address(0), "Invalid pauser address");
        require(!pausers[pauser], "Already a pauser");
        
        pausers[pauser] = true;
        emit PauserAdded(pauser);
    }
    
    /**
     * @notice Remove pauser role
     * @param pauser Address to remove from pausers
     */
    function removePauser(address pauser) external onlyOwner {
        require(pausers[pauser], "Not a pauser");
        
        pausers[pauser] = false;
        emit PauserRemoved(pauser);
    }
    
    /**
     * @notice Pause token transfers
     */
    function pause() external onlyPauser {
        _pause();
    }
    
    /**
     * @notice Unpause token transfers
     */
    function unpause() external onlyPauser {
        _unpause();
    }
    
    /**
     * @notice Set transfer fee
     * @param _transferFee New transfer fee in basis points
     */
    function setTransferFee(uint256 _transferFee) external onlyOwner {
        require(_transferFee <= MAX_TRANSFER_FEE, "Fee too high");
        
        uint256 oldFee = transferFee;
        transferFee = _transferFee;
        
        emit TransferFeeUpdated(oldFee, _transferFee);
    }
    
    /**
     * @notice Set fee recipient
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, _feeRecipient);
    }
    
    /**
     * @notice Blacklist an address
     * @param account Address to blacklist
     */
    function blacklistAddress(address account) external onlyOwner {
        require(account != address(0), "Invalid address");
        require(!blacklisted[account], "Already blacklisted");
        
        blacklisted[account] = true;
        emit AddressBlacklisted(account);
    }
    
    /**
     * @notice Remove address from blacklist
     * @param account Address to unblacklist
     */
    function unblacklistAddress(address account) external onlyOwner {
        require(blacklisted[account], "Not blacklisted");
        
        blacklisted[account] = false;
        emit AddressUnblacklisted(account);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get vesting information for beneficiary
     * @param beneficiary Address of the beneficiary
     * @return totalAmount Total vesting amount
     * @return released Already released amount
     * @return releasable Currently releasable amount
     * @return vested Total vested amount
     * @return revoked Whether vesting is revoked
     */
    function getVestingInfo(address beneficiary) external view returns (
        uint256 totalAmount,
        uint256 released,
        uint256 releasable,
        uint256 vested,
        bool revoked
    ) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        
        if (schedule.totalAmount == 0 || schedule.revoked) {
            return (0, 0, 0, 0, schedule.revoked);
        }
        
        uint256 vestedAmount = _calculateVestedAmount(schedule);
        uint256 releasableAmount = 0;
        
        if (block.timestamp >= schedule.cliff) {
            releasableAmount = vestedAmount - schedule.released;
        }
        
        return (
            schedule.totalAmount,
            schedule.released,
            releasableAmount,
            vestedAmount,
            schedule.revoked
        );
    }
    
    /**
     * @notice Get all vesting beneficiaries
     * @return Array of beneficiary addresses
     */
    function getVestingBeneficiaries() external view returns (address[] memory) {
        return vestingBeneficiaries;
    }
    
    /**
     * @notice Get token supply information
     * @return totalSupply_ Current total supply
     * @return maxSupply Maximum possible supply
     * @return totalMinted_ Total tokens minted
     * @return remainingSupply Remaining mintable supply
     */
    function getSupplyInfo() external view returns (
        uint256 totalSupply_,
        uint256 maxSupply,
        uint256 totalMinted_,
        uint256 remainingSupply
    ) {
        return (
            totalSupply(),
            MAX_SUPPLY,
            totalMinted,
            MAX_SUPPLY - totalMinted
        );
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Calculate vested amount for a schedule
     */
    function _calculateVestedAmount(VestingSchedule memory schedule) internal view returns (uint256) {
        if (block.timestamp < schedule.cliff) {
            return 0;
        }
        
        if (block.timestamp >= schedule.startTime + schedule.duration) {
            return schedule.totalAmount;
        }
        
        uint256 timeVested = block.timestamp - schedule.startTime;
        return (schedule.totalAmount * timeVested) / schedule.duration;
    }
    
    /**
     * @notice Override required by Solidity for multiple inheritance
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @notice Emergency function to recover stuck tokens
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyRecoverToken(address token, uint256 amount) external onlyOwner {
        require(token != address(this), "Cannot recover native token");
        IERC20(token).transfer(owner(), amount);
    }
}