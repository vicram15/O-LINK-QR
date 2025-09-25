import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Contract Deployment Demo");
  console.log("==========================");

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`\n📡 Network: ${network.name}`);
  console.log(`🔗 Chain ID: ${chainId}`);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer Address: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.log("\n❌ Account has no balance!");
    console.log("\n📋 To deploy to testnet, you need to:");
    console.log("1. Get testnet funds from a faucet");
    console.log("2. Set your private key in environment variables");
    console.log("3. Run the deployment command");
    
    if (chainId === 80002) {
      console.log("\n🔗 Amoy Testnet Faucet:");
      console.log("https://faucet.polygon.technology/");
      console.log("Select 'Amoy Testnet' and enter your address");
    } else if (chainId === 137) {
      console.log("\n🔗 You need real MATIC tokens for Polygon mainnet");
      console.log("Get MATIC from exchanges like Coinbase, Binance, etc.");
    }
    
    console.log("\n📝 Example deployment command:");
    console.log("PRIVATE_KEY=your_private_key npm run deploy:amoy");
    return;
  }

  console.log("\n✅ Account has sufficient balance for deployment");
  console.log("\n📦 Deploying contracts...");

  try {
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

  } catch (error) {
    console.log("\n❌ Deployment failed:");
    console.log(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
