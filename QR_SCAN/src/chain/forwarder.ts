import { ethers } from 'ethers';
import { CONFIG } from '../config';

// EIP-712 domain for meta-transactions
export const EIP712_DOMAIN = {
  name: 'MinimalForwarder',
  version: '0.0.1',
  chainId: CONFIG.CHAIN_ID,
  verifyingContract: (!CONFIG.FORWARDER_ADDRESS || CONFIG.FORWARDER_ADDRESS === '0x0000000000000000000000000000000000000000') 
    ? '0x1111111111111111111111111111111111111111' 
    : CONFIG.FORWARDER_ADDRESS,
};

// EIP-712 types for ForwardRequest
export const FORWARD_REQUEST_TYPES = {
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

// ForwardRequest type
export interface ForwardRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  deadline: string;
  data: string;
}

// Relay payload type
export interface RelayPayload {
  request: ForwardRequest;
  chainId: number;
  forwarder: string;
  signature: string;
}

/**
 * Encode pay function call data
 * @param amount Amount in wei
 * @param reference Payment reference string
 * @returns Encoded function call data
 */
export function encodePayData(amount: string, reference: string): string {
  const iface = new ethers.Interface([
    'function pay(uint256 amount, string calldata reference) external payable'
  ]);
  
  return iface.encodeFunctionData('pay', [amount, reference]);
}

/**
 * Create a ForwardRequest for payment
 * @param from Sender address
 * @param amount Amount in wei
 * @param reference Payment reference
 * @param nonce Current nonce
 * @param deadline Unix timestamp deadline
 * @returns ForwardRequest object
 */
export function createForwardRequest(
  from: string,
  amount: string,
  reference: string,
  nonce: string,
  deadline: string
): ForwardRequest {
  const data = encodePayData(amount, reference);
  
  return {
    from,
    to: CONFIG.RECIPIENT_ADDRESS,
    value: '0', // Meta-transaction doesn't send ETH directly
    gas: CONFIG.DEFAULT_GAS_LIMIT.toString(),
    nonce,
    deadline,
    data,
  };
}

/**
 * Sign a ForwardRequest using EIP-712
 * @param signer Ethers signer
 * @param request ForwardRequest to sign
 * @returns Signature string
 */
export async function signForwardRequest(
  signer: ethers.Signer,
  request: ForwardRequest
): Promise<string> {
  try {
    console.log('EIP712_DOMAIN:', EIP712_DOMAIN);
    console.log('FORWARD_REQUEST_TYPES:', FORWARD_REQUEST_TYPES);
    console.log('Request to sign:', request);
    
    const signature = await signer.signTypedData(
      EIP712_DOMAIN,
      FORWARD_REQUEST_TYPES,
      request
    );
    
    console.log('EIP-712 signature generated:', signature);
    return signature;
  } catch (error) {
    console.error('Error in signForwardRequest:', error);
    throw error;
  }
}

/**
 * Create relay payload
 * @param request ForwardRequest
 * @param signature Signature
 * @returns RelayPayload
 */
export function createRelayPayload(
  request: ForwardRequest,
  signature: string
): RelayPayload {
  return {
    request,
    chainId: CONFIG.CHAIN_ID,
    forwarder: CONFIG.FORWARDER_ADDRESS,
    signature,
  };
}

/**
 * Calculate deadline timestamp
 * @param minutesFromNow Minutes from current time
 * @returns Unix timestamp
 */
export function calculateDeadline(minutesFromNow: number): string {
  const now = Math.floor(Date.now() / 1000);
  return (now + minutesFromNow * 60).toString();
}

/**
 * Validate address format
 * @param address Address to validate
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Format amount to wei
 * @param amount Amount in ETH
 * @returns Amount in wei as string
 */
export function formatToWei(amount: string): string {
  return ethers.parseEther(amount).toString();
}

/**
 * Format amount from wei to ETH
 * @param wei Amount in wei
 * @returns Amount in ETH as string
 */
export function formatFromWei(wei: string): string {
  return ethers.formatEther(wei);
}
