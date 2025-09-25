import { ethers } from 'ethers';
import { CONFIG } from '../config';

// ProfileSBT contract interface
export interface ProfileData {
  tokenId: string;
  cid: string;
  displayName: string;
}

// EIP-712 domain for profile meta-transactions
export const PROFILE_EIP712_DOMAIN = {
  name: 'MinimalForwarder',
  version: '0.0.1',
  chainId: CONFIG.CHAIN_ID,
  verifyingContract: CONFIG.FORWARDER_ADDRESS,
};

// EIP-712 types for ForwardRequest
export const PROFILE_FORWARD_REQUEST_TYPES = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'data', type: 'bytes' },
  ],
};

/**
 * Get ProfileSBT contract instance
 * @param signerOrProvider Signer or provider
 * @returns Contract instance
 */
export function getProfileSBTContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const abi = [
    'function createOrUpdateProfile(address owner, string calldata ipfsCid, string calldata displayName) external',
    'function profileCid(address owner) view returns (string)',
    'function profileOf(address owner) view returns (uint256 tokenId, string cid, string displayName)',
    'function hasProfile(address owner) view returns (bool)',
    'function profileUpdatedAt(address owner) view returns (uint256)',
    'function totalProfiles() view returns (uint256)',
    'event ProfileUpdated(address indexed owner, uint256 indexed tokenId, string ipfsCid, string displayName)'
  ];
  
  return new ethers.Contract(CONFIG.PROFILE_SBT_ADDRESS, abi, signerOrProvider);
}

/**
 * Create or update profile on-chain
 * @param signer The signer
 * @param owner The owner address
 * @param ipfsCid The IPFS CID
 * @param displayName The display name
 * @returns Transaction receipt
 */
export async function createOrUpdateProfile(
  signer: ethers.Signer,
  owner: string,
  ipfsCid: string,
  displayName: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = getProfileSBTContract(signer);
  return await contract.createOrUpdateProfile(owner, ipfsCid, displayName);
}

/**
 * Get profile data for an address
 * @param provider The provider
 * @param owner The owner address
 * @returns Profile data or null if not found
 */
export async function getProfileData(
  provider: ethers.Provider,
  owner: string
): Promise<ProfileData | null> {
  try {
    const contract = getProfileSBTContract(provider);
    const hasProfile = await contract.hasProfile(owner);
    
    if (!hasProfile) return null;
    
    const [tokenId, cid, displayName] = await contract.profileOf(owner);
    
    return {
      tokenId: tokenId.toString(),
      cid,
      displayName,
    };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return null;
  }
}

/**
 * Get profile CID for an address
 * @param provider The provider
 * @param owner The owner address
 * @returns The CID or null if not found
 */
export async function getProfileCid(
  provider: ethers.Provider,
  owner: string
): Promise<string | null> {
  try {
    const contract = getProfileSBTContract(provider);
    const hasProfile = await contract.hasProfile(owner);
    
    if (!hasProfile) return null;
    
    return await contract.profileCid(owner);
  } catch (error) {
    console.error('Error fetching profile CID:', error);
    return null;
  }
}

/**
 * Check if an address has a profile
 * @param provider The provider
 * @param owner The owner address
 * @returns True if profile exists
 */
export async function hasProfile(
  provider: ethers.Provider,
  owner: string
): Promise<boolean> {
  try {
    const contract = getProfileSBTContract(provider);
    return await contract.hasProfile(owner);
  } catch (error) {
    console.error('Error checking profile existence:', error);
    return false;
  }
}

/**
 * Get profile update timestamp
 * @param provider The provider
 * @param owner The owner address
 * @returns The timestamp or null if not found
 */
export async function getProfileUpdatedAt(
  provider: ethers.Provider,
  owner: string
): Promise<number | null> {
  try {
    const contract = getProfileSBTContract(provider);
    const hasProfile = await contract.hasProfile(owner);
    
    if (!hasProfile) return null;
    
    const timestamp = await contract.profileUpdatedAt(owner);
    return Number(timestamp);
  } catch (error) {
    console.error('Error fetching profile timestamp:', error);
    return null;
  }
}

/**
 * Get total number of profiles
 * @param provider The provider
 * @returns The total count
 */
export async function getTotalProfiles(provider: ethers.Provider): Promise<number> {
  try {
    const contract = getProfileSBTContract(provider);
    const total = await contract.totalProfiles();
    return Number(total);
  } catch (error) {
    console.error('Error fetching total profiles:', error);
    return 0;
  }
}

/**
 * Encode createOrUpdateProfile function call
 * @param owner The owner address
 * @param ipfsCid The IPFS CID
 * @param displayName The display name
 * @returns Encoded function call data
 */
export function encodeCreateOrUpdateProfile(
  owner: string,
  ipfsCid: string,
  displayName: string
): string {
  const iface = new ethers.Interface([
    'function createOrUpdateProfile(address owner, string calldata ipfsCid, string calldata displayName) external'
  ]);
  
  return iface.encodeFunctionData('createOrUpdateProfile', [owner, ipfsCid, displayName]);
}

/**
 * Create a ForwardRequest for profile creation
 * @param from The sender address
 * @param owner The profile owner address
 * @param ipfsCid The IPFS CID
 * @param displayName The display name
 * @param nonce The nonce
 * @param deadline The deadline timestamp
 * @returns ForwardRequest object
 */
export function createProfileForwardRequest(
  from: string,
  owner: string,
  ipfsCid: string,
  displayName: string,
  nonce: string,
  deadline: string
) {
  const data = encodeCreateOrUpdateProfile(owner, ipfsCid, displayName);
  
  return {
    from,
    to: CONFIG.PROFILE_SBT_ADDRESS,
    value: '0',
    gas: '300000', // Estimated gas for profile creation
    nonce,
    deadline,
    data,
  };
}

/**
 * Listen for ProfileUpdated events
 * @param provider The provider
 * @param callback The callback function
 * @returns Event listener
 */
export function onProfileUpdated(
  provider: ethers.Provider,
  callback: (owner: string, tokenId: string, cid: string, displayName: string) => void
) {
  const contract = getProfileSBTContract(provider);
  
  return contract.on('ProfileUpdated', (owner, tokenId, cid, displayName, event) => {
    callback(owner, tokenId.toString(), cid, displayName);
  });
}

/**
 * Estimate gas for profile creation
 * @param signer The signer
 * @param owner The owner address
 * @param ipfsCid The IPFS CID
 * @param displayName The display name
 * @returns Estimated gas cost
 */
export async function estimateProfileCreationGas(
  signer: ethers.Signer,
  owner: string,
  ipfsCid: string,
  displayName: string
): Promise<bigint> {
  try {
    const contract = getProfileSBTContract(signer);
    const gasEstimate = await contract.createOrUpdateProfile.estimateGas(owner, ipfsCid, displayName);
    return gasEstimate;
  } catch (error) {
    console.error('Error estimating gas:', error);
    return BigInt(300000); // Fallback estimate
  }
}

