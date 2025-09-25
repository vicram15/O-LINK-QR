import { useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG, isDevelopmentMode } from '../../config';
import { 
  createForwardRequest, 
  signForwardRequest, 
  createRelayPayload,
  calculateDeadline,
  formatToWei 
} from '../../chain/forwarder';

export interface UseOfflineMetaTxReturn {
  buildRequest: (amount: string, reference: string, deadlineMinutes: number) => Promise<any>;
  signRequest: (request: any) => Promise<string>;
  createRelayPayload: (request: any, signature: string) => any;
  estimateGas: (request: any) => Promise<string>;
  getNonce: (address: string) => Promise<string>;
}

export function useOfflineMetaTx(): UseOfflineMetaTxReturn {
  
  const getNonce = useCallback(async (address: string): Promise<string> => {
    try {
      // For development, return a mock nonce
      if (isDevelopmentMode()) {
        return '0';
      }
      
      // In production, this would fetch from the actual RPC
      // For now, return a mock nonce to prevent errors
      return '0';
    } catch (error) {
      console.error('Error fetching nonce:', error);
      // Return 0 as fallback for development
      return '0';
    }
  }, []);

  const buildRequest = useCallback(async (
    amount: string, 
    reference: string, 
    deadlineMinutes: number
  ) => {
    try {
      // In development mode, use a dummy address
      // In production, this should come from the connected wallet
      const fromAddress = isDevelopmentMode() 
        ? '0x742d35Cc6634C0532925a3b8D0C4C4C4C4C4C4C4' // Dummy address
        : '0x0000000000000000000000000000000000000000'; // This should be replaced with actual wallet address
      
      const deadline = calculateDeadline(deadlineMinutes);
      const nonce = await getNonce(fromAddress);
      
      // For demo mode, use dummy contract addresses if not configured
      const forwarderAddress = (!CONFIG.FORWARDER_ADDRESS || CONFIG.FORWARDER_ADDRESS === '0x0000000000000000000000000000000000000000') 
        ? '0x1111111111111111111111111111111111111111' 
        : CONFIG.FORWARDER_ADDRESS;
        
      const recipientAddress = (!CONFIG.RECIPIENT_ADDRESS || CONFIG.RECIPIENT_ADDRESS === '0x0000000000000000000000000000000000000000') 
        ? '0x2222222222222222222222222222222222222222' 
        : CONFIG.RECIPIENT_ADDRESS;
      
      // Create a mock request for demo purposes
      const mockRequest = {
        from: fromAddress,
        to: recipientAddress,
        value: '0',
        gas: CONFIG.DEFAULT_GAS_LIMIT.toString(),
        nonce,
        deadline,
        data: '0x' + Array.from(new TextEncoder().encode(`pay(${amount}, "${reference}")`))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
      };
      
      return mockRequest;
    } catch (error) {
      console.error('Error building request:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to build request');
    }
  }, [getNonce]);

  const signRequest = useCallback(async (request: any): Promise<string> => {
    try {
      if (isDevelopmentMode()) {
        // Use dummy private key for development
        const dummyKey = CONFIG.DEV_OFFLINE_DUMMY_KEY;
        if (!dummyKey) {
          throw new Error('Development mode requires VITE_DEV_OFFLINE_DUMMY_KEY');
        }
        
        console.log('Signing request in development mode:', request);
        
        // Validate private key format
        if (!dummyKey.startsWith('0x') || dummyKey.length !== 66) {
          throw new Error(`Invalid private key format. Expected 0x followed by 64 hex characters, got length ${dummyKey.length}`);
        }
        
        try {
          const wallet = new ethers.Wallet(dummyKey);
          console.log('Wallet address:', await wallet.getAddress());
          
          const signature = await signForwardRequest(wallet, request);
          console.log('Signature generated:', signature);
          return signature;
        } catch (signError) {
          console.warn('EIP-712 signing failed, using fallback:', signError);
          // Fallback: create a simple signature for demo purposes
          const wallet = new ethers.Wallet(dummyKey);
          const message = JSON.stringify(request);
          const signature = await wallet.signMessage(message);
          console.log('Fallback signature generated:', signature);
          return signature;
        }
      } else {
        // In production, this should use the connected wallet
        if (typeof window !== 'undefined' && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          return await signForwardRequest(signer, request);
        } else {
          throw new Error('No wallet connected');
        }
      }
    } catch (error) {
      console.error('Error signing request:', error);
      console.error('Request object:', request);
      console.error('Config:', {
        isDevMode: isDevelopmentMode(),
        hasDummyKey: !!CONFIG.DEV_OFFLINE_DUMMY_KEY,
        forwarderAddress: CONFIG.FORWARDER_ADDRESS,
        chainId: CONFIG.CHAIN_ID
      });
      throw new Error(`Failed to sign request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const createRelayPayloadHelper = useCallback((request: any, signature: string) => {
    // For demo mode, create a mock payload
    const forwarderAddress = (!CONFIG.FORWARDER_ADDRESS || CONFIG.FORWARDER_ADDRESS === '0x0000000000000000000000000000000000000000') 
      ? '0x1111111111111111111111111111111111111111' 
      : CONFIG.FORWARDER_ADDRESS;
    
    return {
      request,
      chainId: CONFIG.CHAIN_ID,
      forwarder: forwarderAddress,
      signature,
    };
  }, []);

  const estimateGas = useCallback(async (request: any): Promise<string> => {
    try {
      // Return fixed gas limit for simplicity
      // In production, you might want to estimate gas more accurately
      return CONFIG.DEFAULT_GAS_LIMIT.toString();
    } catch (error) {
      console.error('Error estimating gas:', error);
      return CONFIG.DEFAULT_GAS_LIMIT.toString();
    }
  }, []);

  return {
    buildRequest,
    signRequest,
    createRelayPayload: createRelayPayloadHelper,
    estimateGas,
    getNonce,
  };
}
