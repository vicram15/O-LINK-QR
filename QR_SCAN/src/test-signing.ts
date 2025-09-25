// Simple test to verify signing works
import { ethers } from 'ethers';
import { CONFIG, isDevelopmentMode } from './config';

export async function testSigning() {
  try {
    console.log('Testing signing functionality...');
    console.log('Config:', {
      isDevMode: isDevelopmentMode(),
      hasDummyKey: !!CONFIG.DEV_OFFLINE_DUMMY_KEY,
      forwarderAddress: CONFIG.FORWARDER_ADDRESS,
      chainId: CONFIG.CHAIN_ID
    });

    if (!isDevelopmentMode()) {
      console.log('Not in development mode, skipping test');
      return;
    }

    const dummyKey = CONFIG.DEV_OFFLINE_DUMMY_KEY;
    if (!dummyKey) {
      throw new Error('No dummy key configured');
    }

    // Validate private key format
    if (!dummyKey.startsWith('0x') || dummyKey.length !== 66) {
      throw new Error(`Invalid private key format. Expected 0x followed by 64 hex characters, got length ${dummyKey.length}`);
    }

    const wallet = new ethers.Wallet(dummyKey);
    console.log('Wallet address:', await wallet.getAddress());

    // Test simple message signing
    const message = 'Hello, World!';
    const signature = await wallet.signMessage(message);
    console.log('Simple signature test passed:', signature);

    // Test EIP-712 signing
    const domain = {
      name: 'MinimalForwarder',
      version: '0.0.1',
      chainId: CONFIG.CHAIN_ID,
      verifyingContract: '0x1111111111111111111111111111111111111111',
    };

    const types = {
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

    const request = {
      from: '0x742d35Cc6634C0532925a3b8D0C4C4C4C4C4C4C4',
      to: '0x2222222222222222222222222222222222222222',
      value: '0',
      gas: '200000',
      nonce: '0',
      deadline: '1234567890',
      data: '0x1234',
    };

    const eip712Signature = await wallet.signTypedData(domain, types, request);
    console.log('EIP-712 signature test passed:', eip712Signature);

    console.log('All signing tests passed!');
    return true;
  } catch (error) {
    console.error('Signing test failed:', error);
    return false;
  }
}
