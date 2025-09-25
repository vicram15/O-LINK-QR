# Offline Pay via QR (Meta-Tx) Setup Guide

This guide will help you set up the offline QR payment feature in your existing website.

## Overview

The offline pay feature allows users to:
1. Generate QR codes for payments while offline
2. Scan QR codes with any online device to process payments on the blockchain
3. Use meta-transactions for gasless transactions

## Prerequisites

- Node.js 18+ and npm/yarn
- A blockchain RPC endpoint (Polygon Amoy testnet recommended)
- A private key for the relayer
- Basic understanding of smart contracts

## Setup Steps

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install

# Install Hardhat dependencies
cd ../blockchain/hardhat && npm install
```

### 2. Deploy Smart Contracts

```bash
# Set up environment variables
cp .env.example .env

# Edit .env with your values:
# - PRIVATE_KEY: Your wallet private key
# - POLYGONSCAN_API_KEY: For contract verification (optional)

# Deploy to Amoy testnet
npm run deploy:contracts:amoy

# Or deploy to local hardhat network
npm run deploy:contracts
```

After deployment, update your `.env` file with the deployed contract addresses.

### 3. Configure Environment Variables

Create/update your `.env` file with the following variables:

```env
# Frontend Environment Variables
VITE_CHAIN_ID=80002
VITE_FORWARDER_ADDRESS=0x... # From deployment
VITE_RECIPIENT_ADDRESS=0x... # From deployment
VITE_RELAYER_API_BASE=http://localhost:3001
VITE_BLOCK_EXPLORER_TX_URL=https://amoy.polygonscan.com/tx/
VITE_RELAY_HMAC_PUBLIC_HINT=Contact admin for relay authentication
VITE_DEV_OFFLINE_DUMMY_KEY=0x... # For development mode only

# Server Environment Variables
RPC_URL=https://rpc-amoy.polygon.technology
RELAYER_PK=0x... # Your relayer private key
CHAIN_ID=80002
FORWARDER_ADDRESS=0x... # From deployment
RECIPIENT_ADDRESS=0x... # From deployment
RELAY_HMAC_SECRET=your-secret-key-here
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Start the Services

```bash
# Terminal 1: Start the relayer server
npm run dev:relayer

# Terminal 2: Start the frontend
npm run dev
```

### 5. Test the Flow

1. **Generate QR Code:**
   - Go to `/generate` page
   - Click "Pay Offline" button
   - Enter amount, reference, and deadline
   - Click "Generate QR Code"

2. **Scan QR Code:**
   - Go to `/relay-scan` page
   - Click "Start Scanning"
   - Scan the QR code with your camera
   - Click "Process Payment"

3. **Verify Transaction:**
   - Check the transaction hash on the block explorer
   - Verify the `Paid` event was emitted

## File Structure

```
├── blockchain/hardhat/          # Smart contracts and deployment
│   ├── contracts/
│   │   ├── AppForwarder.sol     # MinimalForwarder implementation
│   │   └── Recipient.sol        # Payment recipient contract
│   ├── scripts/
│   │   ├── deploy.ts            # Deployment script
│   │   └── verify.ts            # Verification script
│   └── hardhat.config.ts        # Hardhat configuration
├── server/                      # Relayer API server
│   ├── relayer.ts              # Express server
│   └── package.json            # Server dependencies
├── src/
│   ├── chain/                  # Blockchain utilities
│   │   ├── abi/               # Contract ABIs
│   │   ├── addresses.json     # Deployed addresses
│   │   └── forwarder.ts       # EIP-712 utilities
│   ├── modules/offlinePay/     # Offline payment components
│   │   ├── OfflinePayModal.tsx # QR generation modal
│   │   └── useOfflineMetaTx.ts # Meta-transaction hooks
│   ├── pages/
│   │   └── RelayScan.tsx       # QR scanning page
│   └── config.ts              # Configuration
└── .env                       # Environment variables
```

## Security Considerations

1. **Private Keys:** Never commit private keys to version control
2. **HMAC Secret:** Use a strong, random secret for HMAC authentication
3. **CORS:** Configure CORS origins to only allow your domains
4. **Rate Limiting:** The relayer includes rate limiting to prevent abuse
5. **Nonce Validation:** The relayer validates nonces to prevent replay attacks

## Development Mode

For development, you can use a dummy private key by setting `VITE_DEV_OFFLINE_DUMMY_KEY` in your environment variables. This allows testing without a real wallet connection.

## Production Deployment

1. Deploy contracts to mainnet
2. Set up a production relayer server
3. Configure proper CORS origins
4. Use strong HMAC secrets
5. Set up monitoring and logging

## Troubleshooting

### Common Issues

1. **"Configuration errors"**: Check that all required environment variables are set
2. **"Invalid nonce"**: The nonce might be out of sync, try refreshing
3. **"Request expired"**: The deadline has passed, generate a new QR code
4. **"Invalid signature"**: Check that the private key matches the address

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment.

## API Endpoints

### Relayer API

- `GET /health` - Health check
- `POST /api/relay` - Process meta-transaction

### Request Format

```json
{
  "request": {
    "from": "0x...",
    "to": "0x...",
    "value": "0",
    "gas": "200000",
    "nonce": "0",
    "deadline": "1234567890",
    "data": "0x..."
  },
  "chainId": 80002,
  "forwarder": "0x...",
  "signature": "0x..."
}
```

## Support

For issues or questions, please check the troubleshooting section or create an issue in the repository.

