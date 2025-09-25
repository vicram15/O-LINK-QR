import { getTestPrivateKey } from './utils/generateKey';

// Configuration for offline QR payment system
export const CONFIG = {
  // Chain configuration
  CHAIN_ID: parseInt(import.meta.env.VITE_CHAIN_ID || '31337'),
  FORWARDER_ADDRESS: import.meta.env.VITE_FORWARDER_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  RECIPIENT_ADDRESS: import.meta.env.VITE_RECIPIENT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  PROFILE_SBT_ADDRESS: import.meta.env.VITE_PROFILE_SBT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  
  // API configuration
  RELAYER_API_BASE: import.meta.env.VITE_RELAYER_API_BASE || 'http://localhost:3001',
  
  // Block explorer
  BLOCK_EXPLORER_TX_URL: import.meta.env.VITE_BLOCK_EXPLORER_TX_URL || 'https://amoy.polygonscan.com/tx/',
  
  // Security
  RELAY_HMAC_PUBLIC_HINT: import.meta.env.VITE_RELAY_HMAC_PUBLIC_HINT || 'Contact admin for relay authentication',
  RELAY_HMAC_SECRET: import.meta.env.VITE_RELAY_HMAC_SECRET || 'demo-secret-key-for-development',
  
  // IPFS configuration
  IPFS_GATEWAY: import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  PINATA_API_KEY: import.meta.env.VITE_PINATA_API_KEY || '',
  PINATA_SECRET_KEY: import.meta.env.VITE_PINATA_SECRET_KEY || '',
  WEB3_STORAGE_TOKEN: import.meta.env.VITE_WEB3_STORAGE_TOKEN || '',
  
  // Feature flags
  ENABLE_GASLESS: import.meta.env.VITE_ENABLE_GASLESS === 'true',
  
  // Default values
  DEFAULT_DEADLINE_MINUTES: 10,
  DEFAULT_GAS_LIMIT: 200000,
  
  // Development mode
  DEV_OFFLINE_DUMMY_KEY: import.meta.env.VITE_DEV_OFFLINE_DUMMY_KEY || getTestPrivateKey(),
} as const;

// Validate required configuration
export function validateConfig() {
  const errors: string[] = [];
  
  if (!CONFIG.FORWARDER_ADDRESS || CONFIG.FORWARDER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    errors.push('VITE_FORWARDER_ADDRESS is required - please deploy contracts first');
  }
  
  if (!CONFIG.RECIPIENT_ADDRESS || CONFIG.RECIPIENT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    errors.push('VITE_RECIPIENT_ADDRESS is required - please deploy contracts first');
  }
  
  if (!CONFIG.RELAYER_API_BASE) {
    errors.push('VITE_RELAYER_API_BASE is required');
  }
  
  if (errors.length > 0) {
    console.warn(`Configuration warnings:\n${errors.join('\n')}`);
  }
}

// Helper to get block explorer URL for a transaction
export function getExplorerUrl(txHash: string): string {
  return `${CONFIG.BLOCK_EXPLORER_TX_URL}${txHash}`;
}

// Helper to check if we're in development mode
export function isDevelopmentMode(): boolean {
  return import.meta.env.DEV && !!CONFIG.DEV_OFFLINE_DUMMY_KEY;
}
