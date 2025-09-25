// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title AppForwarder
 * @dev ERC2771Forwarder implementation for offline QR payments
 * @notice This contract handles meta-transactions for offline payment processing
 */
contract AppForwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("AppForwarder") {}
}
