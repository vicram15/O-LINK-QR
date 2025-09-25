import { ethers } from "hardhat";

async function main() {
  console.log("🚀 O'LINK Smart Contract Deployment");
  console.log("===================================");

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`\n📡 Target Network: ${network.name}`);
  console.log(`🔗 Chain ID: ${chainId}`);

  // Check if we have a private key configured
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.log("\n❌ No private key configured!");
    console.log("\n📋 To deploy to testnet/mainnet, you need to:");
    console.log("1. Set your private key as an environment variable");
    console.log("2. Ensure your account has sufficient balance");
    console.log("3. Run the deployment command");
    
    console.log("\n🔧 Setup Instructions:");
    console.log("=====================");
    
    if (chainId === 80002) {
      console.log("\n1️⃣ For Amoy Testnet:");
      console.log("   • Get testnet MATIC: https://faucet.polygon.technology/");
      console.log("   • Select 'Amoy Testnet' and enter your wallet address");
      console.log("   • Set private key: export PRIVATE_KEY=your_private_key");
      console.log("   • Deploy: npm run deploy:amoy");
    } else if (chainId === 137) {
      console.log("\n1️⃣ For Polygon Mainnet:");
      console.log("   • Get real MATIC tokens from exchanges");
      console.log("   • Set private key: export PRIVATE_KEY=your_private_key");
      console.log("   • Deploy: npm run deploy:polygon");
    }
    
    console.log("\n2️⃣ Alternative: Use Hardhat local network");
    console.log("   • Run: npm run deploy (uses local Hardhat network)");
    console.log("   • No private key needed, uses test accounts");
    
    console.log("\n3️⃣ Contract addresses will be saved to:");
    console.log("   • src/chain/addresses.json");
    console.log("   • src/chain/abi/ (ABI files)");
    
    return;
  }

  // Try to get the deployer account
  try {
    const [deployer] = await ethers.getSigners();
    console.log(`\n👤 Deployer Address: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Account Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.log("\n❌ Account has no balance!");
      console.log("\n📋 Please fund your account:");
      
      if (chainId === 80002) {
        console.log("🔗 Amoy Testnet Faucet: https://faucet.polygon.technology/");
        console.log("   Select 'Amoy Testnet' and enter your address");
      } else if (chainId === 137) {
        console.log("🔗 Get MATIC from exchanges like Coinbase, Binance, etc.");
      }
      
      return;
    }

    console.log("\n✅ Account has sufficient balance for deployment");
    console.log("\n📦 Deploying contracts...");

    // Deploy AppForwarder
    console.log("\n1️⃣ Deploying AppForwarder...");
    const AppForwarder = await ethers.getContractFactory("AppForwarder");
    const forwarder = await AppForwarder.deploy();
    await forwarder.waitForDeployment();
    
    const forwarderAddress = await forwarder.getAddress();
    console.log(`   ✅ AppForwarder: ${forwarderAddress}`);

    // Deploy Recipient
    console.log("\n2️⃣ Deploying Recipient...");
    const Recipient = await ethers.getContractFactory("Recipient");
    const recipient = await Recipient.deploy(forwarderAddress);
    await recipient.waitForDeployment();
    
    const recipientAddress = await recipient.getAddress();
    console.log(`   ✅ Recipient: ${recipientAddress}`);

    // Test functionality
    console.log("\n3️⃣ Testing functionality...");
    const testAmount = ethers.parseEther("0.001");
    const testReference = "deployment-test";
    
    const tx = await recipient.pay(testAmount, testReference, { value: testAmount });
    const receipt = await tx.wait();
    console.log(`   ✅ Test payment successful! Gas: ${receipt?.gasUsed?.toString()}`);

    // Show results
    console.log("\n🎉 Deployment Successful!");
    console.log("==========================");
    console.log(`Network: ${network.name} (${chainId})`);
    console.log(`Forwarder: ${forwarderAddress}`);
    console.log(`Recipient: ${recipientAddress}`);
    
    if (chainId === 80002) {
      console.log(`\n🔗 View on Amoy Explorer:`);
      console.log(`https://amoy.polygonscan.com/address/${recipientAddress}`);
    } else if (chainId === 137) {
      console.log(`\n🔗 View on Polygon Explorer:`);
      console.log(`https://polygonscan.com/address/${recipientAddress}`);
    }

    console.log("\n📝 Next Steps:");
    console.log("1. Contract addresses saved to src/chain/addresses.json");
    console.log("2. Contract ABIs saved to src/chain/abi/");
    console.log("3. Update frontend configuration if needed");
    console.log("4. Test the contracts on the blockchain explorer");

  } catch (error) {
    console.log("\n❌ Deployment failed:");
    console.log(error);
    
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check your private key is correct");
    console.log("2. Ensure your account has sufficient balance");
    console.log("3. Verify network connection");
    console.log("4. Try using a different RPC URL");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
