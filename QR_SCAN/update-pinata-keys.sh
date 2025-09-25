#!/bin/bash

# Script to update Pinata API keys
# Usage: ./update-pinata-keys.sh YOUR_SECRET_KEY

if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Pinata secret key"
    echo "Usage: ./update-pinata-keys.sh YOUR_SECRET_KEY"
    echo ""
    echo "Example:"
    echo "  ./update-pinata-keys.sh a1b2c3d4e5f6789012345678901234567890abcdef"
    exit 1
fi

SECRET_KEY="$1"
API_KEY="94ca5577e84404d7e697"

echo "🔧 Updating Pinata API keys..."

# Update config.ts
echo "📝 Updating src/config.ts..."
sed -i.bak "s/PINATA_SECRET_KEY: import.meta.env.VITE_PINATA_SECRET_KEY || '.*'/PINATA_SECRET_KEY: import.meta.env.VITE_PINATA_SECRET_KEY || '$SECRET_KEY'/" src/config.ts

# Update test script
echo "📝 Updating test-pinata-integration.js..."
sed -i.bak "s/const PINATA_SECRET_KEY = '.*'/const PINATA_SECRET_KEY = '$SECRET_KEY'/" test-pinata-integration.js

# Create .env file
echo "📝 Creating .env file..."
cat > .env << EOF
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
VITE_PINATA_API_KEY=$API_KEY
VITE_PINATA_SECRET_KEY=$SECRET_KEY

# IPFS Gateway
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/

# Feature Flags
VITE_ENABLE_GASLESS=true

# Development (Optional)
VITE_DEV_OFFLINE_DUMMY_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Security
VITE_RELAY_HMAC_PUBLIC_HINT=Contact admin for relay authentication
EOF

echo "✅ Keys updated successfully!"
echo ""
echo "🔑 Your Pinata configuration:"
echo "   - API Key: $API_KEY"
echo "   - Secret Key: $SECRET_KEY"
echo ""
echo "🧪 Testing the connection..."
node test-pinata-integration.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Pinata integration is working!"
    echo "🚀 You can now start your app with: npm run dev"
else
    echo ""
    echo "❌ Test failed. Please check your secret key."
    echo "📖 See PINATA_KEYS_SETUP.md for help getting the correct keys."
fi
