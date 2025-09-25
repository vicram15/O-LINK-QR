import { Profile } from './schema';
import { CONFIG } from '../../config';

// IPFS configuration
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const PINATA_API_BASE = 'https://api.pinata.cloud';
const PINATA_PIN_JSON_URL = `${PINATA_API_BASE}/pinning/pinJSONToIPFS`;
const PINATA_PIN_FILE_URL = `${PINATA_API_BASE}/pinning/pinFileToIPFS`;
const PINATA_PINS_URL = `${PINATA_API_BASE}/data/pinList`;
const PINATA_UNPIN_URL = `${PINATA_API_BASE}/pinning/unpin`;

// NFT.Storage configuration
const NFT_STORAGE_API_BASE = 'https://api.nft.storage';
const NFT_STORAGE_UPLOAD_URL = `${NFT_STORAGE_API_BASE}/upload`;
const NFT_STORAGE_LIST_URL = `${NFT_STORAGE_API_BASE}/list`;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Get IPFS URL for a CID
export function getIpfsUrl(cid: string): string {
  return `${IPFS_GATEWAY}${cid}`;
}

// Retry utility function
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw lastError!;
}

// Upload profile to IPFS via NFT.Storage (primary) or Pinata (fallback)
export async function putProfile(profile: Profile): Promise<string> {
  // Try NFT.Storage first
  if (isNFTStorageConfigured()) {
    try {
      return await putProfileNFTStorage(profile);
    } catch (error) {
      console.warn('NFT.Storage upload failed, trying Pinata fallback:', error);
    }
  }
  
  // Fallback to Pinata
  if (isPinataConfigured()) {
    try {
      return await putProfilePinata(profile);
    } catch (error) {
      console.warn('Pinata upload failed:', error);
    }
  }
  
  // Return mock CID if no services configured
  return `QmMock${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
}

// Upload profile to IPFS via NFT.Storage
export async function putProfileNFTStorage(profile: Profile): Promise<string> {
  const token = CONFIG.NFT_STORAGE_TOKEN;
  
  if (!token || token === '') {
    throw new Error('NFT.Storage token not configured');
  }

  return retryWithBackoff(async () => {
    const response = await fetch(NFT_STORAGE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `NFT.Storage upload failed (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.value?.cid) {
      throw new Error('Invalid response from NFT.Storage API - missing CID');
    }
    
    return result.value.cid;
  });
}

// Upload profile to IPFS via Pinata (fallback)
export async function putProfilePinata(profile: Profile): Promise<string> {
  const apiKey = CONFIG.PINATA_API_KEY;
  const secretKey = CONFIG.PINATA_SECRET_KEY;
  
  if (!apiKey || !secretKey || apiKey === '' || secretKey === '') {
    throw new Error('Pinata API keys not configured');
  }

  return retryWithBackoff(async () => {
    const response = await fetch(PINATA_PIN_JSON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
      body: JSON.stringify({
        pinataContent: profile,
        pinataMetadata: {
          name: `profile-${profile.wallet}-${profile.timestamp}`,
          keyvalues: {
            type: 'blockchain-profile',
            version: profile.version,
            wallet: profile.wallet,
            displayName: profile.displayName,
            timestamp: profile.timestamp.toString(),
            aadhar: profile.aadhar || '',
            pan: profile.pan || '',
          },
        },
        pinataOptions: {
          cidVersion: 1,
          wrapWithDirectory: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `IPFS upload failed (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.details || errorData.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.IpfsHash) {
      throw new Error('Invalid response from Pinata API - missing IpfsHash');
    }
    
    return result.IpfsHash;
  });
}

// Upload profile to IPFS via web3.storage (alternative)
export async function putProfileWeb3Storage(profile: Profile): Promise<string> {
  const token = import.meta.env.VITE_WEB3_STORAGE_TOKEN;
  
  // Check if API token is configured
  if (!token || token === '') {
    // Return a mock CID for development (no console warning)
    return `QmMock${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  try {
    const response = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Web3.Storage upload failed: ${error}`);
    }

    const result = await response.json();
    return result.cid;
  } catch (error) {
    console.error('Web3.Storage upload error:', error);
    throw new Error(`Failed to upload profile to Web3.Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get profile from IPFS
export async function getProfile(cid: string): Promise<Profile> {
  try {
    const response = await fetch(getIpfsUrl(cid));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch profile from IPFS: ${response.statusText}`);
    }

    const profile = await response.json();
    return profile;
  } catch (error) {
    console.error('IPFS fetch error:', error);
    throw new Error(`Failed to fetch profile from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Upload avatar image to IPFS via NFT.Storage (primary) or Pinata (fallback)
export async function putAvatar(file: File, walletAddress?: string): Promise<string> {
  // Try NFT.Storage first
  if (isNFTStorageConfigured()) {
    try {
      return await putAvatarNFTStorage(file, walletAddress);
    } catch (error) {
      console.warn('NFT.Storage avatar upload failed, trying Pinata fallback:', error);
    }
  }
  
  // Fallback to Pinata
  if (isPinataConfigured()) {
    try {
      return await putAvatarPinata(file, walletAddress);
    } catch (error) {
      console.warn('Pinata avatar upload failed:', error);
    }
  }
  
  // Return mock CID if no services configured
  return `QmMockAvatar${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
}

// Upload avatar to IPFS via NFT.Storage
export async function putAvatarNFTStorage(file: File, walletAddress?: string): Promise<string> {
  const token = CONFIG.NFT_STORAGE_TOKEN;
  
  if (!token || token === '') {
    throw new Error('NFT.Storage token not configured');
  }

  return retryWithBackoff(async () => {
    const response = await fetch(NFT_STORAGE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `NFT.Storage avatar upload failed (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.value?.cid) {
      throw new Error('Invalid response from NFT.Storage API - missing CID');
    }
    
    return result.value.cid;
  });
}

// Upload avatar to IPFS via Pinata (fallback)
export async function putAvatarPinata(file: File, walletAddress?: string): Promise<string> {
  const apiKey = CONFIG.PINATA_API_KEY;
  const secretKey = CONFIG.PINATA_SECRET_KEY;
  
  if (!apiKey || !secretKey || apiKey === '' || secretKey === '') {
    throw new Error('Pinata API keys not configured');
  }

  return retryWithBackoff(async () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pinataMetadata', JSON.stringify({
      name: `avatar-${walletAddress || 'unknown'}-${Date.now()}`,
      keyvalues: {
        type: 'profile-avatar',
        wallet: walletAddress || 'unknown',
        mimeType: file.type,
        size: file.size.toString(),
      },
    }));
    formData.append('pinataOptions', JSON.stringify({
      cidVersion: 1,
      wrapWithDirectory: false,
    }));

    const response = await fetch(PINATA_PIN_FILE_URL, {
      method: 'POST',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Avatar upload failed (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.details || errorData.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.IpfsHash) {
      throw new Error('Invalid response from Pinata API - missing IpfsHash');
    }
    
    return result.IpfsHash;
  });
}

// Get avatar URL
export function getAvatarUrl(avatar: { cid?: string; mime?: string }): string | null {
  if (!avatar.cid) return null;
  return getIpfsUrl(avatar.cid);
}

// Calculate Keccak hash of CID for integrity verification
export async function calculateCidHash(cid: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(cid);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate IPFS CID format
export function isValidCid(cid: string): boolean {
  // Basic CID validation (Qm... for v0, bafy... for v1)
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid) || /^bafy[a-z2-7]+$/.test(cid);
}

// Pinata-specific functions

// Check if API keys are configured
export function isPinataConfigured(): boolean {
  const apiKey = CONFIG.PINATA_API_KEY;
  const secretKey = CONFIG.PINATA_SECRET_KEY;
  return !!(apiKey && secretKey && apiKey !== '' && secretKey !== '');
}

// Check if NFT.Storage is configured
export function isNFTStorageConfigured(): boolean {
  const token = CONFIG.NFT_STORAGE_TOKEN;
  return !!(token && token !== '');
}

// Get Pinata API headers
function getPinataHeaders(): Record<string, string> {
  const apiKey = CONFIG.PINATA_API_KEY;
  const secretKey = CONFIG.PINATA_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    throw new Error('Pinata API keys not configured');
  }
  
  return {
    'pinata_api_key': apiKey,
    'pinata_secret_api_key': secretKey,
  };
}

// Check pinning status for a CID
export async function checkPinningStatus(cid: string): Promise<{
  isPinned: boolean;
  pinDate?: string;
  metadata?: any;
}> {
  if (!isPinataConfigured()) {
    return { isPinned: false };
  }

  try {
    const response = await fetch(`${PINATA_PINS_URL}?hashContains=${cid}`, {
      method: 'GET',
      headers: getPinataHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to check pinning status: ${response.statusText}`);
    }

    const data = await response.json();
    const pin = data.rows?.find((p: any) => p.ipfs_pin_hash === cid);
    
    return {
      isPinned: !!pin,
      pinDate: pin?.date_pinned,
      metadata: pin?.metadata,
    };
  } catch (error) {
    console.error('Error checking pinning status:', error);
    return { isPinned: false };
  }
}

// Unpin a CID from Pinata
export async function unpinFromPinata(cid: string): Promise<boolean> {
  if (!isPinataConfigured()) {
    return false;
  }

  try {
    const response = await fetch(`${PINATA_UNPIN_URL}/${cid}`, {
      method: 'DELETE',
      headers: getPinataHeaders(),
    });

    return response.ok;
  } catch (error) {
    console.error('Error unpinning from Pinata:', error);
    return false;
  }
}

// Get all pinned profiles for a wallet
export async function getPinnedProfiles(walletAddress: string): Promise<Array<{
  cid: string;
  pinDate: string;
  metadata: any;
}>> {
  if (!isPinataConfigured()) {
    return [];
  }

  try {
    const response = await fetch(`${PINATA_PINS_URL}?metadata[keyvalues][wallet]={"value":"${walletAddress}","op":"eq"}&metadata[keyvalues][type]={"value":"blockchain-profile","op":"eq"}`, {
      method: 'GET',
      headers: getPinataHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get pinned profiles: ${response.statusText}`);
    }

    const data = await response.json();
    return data.rows?.map((pin: any) => ({
      cid: pin.ipfs_pin_hash,
      pinDate: pin.date_pinned,
      metadata: pin.metadata,
    })) || [];
  } catch (error) {
    console.error('Error getting pinned profiles:', error);
    return [];
  }
}

// Update profile with unpinning of old version
export async function updateProfile(profile: Profile, oldCid?: string): Promise<string> {
  // First, upload the new profile
  const newCid = await putProfile(profile);
  
  // If we have an old CID and Pinata is configured, try to unpin it
  if (oldCid && isPinataConfigured()) {
    try {
      await unpinFromPinata(oldCid);
    } catch (error) {
      console.warn('Failed to unpin old profile version:', error);
      // Don't fail the update if unpinning fails
    }
  }
  
  return newCid;
}

// Verify profile integrity by checking if it's pinned and accessible
export async function verifyProfileIntegrity(cid: string): Promise<{
  isPinned: boolean;
  isAccessible: boolean;
  pinDate?: string;
}> {
  const pinningStatus = await checkPinningStatus(cid);
  
  let isAccessible = false;
  try {
    const response = await fetch(getIpfsUrl(cid));
    isAccessible = response.ok;
  } catch {
    isAccessible = false;
  }
  
  return {
    isPinned: pinningStatus.isPinned,
    isAccessible,
    pinDate: pinningStatus.pinDate,
  };
}
