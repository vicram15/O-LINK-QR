import { Invoice } from './schema';
import { CONFIG } from '../../config';

// Pinata API configuration
const PINATA_API_BASE = 'https://api.pinata.cloud';
const PINATA_PIN_JSON_URL = `${PINATA_API_BASE}/pinning/pinJSONToIPFS`;
const PINATA_PINS_URL = `${PINATA_API_BASE}/data/pinList`;
const PINATA_UNPIN_URL = `${PINATA_API_BASE}/pinning/unpin`;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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

// Upload invoice to IPFS via Pinata
export async function uploadInvoiceToPinata(invoice: Invoice): Promise<string> {
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
        pinataContent: invoice,
        pinataMetadata: {
          name: `invoice-${invoice.invoiceNumber}-${invoice.issueDate}`,
          keyvalues: {
            type: 'invoice',
            invoiceId: invoice.invoiceId,
            transactionId: invoice.transactionId,
            issuerWallet: invoice.issuer.wallet,
            recipientWallet: invoice.recipient.wallet,
            total: invoice.total.toString(),
            paymentStatus: invoice.paymentStatus,
            chainId: invoice.chainId.toString(),
            network: invoice.network,
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
      let errorMessage = `Invoice upload failed (${response.status})`;
      
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

// Get invoice from IPFS
export async function getInvoiceFromIPFS(cid: string): Promise<Invoice> {
  try {
    const response = await fetch(`${CONFIG.IPFS_GATEWAY}${cid}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch invoice from IPFS: ${response.statusText}`);
    }

    const invoice = await response.json();
    return invoice;
  } catch (error) {
    console.error('IPFS fetch error:', error);
    throw new Error(`Failed to fetch invoice from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get IPFS URL for a CID
export function getInvoiceIPFSUrl(cid: string): string {
  return `${CONFIG.IPFS_GATEWAY}${cid}`;
}

// Check if invoice is pinned
export async function isInvoicePinned(cid: string): Promise<boolean> {
  const apiKey = CONFIG.PINATA_API_KEY;
  const secretKey = CONFIG.PINATA_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    return false;
  }

  try {
    const response = await fetch(`${PINATA_PINS_URL}?hashContains=${cid}`, {
      method: 'GET',
      headers: getPinataHeaders(),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const pin = data.rows?.find((p: any) => p.ipfs_pin_hash === cid);
    
    return !!pin;
  } catch (error) {
    console.error('Error checking pinning status:', error);
    return false;
  }
}

// Get all invoices for a wallet
export async function getInvoicesForWallet(walletAddress: string): Promise<Array<{
  cid: string;
  invoice: Invoice;
  pinDate: string;
}>> {
  const apiKey = CONFIG.PINATA_API_KEY;
  const secretKey = CONFIG.PINATA_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    return [];
  }

  try {
    // Search for invoices by issuer or recipient wallet
    const issuerQuery = `metadata[keyvalues][issuerWallet]={"value":"${walletAddress}","op":"eq"}`;
    const recipientQuery = `metadata[keyvalues][recipientWallet]={"value":"${walletAddress}","op":"eq"}`;
    const typeQuery = `metadata[keyvalues][type]={"value":"invoice","op":"eq"}`;
    
    const response = await fetch(`${PINATA_PINS_URL}?${issuerQuery}&${typeQuery}`, {
      method: 'GET',
      headers: getPinataHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get invoices: ${response.statusText}`);
    }

    const data = await response.json();
    const invoices = [];
    
    for (const pin of data.rows || []) {
      try {
        const invoice = await getInvoiceFromIPFS(pin.ipfs_pin_hash);
        invoices.push({
          cid: pin.ipfs_pin_hash,
          invoice,
          pinDate: pin.date_pinned,
        });
      } catch (error) {
        console.warn(`Failed to load invoice ${pin.ipfs_pin_hash}:`, error);
      }
    }
    
    return invoices;
  } catch (error) {
    console.error('Error getting invoices for wallet:', error);
    return [];
  }
}

// Update invoice in Pinata
export async function updateInvoiceInPinata(invoice: Invoice, oldCid?: string): Promise<string> {
  // Upload new version
  const newCid = await uploadInvoiceToPinata(invoice);
  
  // Unpin old version if provided
  if (oldCid) {
    try {
      await unpinInvoiceFromPinata(oldCid);
    } catch (error) {
      console.warn('Failed to unpin old invoice version:', error);
      // Don't fail the update if unpinning fails
    }
  }
  
  return newCid;
}

// Unpin invoice from Pinata
export async function unpinInvoiceFromPinata(cid: string): Promise<boolean> {
  const apiKey = CONFIG.PINATA_API_KEY;
  const secretKey = CONFIG.PINATA_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    return false;
  }

  try {
    const response = await fetch(`${PINATA_UNPIN_URL}/${cid}`, {
      method: 'DELETE',
      headers: getPinataHeaders(),
    });

    return response.ok;
  } catch (error) {
    console.error('Error unpinning invoice from Pinata:', error);
    return false;
  }
}

// Verify invoice integrity
export async function verifyInvoiceIntegrity(cid: string): Promise<{
  isPinned: boolean;
  isAccessible: boolean;
  pinDate?: string;
}> {
  const isPinned = await isInvoicePinned(cid);
  
  let isAccessible = false;
  try {
    const response = await fetch(getInvoiceIPFSUrl(cid));
    isAccessible = response.ok;
  } catch {
    isAccessible = false;
  }
  
  return {
    isPinned,
    isAccessible,
  };
}

// Search invoices by criteria
export async function searchInvoices(criteria: {
  issuerWallet?: string;
  recipientWallet?: string;
  paymentStatus?: string;
  dateFrom?: number;
  dateTo?: number;
  minAmount?: number;
  maxAmount?: number;
}): Promise<Array<{
  cid: string;
  invoice: Invoice;
  pinDate: string;
}>> {
  const apiKey = CONFIG.PINATA_API_KEY;
  const secretKey = CONFIG.PINATA_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    return [];
  }

  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('metadata[keyvalues][type]', '{"value":"invoice","op":"eq"}');
    
    if (criteria.issuerWallet) {
      queryParams.append('metadata[keyvalues][issuerWallet]', `{"value":"${criteria.issuerWallet}","op":"eq"}`);
    }
    
    if (criteria.recipientWallet) {
      queryParams.append('metadata[keyvalues][recipientWallet]', `{"value":"${criteria.recipientWallet}","op":"eq"}`);
    }
    
    if (criteria.paymentStatus) {
      queryParams.append('metadata[keyvalues][paymentStatus]', `{"value":"${criteria.paymentStatus}","op":"eq"}`);
    }

    const response = await fetch(`${PINATA_PINS_URL}?${queryParams.toString()}`, {
      method: 'GET',
      headers: getPinataHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to search invoices: ${response.statusText}`);
    }

    const data = await response.json();
    const invoices = [];
    
    for (const pin of data.rows || []) {
      try {
        const invoice = await getInvoiceFromIPFS(pin.ipfs_pin_hash);
        
        // Apply additional filters
        if (criteria.dateFrom && invoice.issueDate < criteria.dateFrom) continue;
        if (criteria.dateTo && invoice.issueDate > criteria.dateTo) continue;
        if (criteria.minAmount && invoice.total < criteria.minAmount) continue;
        if (criteria.maxAmount && invoice.total > criteria.maxAmount) continue;
        
        invoices.push({
          cid: pin.ipfs_pin_hash,
          invoice,
          pinDate: pin.date_pinned,
        });
      } catch (error) {
        console.warn(`Failed to load invoice ${pin.ipfs_pin_hash}:`, error);
      }
    }
    
    return invoices;
  } catch (error) {
    console.error('Error searching invoices:', error);
    return [];
  }
}
