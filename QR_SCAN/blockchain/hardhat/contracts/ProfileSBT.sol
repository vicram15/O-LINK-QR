// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title ProfileSBT
 * @dev Soulbound Token (SBT) for storing blockchain profiles
 * @notice Non-transferable NFT that stores IPFS CID and profile data
 */
contract ProfileSBT is ERC721, Ownable, ERC2771Context {
    // Profile data structure
    struct ProfileData {
        string ipfsCid;
        string displayName;
        uint256 updatedAt;
    }

    // Events
    event ProfileUpdated(
        address indexed owner,
        uint256 indexed tokenId,
        string ipfsCid,
        string displayName
    );

    // State variables
    uint256 private _tokenIds;
    mapping(uint256 => ProfileData) private _profiles;
    mapping(address => uint256) private _addressToTokenId;
    mapping(address => bool) private _hasProfile;

    // Constructor
    constructor(address forwarder) 
        ERC721("Blockchain Profile", "BPROF") 
        ERC2771Context(forwarder) 
        Ownable(msg.sender) 
    {}

    /**
     * @dev Create or update a profile for the given address
     * @param owner The address to create/update profile for
     * @param ipfsCid The IPFS CID of the profile data
     * @param displayName The display name for the profile
     */
    function createOrUpdateProfile(
        address owner,
        string calldata ipfsCid,
        string calldata displayName
    ) external {
        require(owner != address(0), "ProfileSBT: invalid owner");
        require(bytes(ipfsCid).length > 0, "ProfileSBT: invalid CID");
        require(bytes(displayName).length > 0, "ProfileSBT: invalid display name");

        uint256 tokenId = uint256(uint160(owner));
        
        if (!_hasProfile[owner]) {
            // Mint new SBT
            _safeMint(owner, tokenId);
            _hasProfile[owner] = true;
            _addressToTokenId[owner] = tokenId;
        }

        // Update profile data
        _profiles[tokenId] = ProfileData({
            ipfsCid: ipfsCid,
            displayName: displayName,
            updatedAt: block.timestamp
        });

        emit ProfileUpdated(owner, tokenId, ipfsCid, displayName);
    }

    /**
     * @dev Get profile CID for an address
     * @param owner The address to get profile for
     * @return The IPFS CID of the profile
     */
    function profileCid(address owner) external view returns (string memory) {
        require(_hasProfile[owner], "ProfileSBT: profile not found");
        uint256 tokenId = _addressToTokenId[owner];
        return _profiles[tokenId].ipfsCid;
    }

    /**
     * @dev Get complete profile data for an address
     * @param owner The address to get profile for
     * @return tokenId The token ID
     * @return cid The IPFS CID
     * @return displayName The display name
     */
    function profileOf(address owner) external view returns (
        uint256 tokenId,
        string memory cid,
        string memory displayName
    ) {
        require(_hasProfile[owner], "ProfileSBT: profile not found");
        tokenId = _addressToTokenId[owner];
        ProfileData memory profile = _profiles[tokenId];
        cid = profile.ipfsCid;
        displayName = profile.displayName;
    }

    /**
     * @dev Check if an address has a profile
     * @param owner The address to check
     * @return True if profile exists
     */
    function hasProfile(address owner) external view returns (bool) {
        return _hasProfile[owner];
    }

    /**
     * @dev Get profile update timestamp
     * @param owner The address to get timestamp for
     * @return The timestamp when profile was last updated
     */
    function profileUpdatedAt(address owner) external view returns (uint256) {
        require(_hasProfile[owner], "ProfileSBT: profile not found");
        uint256 tokenId = _addressToTokenId[owner];
        return _profiles[tokenId].updatedAt;
    }


    /**
     * @dev Override to prevent transfers (Soulbound)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        // Allow minting and burning, but not transfers
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("ProfileSBT: transfers not allowed");
        }
        return super._update(to, tokenId, auth);
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

    /**
     * @dev Get the total number of profiles
     * @return The total count
     */
    function totalProfiles() external view returns (uint256) {
        return _tokenIds;
    }
}
