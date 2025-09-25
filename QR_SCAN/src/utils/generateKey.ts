import { ethers } from 'ethers';

/**
 * Generate a valid private key for development/testing
 * @returns A valid 64-character hex private key with 0x prefix
 */
export function generateValidPrivateKey(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.privateKey;
}

/**
 * Validate a private key format
 * @param privateKey The private key to validate
 * @returns True if valid, false otherwise
 */
export function isValidPrivateKey(privateKey: string): boolean {
  return privateKey.startsWith('0x') && privateKey.length === 66 && /^0x[0-9a-fA-F]{64}$/.test(privateKey);
}

/**
 * Get a test private key (well-known Hardhat test key)
 * @returns A valid test private key
 */
export function getTestPrivateKey(): string {
  return '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
}

