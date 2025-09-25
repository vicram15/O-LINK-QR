# Blockchain Profile Setup Guide

## 🚀 **Quick Start (Development Mode)**

The profile feature works out-of-the-box in development mode with mock data. No configuration needed!

1. **Click "Web3 Profile"** button in the header
2. **Choose "Off-chain (DID + IPFS)"** mode
3. **Fill in your profile** and click "Create Profile"
4. **See success message** with mock CID and DID

## 🔧 **Production Setup**

### 1. **Deploy Smart Contracts**

```bash
# Deploy to Amoy testnet
npm run deploy:contracts:amoy

# Or deploy to local network
npm run deploy:contracts
```

This will create `src/chain/addresses.json` with contract addresses.

### 2. **Configure IPFS Storage**

Choose one of these options:

#### Option A: Pinata (Recommended)
1. Sign up at [pinata.cloud](https://pinata.cloud)
2. Get your API keys from the dashboard
3. Add to your `.env` file:

```env
VITE_PINATA_API_KEY=your_pinata_api_key_here
VITE_PINATA_SECRET_KEY=your_pinata_secret_key_here
```

#### Option B: Web3.Storage
1. Sign up at [web3.storage](https://web3.storage)
2. Get your API token from the dashboard
3. Add to your `.env` file:

```env
VITE_WEB3_STORAGE_TOKEN=your_web3_storage_token_here
```

### 3. **Configure Blockchain**

Update your `.env` file with the deployed contract addresses:

```env
# Chain Configuration
VITE_CHAIN_ID=80002
VITE_FORWARDER_ADDRESS=0x... # From addresses.json
VITE_RECIPIENT_ADDRESS=0x... # From addresses.json
VITE_PROFILE_SBT_ADDRESS=0x... # From addresses.json

# Block Explorer
VITE_BLOCK_EXPLORER_TX_URL=https://amoy.polygonscan.com/tx/
```

### 4. **Start Profile Relayer (Optional)**

For gasless transactions:

```bash
# Development
npm run dev:profile-relayer

# Production
npm run start:profile-relayer
```

## 📋 **Complete Environment Variables**

Create a `.env` file in your project root:

```env
# Blockchain Profile Feature - Environment Variables

# Chain Configuration
VITE_CHAIN_ID=80002
VITE_FORWARDER_ADDRESS=0x0000000000000000000000000000000000000000
VITE_RECIPIENT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_PROFILE_SBT_ADDRESS=0x0000000000000000000000000000000000000000

# Relayer API
VITE_RELAYER_API_BASE=http://localhost:3002

# Block Explorer
VITE_BLOCK_EXPLORER_TX_URL=https://amoy.polygonscan.com/tx/

# IPFS Configuration (Choose one)
# Option 1: Pinata (Recommended)
VITE_PINATA_API_KEY=your_pinata_api_key_here
VITE_PINATA_SECRET_KEY=your_pinata_secret_key_here

# Option 2: Web3.Storage (Alternative)
VITE_WEB3_STORAGE_TOKEN=your_web3_storage_token_here

# IPFS Gateway
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/

# Feature Flags
VITE_ENABLE_GASLESS=true

# Development (Optional)
VITE_DEV_OFFLINE_DUMMY_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Security
VITE_RELAY_HMAC_PUBLIC_HINT=Contact admin for relay authentication
```

## 🧪 **Testing the Feature**

### Development Mode (No Configuration)
1. Click "Web3 Profile" button
2. Select "Off-chain (DID + IPFS)" tab
3. Fill in profile information
4. Click "Create Profile"
5. Should see success with mock CID

### Production Mode (With Configuration)
1. Deploy contracts and configure environment
2. Click "Web3 Profile" button
3. Select either mode:
   - **Off-chain**: Uses IPFS + DID
   - **On-chain**: Uses blockchain SBT
4. Fill in profile information
5. Click "Create Profile"
6. Should see success with real CID/txHash

## 🔍 **Troubleshooting**

### "IPFS upload failed: KEYS_MUST_BE_STRINGS"
- **Solution**: Configure IPFS API keys in `.env` file
- **Development**: Feature works with mock CIDs without configuration

### "ProfileSBT contract not deployed"
- **Solution**: Run `npm run deploy:contracts` first
- **Development**: On-chain mode shows warning but still works

### "No wallet connected"
- **Solution**: Connect your wallet in the browser
- **Development**: Uses dummy key for signing

### "Invalid private key"
- **Solution**: Check `VITE_DEV_OFFLINE_DUMMY_KEY` format
- **Development**: Uses default test key

## 📚 **API Reference**

### IPFS Functions
- `putProfile(profile)` - Upload profile to IPFS
- `getProfile(cid)` - Fetch profile from IPFS
- `putAvatar(file)` - Upload avatar image
- `getIpfsUrl(cid)` - Get IPFS gateway URL

### DID Functions
- `createDid(address, chainId)` - Create DID string
- `createProfileCredential(did, cid, signer)` - Sign profile credential
- `storeProfileLocally(cid, jwt, did)` - Store locally
- `loadProfileLocally()` - Load from local storage

### Blockchain Functions
- `createOrUpdateProfile(signer, owner, cid, name)` - Create on-chain profile
- `getProfileData(provider, owner)` - Fetch on-chain profile
- `hasProfile(provider, owner)` - Check if profile exists

## 🎯 **Next Steps**

1. **Test in development mode** - No configuration needed
2. **Deploy contracts** - For on-chain functionality
3. **Configure IPFS** - For real data storage
4. **Set up relayer** - For gasless transactions
5. **Customize UI** - Match your brand

The feature is designed to work seamlessly in both development and production environments!


