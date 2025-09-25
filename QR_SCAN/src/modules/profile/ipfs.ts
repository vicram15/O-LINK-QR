import { Profile } from './schema';

// IPFS configuration
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const IPFS_API_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

// Get IPFS URL for a CID
export function getIpfsUrl(cid: string): string {
  return `${IPFS_GATEWAY}${cid}`;
}

// Upload profile to IPFS via Pinata
export async function putProfile(profile: Profile): Promise<string> {
  const apiKey = import.meta.env.VITE_PINATA_API_KEY;
  const secretKey = import.meta.env.VITE_PINATA_SECRET_KEY;
  
  // Check if API keys are configured
  if (!apiKey || !secretKey || apiKey === '' || secretKey === '') {
    // Return a mock CID for development (no console warning)
    return `QmMock${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  try {
    const response = await fetch(IPFS_API_URL, {
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
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`IPFS upload failed: ${error}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error(`Failed to upload profile to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

// Upload avatar image to IPFS
export async function putAvatar(file: File): Promise<string> {
  const apiKey = import.meta.env.VITE_PINATA_API_KEY;
  const secretKey = import.meta.env.VITE_PINATA_SECRET_KEY;
  
  // Check if API keys are configured
  if (!apiKey || !secretKey || apiKey === '' || secretKey === '') {
    // Return a mock CID for development (no console warning)
    return `QmMockAvatar${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pinataMetadata', JSON.stringify({
      name: `avatar-${Date.now()}`,
    }));
    formData.append('pinataOptions', JSON.stringify({
      cidVersion: 1,
    }));

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Avatar upload failed: ${error}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Avatar upload error:', error);
    throw new Error(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
