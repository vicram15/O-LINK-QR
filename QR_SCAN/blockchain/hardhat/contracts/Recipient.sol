// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Recipient
 * @dev Payment recipient contract that trusts the forwarder
 * @notice Handles offline QR payments via meta-transactions
 */
contract Recipient is ERC2771Context, ReentrancyGuard, Ownable {
    event Paid(address indexed sender, uint256 amount, string paymentReference);

    constructor(address forwarder) ERC2771Context(forwarder) Ownable(msg.sender) {}

    /**
     * @dev Process payment with reference
     * @param amount Amount to be paid (in wei)
     * @param paymentReference Payment reference string
     */
    function pay(uint256 amount, string calldata paymentReference) 
        external 
        payable 
        nonReentrant 
    {
        require(msg.value >= amount, "Insufficient payment");
        require(bytes(paymentReference).length > 0, "Reference required");
        
        emit Paid(_msgSender(), amount, paymentReference);
    }

    /**
     * @dev Withdraw funds (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Override _msgSender for meta-transactions
     */
    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    /**
     * @dev Override _msgData for meta-transactions
     */
    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    /**
     * @dev Override _contextSuffixLength for meta-transactions
     */
    function _contextSuffixLength() internal view override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}
