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
    
    /**
     * @dev Get the forwarder name
     * @return The name of the forwarder
     */
    function name() public pure returns (string memory) {
        return "AppForwarder";
    }
    
    /**
     * @dev Get the forwarder version
     * @return The version of the forwarder
     */
    function version() public pure returns (string memory) {
        return "1";
    }
}
