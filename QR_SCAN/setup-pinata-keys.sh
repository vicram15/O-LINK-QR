#!/bin/bash

# Pinata API Keys Setup Script
# This script creates the .env file with your Pinata API keys

echo "🔧 Setting up Pinata API keys..."

# Create .env file with Pinata keys
cat > .env << 'EOF'
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

# IPFS Configuration - Pinata
VITE_PINATA_API_KEY=8df718dd58ed0c2c5a83
VITE_PINATA_SECRET_KEY=_Y-iu0IhEFM26WWYhWq2yaWVjofRDI8Q3V-JweyGWiRqe8g_N-X4iGcUSYh3uxKt

# IPFS Gateway
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/

# Feature Flags
VITE_ENABLE_GASLESS=true

# Development (Optional)
VITE_DEV_OFFLINE_DUMMY_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Security
VITE_RELAY_HMAC_PUBLIC_HINT=Contact admin for relay authentication
EOF

echo "✅ .env file created successfully!"
echo "🚀 Your Pinata API keys are now configured:"
echo "   - API Key: 8df718dd58ed0c2c5a83"
echo "   - Secret Key: _Y-iu0IhEFM26WWYhWq2yaWVjofRDI8Q3V-JweyGWiRqe8g_N-X4iGcUSYh3uxKt"
echo ""
echo "📝 Next steps:"
echo "   1. Restart your development server: npm run dev"
echo "   2. Test the profile feature in the app"
echo "   3. Check the console for 'Pinata configured' status"
echo ""
echo "🎉 Pinata integration is ready to use!"
