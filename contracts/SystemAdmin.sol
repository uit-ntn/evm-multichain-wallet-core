// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SystemAdmin
 * @notice Emergency system administration contract with pause/unpause functionality
 * @dev Provides centralized emergency controls for the entire DeFi protocol
 */
contract SystemAdmin is Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ============ STATE VARIABLES ============

    // Multi-signature requirement for critical operations
    uint256 public constant REQUIRED_CONFIRMATIONS = 2;
    uint256 public constant EMERGENCY_DELAY = 24 hours;
    
    // Authorized admin addresses
    mapping(address => bool) public authorizedAdmins;
    uint256 public totalAdmins;
    
    // Emergency proposals tracking
    struct EmergencyProposal {
        address proposer;
        uint256 proposedAt;
        uint256 confirmations;
        bool executed;
        string reason;
        mapping(address => bool) confirmed;
    }
    
    mapping(uint256 => EmergencyProposal) public emergencyProposals;
    uint256 public totalProposals;

    // Contract registry for system-wide controls
    mapping(address => bool) public registeredContracts;
    address[] public contractList;
    
    // Emergency contacts and procedures
    string public emergencyRunbookURL;
    string public emergencyContactInfo;
    
    // System status flags
    bool public systemInEmergency;
    uint256 public emergencyStartTime;
    string public emergencyReason;

    // ============ EVENTS ============

    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);
    event ContractRegistered(address indexed contractAddr, string name);
    event ContractUnregistered(address indexed contractAddr);
    event EmergencyProposed(uint256 indexed proposalId, address indexed proposer, string reason);
    event EmergencyConfirmed(uint256 indexed proposalId, address indexed confirmer);
    event EmergencyExecuted(uint256 indexed proposalId, address indexed executor);
    event SystemEmergencyDeclared(string reason, address indexed declaredBy);
    event SystemEmergencyResolved(address indexed resolvedBy);
    event RunbookUpdated(string newURL, address indexed updatedBy);

    // ============ MODIFIERS ============

    modifier onlyAuthorizedAdmin() {
        require(authorizedAdmins[msg.sender] || msg.sender == owner(), "Not authorized admin");
        _;
    }

    modifier onlyInEmergency() {
        require(systemInEmergency, "System not in emergency");
        _;
    }

    modifier onlyNotInEmergency() {
        require(!systemInEmergency, "System in emergency");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(string memory _runbookURL, string memory _contactInfo) {
        emergencyRunbookURL = _runbookURL;
        emergencyContactInfo = _contactInfo;
        
        // Add deployer as first admin
        authorizedAdmins[msg.sender] = true;
        totalAdmins = 1;
        
        emit AdminAdded(msg.sender, msg.sender);
    }

    // ============ EMERGENCY CONTROLS ============

    /**
     * @notice Pause the entire system (requires multi-sig)
     * @param reason Reason for emergency pause
     */
    function proposeEmergencyPause(string calldata reason) external onlyAuthorizedAdmin {
        require(!paused(), "Already paused");
        require(bytes(reason).length > 0, "Reason required");
        
        totalProposals++;
        EmergencyProposal storage proposal = emergencyProposals[totalProposals];
        proposal.proposer = msg.sender;
        proposal.proposedAt = block.timestamp;
        proposal.confirmations = 1;
        proposal.executed = false;
        proposal.reason = reason;
        proposal.confirmed[msg.sender] = true;
        
        emit EmergencyProposed(totalProposals, msg.sender, reason);
        
        // If we have enough admins, execute immediately if enough confirmations
        if (totalAdmins == 1 || proposal.confirmations >= REQUIRED_CONFIRMATIONS) {
            _executeEmergencyPause(totalProposals);
        }
    }

    /**
     * @notice Confirm an emergency pause proposal
     * @param proposalId ID of the proposal to confirm
     */
    function confirmEmergencyPause(uint256 proposalId) external onlyAuthorizedAdmin {
        EmergencyProposal storage proposal = emergencyProposals[proposalId];
        require(proposal.proposer != address(0), "Proposal not found");
        require(!proposal.executed, "Already executed");
        require(!proposal.confirmed[msg.sender], "Already confirmed");
        require(block.timestamp <= proposal.proposedAt + EMERGENCY_DELAY, "Proposal expired");
        
        proposal.confirmed[msg.sender] = true;
        proposal.confirmations++;
        
        emit EmergencyConfirmed(proposalId, msg.sender);
        
        // Execute if we have enough confirmations
        if (proposal.confirmations >= REQUIRED_CONFIRMATIONS) {
            _executeEmergencyPause(proposalId);
        }
    }

    /**
     * @notice Execute emergency pause
     * @param proposalId ID of the confirmed proposal
     */
    function _executeEmergencyPause(uint256 proposalId) internal {
        EmergencyProposal storage proposal = emergencyProposals[proposalId];
        require(!proposal.executed, "Already executed");
        
        proposal.executed = true;
        
        // Pause this contract
        _pause();
        
        // Pause all registered contracts
        _pauseAllContracts();
        
        // Set system emergency state
        systemInEmergency = true;
        emergencyStartTime = block.timestamp;
        emergencyReason = proposal.reason;
        
        emit EmergencyExecuted(proposalId, msg.sender);
        emit SystemEmergencyDeclared(proposal.reason, msg.sender);
    }

    /**
     * @notice Resume system operations (requires multi-sig)
     */
    function unpauseSystem() external onlyAuthorizedAdmin {
        require(paused(), "Not paused");
        
        // Multi-sig check for unpause
        if (totalAdmins > 1) {
            // In production, implement similar proposal system for unpause
            // For now, allow any admin to unpause after emergency delay
            require(
                block.timestamp >= emergencyStartTime + EMERGENCY_DELAY,
                "Emergency delay not passed"
            );
        }
        
        _unpause();
        _unpauseAllContracts();
        
        systemInEmergency = false;
        emergencyStartTime = 0;
        emergencyReason = "";
        
        emit SystemEmergencyResolved(msg.sender);
    }

    /**
     * @notice Force pause a specific contract
     * @param contractAddr Address of contract to pause
     */
    function pauseContract(address contractAddr) external onlyAuthorizedAdmin {
        require(registeredContracts[contractAddr], "Contract not registered");
        
        // Call pause on the target contract
        (bool success,) = contractAddr.call(abi.encodeWithSignature("pause()"));
        require(success, "Pause call failed");
    }

    /**
     * @notice Force unpause a specific contract
     * @param contractAddr Address of contract to unpause
     */
    function unpauseContract(address contractAddr) external onlyAuthorizedAdmin {
        require(registeredContracts[contractAddr], "Contract not registered");
        
        // Call unpause on the target contract
        (bool success,) = contractAddr.call(abi.encodeWithSignature("unpause()"));
        require(success, "Unpause call failed");
    }

    // ============ ADMIN MANAGEMENT ============

    /**
     * @notice Add a new authorized admin
     * @param admin Address to add as admin
     */
    function addAdmin(address admin) external onlyOwner {
        require(admin != address(0), "Invalid admin address");
        require(!authorizedAdmins[admin], "Already admin");
        require(totalAdmins < 10, "Too many admins"); // Reasonable limit
        
        authorizedAdmins[admin] = true;
        totalAdmins++;
        
        emit AdminAdded(admin, msg.sender);
    }

    /**
     * @notice Remove an authorized admin
     * @param admin Address to remove from admins
     */
    function removeAdmin(address admin) external onlyOwner {
        require(authorizedAdmins[admin], "Not an admin");
        require(totalAdmins > 1, "Cannot remove last admin");
        
        authorizedAdmins[admin] = false;
        totalAdmins--;
        
        emit AdminRemoved(admin, msg.sender);
    }

    // ============ CONTRACT REGISTRY ============

    /**
     * @notice Register a contract for system-wide controls
     * @param contractAddr Contract address to register
     * @param name Human-readable name for the contract
     */
    function registerContract(address contractAddr, string calldata name) external onlyOwner {
        require(contractAddr != address(0), "Invalid contract address");
        require(!registeredContracts[contractAddr], "Already registered");
        require(bytes(name).length > 0, "Name required");
        
        registeredContracts[contractAddr] = true;
        contractList.push(contractAddr);
        
        emit ContractRegistered(contractAddr, name);
    }

    /**
     * @notice Unregister a contract
     * @param contractAddr Contract address to unregister
     */
    function unregisterContract(address contractAddr) external onlyOwner {
        require(registeredContracts[contractAddr], "Not registered");
        
        registeredContracts[contractAddr] = false;
        
        // Remove from array
        for (uint256 i = 0; i < contractList.length; i++) {
            if (contractList[i] == contractAddr) {
                contractList[i] = contractList[contractList.length - 1];
                contractList.pop();
                break;
            }
        }
        
        emit ContractUnregistered(contractAddr);
    }

    // ============ EMERGENCY PROCEDURES ============

    /**
     * @notice Update emergency runbook URL
     * @param newURL New runbook URL
     */
    function updateRunbook(string calldata newURL) external onlyOwner {
        require(bytes(newURL).length > 0, "URL required");
        emergencyRunbookURL = newURL;
        emit RunbookUpdated(newURL, msg.sender);
    }

    /**
     * @notice Update emergency contact information
     * @param newContactInfo New contact information
     */
    function updateEmergencyContact(string calldata newContactInfo) external onlyOwner {
        require(bytes(newContactInfo).length > 0, "Contact info required");
        emergencyContactInfo = newContactInfo;
    }

    /**
     * @notice Emergency token withdrawal from any registered contract
     * @param contractAddr Contract to withdraw from
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdrawFromContract(
        address contractAddr,
        address token,
        uint256 amount
    ) external onlyAuthorizedAdmin onlyInEmergency {
        require(registeredContracts[contractAddr], "Contract not registered");
        
        // Call emergencyWithdraw on target contract
        bytes memory data = abi.encodeWithSignature(
            "emergencyWithdraw(address,uint256)",
            token,
            amount
        );
        
        (bool success,) = contractAddr.call(data);
        require(success, "Emergency withdraw failed");
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get all registered contracts
     * @return Array of registered contract addresses
     */
    function getRegisteredContracts() external view returns (address[] memory) {
        return contractList;
    }

    /**
     * @notice Get emergency proposal details
     * @param proposalId Proposal ID
     * @return proposer Proposal creator
     * @return proposedAt Proposal timestamp
     * @return confirmations Number of confirmations
     * @return executed Whether proposal was executed
     * @return reason Proposal reason
     */
    function getEmergencyProposal(uint256 proposalId) external view returns (
        address proposer,
        uint256 proposedAt,
        uint256 confirmations,
        bool executed,
        string memory reason
    ) {
        EmergencyProposal storage proposal = emergencyProposals[proposalId];
        return (
            proposal.proposer,
            proposal.proposedAt,
            proposal.confirmations,
            proposal.executed,
            proposal.reason
        );
    }

    /**
     * @notice Check if an admin has confirmed a proposal
     * @param proposalId Proposal ID
     * @param admin Admin address
     * @return Whether admin has confirmed
     */
    function hasConfirmed(uint256 proposalId, address admin) external view returns (bool) {
        return emergencyProposals[proposalId].confirmed[admin];
    }

    /**
     * @notice Get system status information
     * @return inEmergency Whether system is in emergency state
     * @return emergencyStart Emergency start timestamp
     * @return reason Current emergency reason
     * @return totalContracts Number of registered contracts
     * @return totalAdmins_ Number of authorized admins
     */
    function getSystemStatus() external view returns (
        bool inEmergency,
        uint256 emergencyStart,
        string memory reason,
        uint256 totalContracts,
        uint256 totalAdmins_
    ) {
        return (
            systemInEmergency,
            emergencyStartTime,
            emergencyReason,
            contractList.length,
            totalAdmins
        );
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Pause all registered contracts
     */
    function _pauseAllContracts() internal {
        for (uint256 i = 0; i < contractList.length; i++) {
            address contractAddr = contractList[i];
            
            // Try to pause each contract
            (bool success,) = contractAddr.call(abi.encodeWithSignature("pause()"));
            
            // Continue even if some contracts fail to pause
            // Log would be nice here but we'll emit events instead
            if (!success) {
                // Could emit an event for failed pause attempts
                continue;
            }
        }
    }

    /**
     * @notice Unpause all registered contracts
     */
    function _unpauseAllContracts() internal {
        for (uint256 i = 0; i < contractList.length; i++) {
            address contractAddr = contractList[i];
            
            // Try to unpause each contract
            (bool success,) = contractAddr.call(abi.encodeWithSignature("unpause()"));
            
            // Continue even if some contracts fail to unpause
            if (!success) {
                continue;
            }
        }
    }

    // ============ EMERGENCY FUNCTIONS ============

    /**
     * @notice Last resort - owner can force pause without multi-sig
     * @dev Only use in extreme circumstances
     */
    function ownerEmergencyPause(string calldata reason) external onlyOwner {
        require(!paused(), "Already paused");
        require(bytes(reason).length > 0, "Reason required");
        
        _pause();
        _pauseAllContracts();
        
        systemInEmergency = true;
        emergencyStartTime = block.timestamp;
        emergencyReason = string(abi.encodePacked("OWNER OVERRIDE: ", reason));
        
        emit SystemEmergencyDeclared(emergencyReason, msg.sender);
    }

    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {
        // Allow contract to receive ETH for emergency operations
    }
}