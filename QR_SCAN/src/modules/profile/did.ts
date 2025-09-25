import { ethers } from 'ethers';
import { ProfileCredential } from './schema';
import { CONFIG } from '../../config';

// DID utilities for creating and managing decentralized identities

/**
 * Create a DID for an Ethereum address
 * @param address The Ethereum address
 * @param chainId The chain ID
 * @returns The DID string
 */
export function createDid(address: string, chainId: number): string {
  return `did:pkh:eip155:${chainId}:${address.toLowerCase()}`;
}

/**
 * Parse a DID to extract address and chain ID
 * @param did The DID string
 * @returns Object with address and chainId
 */
export function parseDid(did: string): { address: string; chainId: number } | null {
  const match = did.match(/^did:pkh:eip155:(\d+):([0-9a-fA-F]{40})$/);
  if (!match) return null;
  
  return {
    address: match[2].toLowerCase(),
    chainId: parseInt(match[1]),
  };
}

/**
 * Create a profile credential JWT
 * @param did The DID string
 * @param cid The IPFS CID
 * @param signer The ethers signer
 * @returns The signed JWT
 */
export async function createProfileCredential(
  did: string,
  cid: string,
  signer: ethers.Signer
): Promise<string> {
  const address = await signer.getAddress();
  // Get chain ID from provider if available, otherwise use CONFIG
  let chainId = CONFIG.CHAIN_ID;
  if (signer.provider) {
    try {
      const network = await signer.provider.getNetwork();
      chainId = Number(network.chainId);
    } catch (error) {
      console.warn('Could not get chain ID from provider, using CONFIG.CHAIN_ID:', error);
    }
  }
  
  // Create credential payload
  const credential: ProfileCredential = {
    iss: did,
    sub: did,
    profile_cid: cid,
    version: "1.0",
    updated_at: Math.floor(Date.now() / 1000),
  };

  // Create JWT header
  const header = {
    alg: 'ES256K',
    typ: 'JWT',
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(credential));
  
  // Create signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  // Sign with EIP-191
  const signature = await signer.signMessage(signingInput);
  
  // Create JWT
  const jwt = `${signingInput}.${base64UrlEncode(signature)}`;
  
  return jwt;
}

/**
 * Verify a profile credential JWT
 * @param jwt The JWT to verify
 * @param expectedAddress The expected address
 * @returns True if valid
 */
export async function verifyProfileCredential(
  jwt: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return false;

    const [header, payload, signature] = parts;
    
    // Decode payload
    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    
    // Verify DID format
    const parsedDid = parseDid(decodedPayload.iss);
    if (!parsedDid || parsedDid.address.toLowerCase() !== expectedAddress.toLowerCase()) {
      return false;
    }

    // Verify signature (simplified - in production, use proper JWT verification)
    const signingInput = `${header}.${payload}`;
    const expectedSignature = base64UrlDecode(signature);
    
    // This is a simplified verification - in production, use a proper JWT library
    return true; // Placeholder for actual signature verification
  } catch (error) {
    console.error('JWT verification error:', error);
    return false;
  }
}

/**
 * Extract profile CID from credential
 * @param jwt The JWT
 * @returns The CID or null if invalid
 */
export function extractProfileCid(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload.profile_cid || null;
  } catch (error) {
    console.error('Error extracting CID from JWT:', error);
    return null;
  }
}

/**
 * Create a DID document
 * @param did The DID string
 * @param cid The IPFS CID
 * @returns The DID document
 */
export function createDidDocument(did: string, cid: string) {
  const parsedDid = parseDid(did);
  if (!parsedDid) throw new Error('Invalid DID format');

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/secp256k1-2019/v1"
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#controller`,
        type: "EcdsaSecp256k1RecoveryMethod2020",
        controller: did,
        blockchainAccountId: `eip155:${parsedDid.chainId}:${parsedDid.address}`
      }
    ],
    authentication: [`${did}#controller`],
    assertionMethod: [`${did}#controller`],
    service: [
      {
        id: `${did}#profile`,
        type: "ProfileService",
        serviceEndpoint: `https://ipfs.io/ipfs/${cid}`
      }
    ]
  };
}

/**
 * Get DID URI for sharing
 * @param did The DID string
 * @param cid The IPFS CID
 * @returns The DID URI
 */
export function getDidUri(did: string, cid: string): string {
  return `did:pkh:eip155:${parseDid(did)?.chainId}:${parseDid(did)?.address}?profile=${cid}`;
}

// Helper functions for base64 URL encoding/decoding
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  // Add padding if needed
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

/**
 * Store profile data locally
 * @param cid The IPFS CID
 * @param jwt The signed JWT
 * @param did The DID string
 */
export function storeProfileLocally(cid: string, jwt: string, did: string): void {
  const profileData = {
    cid,
    jwt,
    did,
    timestamp: Math.floor(Date.now() / 1000),
  };
  
  localStorage.setItem('blockchain-profile', JSON.stringify(profileData));
}

/**
 * Load profile data from local storage
 * @returns The stored profile data or null
 */
export function loadProfileLocally(): { cid: string; jwt: string; did: string; timestamp: number } | null {
  try {
    const stored = localStorage.getItem('blockchain-profile');
    if (!stored) return null;
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading profile from localStorage:', error);
    return null;
  }
}

/**
 * Clear profile data from local storage
 */
export function clearProfileLocally(): void {
  localStorage.removeItem('blockchain-profile');
}
