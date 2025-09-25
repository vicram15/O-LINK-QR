// Deployment configuration for testnet and mainnet
module.exports = {
  // Amoy Testnet Configuration
  amoy: {
    rpcUrl: "https://rpc-amoy.polygon.technology",
    chainId: 80002,
    // Use a test private key (DO NOT USE IN PRODUCTION)
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  },
  
  // Polygon Mainnet Configuration
  polygon: {
    rpcUrl: "https://polygon-rpc.com",
    chainId: 137,
    // You need to provide your actual private key for mainnet
    privateKey: process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  }
};
