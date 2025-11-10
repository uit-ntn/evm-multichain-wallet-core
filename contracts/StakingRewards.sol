// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakingRewards
 * @notice Flexible staking contract with epoch-based rewards and dynamic APR
 * @dev Supports multiple reward epochs, emergency controls, and anti-reentrancy protection
 */
contract StakingRewards is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ============ STRUCTS ============

    struct Epoch {
        uint256 startTime;
        uint256 endTime;
        uint256 rewardRate; // Rewards per second
        uint256 totalRewards; // Total rewards for this epoch
        uint256 distributedRewards; // Already distributed rewards
        bool active;
    }

    struct UserInfo {
        uint256 balance; // Staked amount
        uint256 rewardDebt; // Reward debt for accurate reward calculation
        uint256 pendingRewards; // Unclaimed rewards
        uint256 lastStakeTime; // Last stake timestamp
        uint256 lastClaimTime; // Last claim timestamp
    }

    struct PoolInfo {
        uint256 totalStaked; // Total amount staked in pool
        uint256 accRewardPerShare; // Accumulated rewards per share (scaled by 1e12)
        uint256 lastRewardTime; // Last time rewards were calculated
        uint256 rewardCap; // Maximum total rewards for this pool
        uint256 stakingCap; // Maximum total staking amount
        uint256 minStakeAmount; // Minimum stake amount
        uint256 lockPeriod; // Lock period in seconds
    }

    // ============ STATE VARIABLES ============

    // Tokens
    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;
    
    // Pool information
    PoolInfo public poolInfo;
    
    // User information
    mapping(address => UserInfo) public userInfo;
    
    // Epoch management
    mapping(uint256 => Epoch) public epochs;
    uint256 public currentEpoch;
    uint256 public totalEpochs;
    
    // Reward calculation precision
    uint256 private constant ACC_PRECISION = 1e12;
    
    // Emergency withdrawal fee (in basis points)
    uint256 public emergencyWithdrawFee = 500; // 5%
    uint256 public constant MAX_EMERGENCY_FEE = 1000; // 10% max
    
    // Performance tracking
    uint256 public totalRewardsDistributed;
    uint256 public totalUniqueStakers;
    mapping(address => bool) public hasStaked;

    // ============ EVENTS ============

    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event RewardPaid(address indexed user, uint256 reward, uint256 timestamp);
    event EpochCreated(uint256 indexed epochId, uint256 startTime, uint256 endTime, uint256 totalRewards);
    event EpochActivated(uint256 indexed epochId);
    event EpochDeactivated(uint256 indexed epochId);
    event EmergencyWithdraw(address indexed user, uint256 amount, uint256 fee);
    event PoolConfigUpdated(uint256 rewardCap, uint256 stakingCap, uint256 minStakeAmount, uint256 lockPeriod);

    // ============ CONSTRUCTOR ============

    constructor(
        address _stakingToken,
        address _rewardToken,
        uint256 _stakingCap,
        uint256 _rewardCap,
        uint256 _minStakeAmount,
        uint256 _lockPeriod
    ) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken != address(0), "Invalid reward token");
        require(_stakingCap > 0, "Invalid staking cap");
        require(_rewardCap > 0, "Invalid reward cap");

        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        
        poolInfo = PoolInfo({
            totalStaked: 0,
            accRewardPerShare: 0,
            lastRewardTime: block.timestamp,
            rewardCap: _rewardCap,
            stakingCap: _stakingCap,
            minStakeAmount: _minStakeAmount,
            lockPeriod: _lockPeriod
        });
    }

    // ============ STAKING FUNCTIONS ============

    /**
     * @notice Stake tokens to earn rewards
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Cannot stake 0");
        require(amount >= poolInfo.minStakeAmount, "Below minimum stake amount");
        
        UserInfo storage user = userInfo[msg.sender];
        
        // Update pool before modifying user balance
        _updatePool();
        
        // Check staking cap
        require(poolInfo.totalStaked + amount <= poolInfo.stakingCap, "Exceeds staking cap");
        
        // Calculate pending rewards before updating balance
        if (user.balance > 0) {
            uint256 pending = (user.balance * poolInfo.accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
            if (pending > 0) {
                user.pendingRewards += pending;
            }
        }
        
        // Track unique stakers
        if (!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            totalUniqueStakers++;
        }
        
        // Transfer tokens from user
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update user info
        user.balance += amount;
        user.lastStakeTime = block.timestamp;
        user.rewardDebt = user.balance * poolInfo.accRewardPerShare / ACC_PRECISION;
        
        // Update pool info
        poolInfo.totalStaked += amount;
        
        emit Staked(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Withdraw staked tokens
     * @param amount Amount of tokens to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.balance >= amount, "Insufficient balance");
        require(amount > 0, "Cannot withdraw 0");
        
        // Check lock period
        require(
            block.timestamp >= user.lastStakeTime + poolInfo.lockPeriod,
            "Tokens are locked"
        );
        
        // Update pool before withdrawal
        _updatePool();
        
        // Calculate and add pending rewards
        uint256 pending = (user.balance * poolInfo.accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
        if (pending > 0) {
            user.pendingRewards += pending;
        }
        
        // Update user balance
        user.balance -= amount;
        user.rewardDebt = user.balance * poolInfo.accRewardPerShare / ACC_PRECISION;
        
        // Update pool total
        poolInfo.totalStaked -= amount;
        
        // Transfer tokens to user
        stakingToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Emergency withdraw with penalty fee
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.balance >= amount, "Insufficient balance");
        require(amount > 0, "Cannot withdraw 0");
        
        // Calculate fee
        uint256 fee = (amount * emergencyWithdrawFee) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        // Update user balance (lose all pending rewards)
        user.balance -= amount;
        user.pendingRewards = 0;
        user.rewardDebt = user.balance * poolInfo.accRewardPerShare / ACC_PRECISION;
        
        // Update pool total
        poolInfo.totalStaked -= amount;
        
        // Transfer tokens (minus fee)
        if (amountAfterFee > 0) {
            stakingToken.safeTransfer(msg.sender, amountAfterFee);
        }
        
        // Keep fee in contract for protocol
        emit EmergencyWithdraw(msg.sender, amount, fee);
    }

    /**
     * @notice Claim pending rewards
     */
    function claimRewards() external nonReentrant whenNotPaused {
        UserInfo storage user = userInfo[msg.sender];
        
        // Update pool to get latest rewards
        _updatePool();
        
        // Calculate total pending rewards
        uint256 pending = (user.balance * poolInfo.accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
        uint256 totalReward = user.pendingRewards + pending;
        
        require(totalReward > 0, "No rewards to claim");
        
        // Reset pending rewards
        user.pendingRewards = 0;
        user.rewardDebt = user.balance * poolInfo.accRewardPerShare / ACC_PRECISION;
        user.lastClaimTime = block.timestamp;
        
        // Update global tracking
        totalRewardsDistributed += totalReward;
        
        // Transfer rewards
        rewardToken.safeTransfer(msg.sender, totalReward);
        
        emit RewardPaid(msg.sender, totalReward, block.timestamp);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get pending rewards for a user
     * @param account User address
     * @return Pending reward amount
     */
    function pendingReward(address account) external view returns (uint256) {
        UserInfo memory user = userInfo[account];
        uint256 accRewardPerShare = poolInfo.accRewardPerShare;
        
        if (block.timestamp > poolInfo.lastRewardTime && poolInfo.totalStaked > 0) {
            uint256 currentEpochData = getCurrentEpochRewards();
            accRewardPerShare += (currentEpochData * ACC_PRECISION) / poolInfo.totalStaked;
        }
        
        uint256 pending = (user.balance * accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
        return user.pendingRewards + pending;
    }

    /**
     * @notice Get current APR based on active epoch
     * @return APR in basis points (10000 = 100%)
     */
    function getCurrentAPR() external view returns (uint256) {
        if (currentEpoch == 0 || poolInfo.totalStaked == 0) {
            return 0;
        }
        
        Epoch memory epoch = epochs[currentEpoch];
        if (!epoch.active || block.timestamp > epoch.endTime) {
            return 0;
        }
        
        // APR = (rewardRate * 365 days * 10000) / totalStaked
        uint256 yearlyRewards = epoch.rewardRate * 365 days;
        return (yearlyRewards * 10000) / poolInfo.totalStaked;
    }

    /**
     * @notice Get user staking information
     * @param account User address
     * @return balance User's staked balance 
     * @return pendingRewards User's pending rewards
     * @return lastStakeTime Last stake timestamp
     * @return lastClaimTime Last claim timestamp  
     * @return canWithdrawAt Timestamp when user can withdraw
     */
    function getUserInfo(address account) external view returns (
        uint256 balance,
        uint256 pendingRewards,
        uint256 lastStakeTime,
        uint256 lastClaimTime,
        uint256 canWithdrawAt
    ) {
        UserInfo memory user = userInfo[account];
        return (
            user.balance,
            user.pendingRewards,
            user.lastStakeTime,
            user.lastClaimTime,
            user.lastStakeTime + poolInfo.lockPeriod
        );
    }

    /**
     * @notice Get pool statistics
     * @return totalStaked Total amount staked in pool
     * @return rewardCap Maximum reward cap
     * @return stakingCap Maximum staking cap
     * @return minStakeAmount Minimum stake amount
     * @return lockPeriod Lock period in seconds
     * @return currentAPR Current APR in basis points
     * @return totalDistributed Total rewards distributed
     */
    function getPoolInfo() external view returns (
        uint256 totalStaked,
        uint256 rewardCap,
        uint256 stakingCap,
        uint256 minStakeAmount,
        uint256 lockPeriod,
        uint256 currentAPR,
        uint256 totalDistributed
    ) {
        return (
            poolInfo.totalStaked,
            poolInfo.rewardCap,
            poolInfo.stakingCap,
            poolInfo.minStakeAmount,
            poolInfo.lockPeriod,
            this.getCurrentAPR(),
            totalRewardsDistributed
        );
    }

    // ============ EPOCH MANAGEMENT ============

    /**
     * @notice Create a new reward epoch
     * @param startTime Epoch start timestamp
     * @param duration Epoch duration in seconds
     * @param totalRewards Total rewards for this epoch
     */
    function createEpoch(
        uint256 startTime,
        uint256 duration,
        uint256 totalRewards
    ) external onlyOwner {
        require(startTime >= block.timestamp, "Start time in past");
        require(duration > 0, "Invalid duration");
        require(totalRewards > 0, "Invalid reward amount");
        
        totalEpochs++;
        uint256 epochId = totalEpochs;
        
        epochs[epochId] = Epoch({
            startTime: startTime,
            endTime: startTime + duration,
            rewardRate: totalRewards / duration,
            totalRewards: totalRewards,
            distributedRewards: 0,
            active: false
        });
        
        emit EpochCreated(epochId, startTime, startTime + duration, totalRewards);
    }

    /**
     * @notice Activate an epoch
     * @param epochId Epoch ID to activate
     */
    function activateEpoch(uint256 epochId) external onlyOwner {
        require(epochId > 0 && epochId <= totalEpochs, "Invalid epoch");
        require(!epochs[epochId].active, "Epoch already active");
        require(epochs[epochId].startTime <= block.timestamp, "Epoch not started");
        require(epochs[epochId].endTime > block.timestamp, "Epoch ended");
        
        // Deactivate current epoch if any
        if (currentEpoch > 0) {
            epochs[currentEpoch].active = false;
            emit EpochDeactivated(currentEpoch);
        }
        
        // Activate new epoch
        epochs[epochId].active = true;
        currentEpoch = epochId;
        
        // Update pool timing
        _updatePool();
        
        emit EpochActivated(epochId);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update pool configuration
     * @param _rewardCap New reward cap
     * @param _stakingCap New staking cap
     * @param _minStakeAmount New minimum stake amount
     * @param _lockPeriod New lock period
     */
    function updatePoolConfig(
        uint256 _rewardCap,
        uint256 _stakingCap,
        uint256 _minStakeAmount,
        uint256 _lockPeriod
    ) external onlyOwner {
        require(_rewardCap > 0, "Invalid reward cap");
        require(_stakingCap >= poolInfo.totalStaked, "Staking cap too low");
        
        poolInfo.rewardCap = _rewardCap;
        poolInfo.stakingCap = _stakingCap;
        poolInfo.minStakeAmount = _minStakeAmount;
        poolInfo.lockPeriod = _lockPeriod;
        
        emit PoolConfigUpdated(_rewardCap, _stakingCap, _minStakeAmount, _lockPeriod);
    }

    /**
     * @notice Set emergency withdrawal fee
     * @param _fee Fee in basis points (max 10%)
     */
    function setEmergencyWithdrawFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_EMERGENCY_FEE, "Fee too high");
        emergencyWithdrawFee = _fee;
    }

    /**
     * @notice Pause staking
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause staking
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw contract tokens
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Update pool reward calculations
     */
    function _updatePool() internal {
        if (block.timestamp <= poolInfo.lastRewardTime) {
            return;
        }
        
        if (poolInfo.totalStaked == 0) {
            poolInfo.lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 reward = getCurrentEpochRewards();
        if (reward > 0) {
            poolInfo.accRewardPerShare += (reward * ACC_PRECISION) / poolInfo.totalStaked;
        }
        
        poolInfo.lastRewardTime = block.timestamp;
    }

    /**
     * @notice Get rewards for current epoch and time period
     * @return Reward amount
     */
    function getCurrentEpochRewards() internal view returns (uint256) {
        if (currentEpoch == 0) {
            return 0;
        }
        
        Epoch memory epoch = epochs[currentEpoch];
        if (!epoch.active) {
            return 0;
        }
        
        uint256 from = poolInfo.lastRewardTime > epoch.startTime ? poolInfo.lastRewardTime : epoch.startTime;
        uint256 to = block.timestamp < epoch.endTime ? block.timestamp : epoch.endTime;
        
        if (from >= to) {
            return 0;
        }
        
        return epoch.rewardRate * (to - from);
    }
}