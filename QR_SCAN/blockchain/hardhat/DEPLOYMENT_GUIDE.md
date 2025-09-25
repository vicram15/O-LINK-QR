# Contract Deployment Guide

## Prerequisites

### 1. Get Testnet Funds

#### For Amoy Testnet (Polygon Testnet):
1. Visit [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Amoy Testnet"
3. Enter your wallet address
4. Request testnet MATIC tokens

#### For Polygon Mainnet:
1. You need real MATIC tokens
2. Ensure you have enough for gas fees (recommended: 0.1-0.5 MATIC)

### 2. Set Up Environment Variables

Create a `.env` file in the `blockchain/hardhat` directory:

```bash
# Private Key (replace with your actual private key)
PRIVATE_KEY=your_private_key_here

# RPC URLs (optional, defaults are provided)
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_RPC_URL=https://polygon-rpc.com

# Etherscan API Keys (optional, for contract verification)
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

## Deployment Commands

### Deploy to Amoy Testnet:
```bash
cd blockchain/hardhat
npm run deploy:amoy
```

### Deploy to Polygon Mainnet:
```bash
cd blockchain/hardhat
npm run deploy:polygon
```

### Deploy with Custom Script:
```bash
cd blockchain/hardhat
npx hardhat run scripts/deploy-testnet.ts --network amoy
npx hardhat run scripts/deploy-testnet.ts --network polygon
```

## Contract Addresses

After deployment, the addresses will be saved to:
- `src/chain/addresses.json` - Contract addresses
- `src/chain/abi/` - Contract ABIs

## Verification

### Verify on Etherscan:
```bash
# For Amoy
npm run verify:amoy

# For Polygon
npm run verify:polygon
```

## Network Information

### Amoy Testnet:
- Chain ID: 80002
- RPC URL: https://rpc-amoy.polygon.technology
- Explorer: https://amoy.polygonscan.com/

### Polygon Mainnet:
- Chain ID: 137
- RPC URL: https://polygon-rpc.com
- Explorer: https://polygonscan.com/

## Security Notes

⚠️ **IMPORTANT**: Never commit your private key to version control!
- Use environment variables
- Keep your private key secure
- Use a dedicated wallet for testing
- Never use your main wallet's private key for testing
