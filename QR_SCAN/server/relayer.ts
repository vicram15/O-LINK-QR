import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ethers } from 'ethers';
import { z } from 'zod';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
const RELAYER_PK = process.env.RELAYER_PK;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '80002');
const RELAY_HMAC_SECRET = process.env.RELAY_HMAC_SECRET;
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];

if (!RELAYER_PK) {
  console.error('RELAYER_PK environment variable is required');
  process.exit(1);
}

if (!RELAY_HMAC_SECRET) {
  console.error('RELAY_HMAC_SECRET environment variable is required');
  process.exit(1);
}

// Load contract addresses
let FORWARDER_ADDRESS: string;
let RECIPIENT_ADDRESS: string;

try {
  const addressesPath = path.join(__dirname, '../src/chain/addresses.json');
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  FORWARDER_ADDRESS = addresses.forwarder;
  RECIPIENT_ADDRESS = addresses.recipient;
} catch (error) {
  console.error('Failed to load contract addresses:', error);
  process.exit(1);
}

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RELAYER_PK, provider);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// CORS configuration
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));

app.use(limiter);
app.use(express.json({ limit: '10mb' }));

// Request validation schemas
const ForwardRequestSchema = z.object({
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid from address'),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid to address'),
  value: z.string().regex(/^\d+$/, 'Invalid value'),
  gas: z.string().regex(/^\d+$/, 'Invalid gas'),
  nonce: z.string().regex(/^\d+$/, 'Invalid nonce'),
  deadline: z.string().regex(/^\d+$/, 'Invalid deadline'),
  data: z.string().regex(/^0x[a-fA-F0-9]*$/, 'Invalid data'),
});

const RelayRequestSchema = z.object({
  request: ForwardRequestSchema,
  chainId: z.number().int().positive(),
  forwarder: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid forwarder address'),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature'),
});

// HMAC verification middleware
const verifyHMAC = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const signature = req.headers['x-relay-auth'] as string;
  const body = JSON.stringify(req.body);
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing x-relay-auth header' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', RELAY_HMAC_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid authentication signature' });
  }

  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    chainId: CHAIN_ID,
    forwarder: FORWARDER_ADDRESS,
    recipient: RECIPIENT_ADDRESS,
    timestamp: new Date().toISOString()
  });
});

// Main relay endpoint
app.post('/api/relay', verifyHMAC, async (req, res) => {
  try {
    // Validate request body
    const { request, chainId, forwarder, signature } = RelayRequestSchema.parse(req.body);

    // Verify chain ID
    if (chainId !== CHAIN_ID) {
      return res.status(400).json({ 
        error: 'Invalid chain ID', 
        expected: CHAIN_ID, 
        received: chainId 
      });
    }

    // Verify forwarder address
    if (forwarder.toLowerCase() !== FORWARDER_ADDRESS.toLowerCase()) {
      return res.status(400).json({ 
        error: 'Invalid forwarder address', 
        expected: FORWARDER_ADDRESS, 
        received: forwarder 
      });
    }

    // Check deadline
    const now = Math.floor(Date.now() / 1000);
    const deadline = parseInt(request.deadline);
    
    if (deadline < now) {
      return res.status(400).json({ 
        error: 'Request expired', 
        deadline, 
        currentTime: now 
      });
    }

    // Get forwarder contract
    const forwarderContract = new ethers.Contract(
      FORWARDER_ADDRESS,
      [
        'function getNonce(address from) view returns (uint256)',
        'function verify((address from, address to, uint256 value, uint256 gas, uint256 nonce, uint256 deadline, bytes data), bytes signature) view returns (bool)',
        'function execute((address from, address to, uint256 value, uint256 gas, uint256 nonce, uint256 deadline, bytes data), bytes signature) payable returns (bool, bytes)'
      ],
      wallet
    );

    // Check nonce
    const currentNonce = await forwarderContract.getNonce(request.from);
    const requestNonce = BigInt(request.nonce);
    
    if (currentNonce !== requestNonce) {
      return res.status(400).json({ 
        error: 'Invalid nonce', 
        expected: currentNonce.toString(), 
        received: request.nonce 
      });
    }

    // Verify signature
    const isValidSignature = await forwarderContract.verify(request, signature);
    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Execute the meta-transaction
    const tx = await forwarderContract.execute(request, signature, {
      value: request.value,
      gasLimit: request.gas,
    });

    const receipt = await tx.wait();
    
    if (!receipt) {
      return res.status(500).json({ error: 'Transaction failed' });
    }

    // Log successful transaction (redact sensitive data)
    console.log(`Transaction successful: ${receipt.hash}`, {
      from: request.from,
      to: request.to,
      value: request.value,
      gasUsed: receipt.gasUsed?.toString(),
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString(),
    });

    res.json({ 
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
    });

  } catch (error) {
    console.error('Relay error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request format', 
        details: error.errors 
      });
    }

    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Relayer server running on port ${PORT}`);
  console.log(`Chain ID: ${CHAIN_ID}`);
  console.log(`Forwarder: ${FORWARDER_ADDRESS}`);
  console.log(`Recipient: ${RECIPIENT_ADDRESS}`);
  console.log(`CORS origins: ${CORS_ORIGINS.join(', ')}`);
});

export default app;

