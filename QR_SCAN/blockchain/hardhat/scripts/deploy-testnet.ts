import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting testnet deployment...");

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`Deploying to network: ${network.name} (Chain ID: ${chainId})`);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.log("❌ Account has no balance. Please fund the account before deploying.");
    return;
  }

  // Deploy AppForwarder
  console.log("\n📦 Deploying AppForwarder...");
  const AppForwarder = await ethers.getContractFactory("AppForwarder");
  const forwarder = await AppForwarder.deploy();
  await forwarder.waitForDeployment();
  
  const forwarderAddress = await forwarder.getAddress();
  console.log("✅ AppForwarder deployed to:", forwarderAddress);

  // Deploy Recipient
  console.log("\n📦 Deploying Recipient...");
  const Recipient = await ethers.getContractFactory("Recipient");
  const recipient = await Recipient.deploy(forwarderAddress);
  await recipient.waitForDeployment();
  
  const recipientAddress = await recipient.getAddress();
  console.log("✅ Recipient deployed to:", recipientAddress);

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  try {
    // Test payment
    const testAmount = ethers.parseEther("0.001"); // Small amount for testnet
    const testReference = "testnet-payment";
    
    console.log("Making test payment...");
    const tx = await recipient.pay(testAmount, testReference, { value: testAmount });
    const receipt = await tx.wait();
    console.log("✅ Test payment successful! Gas used:", receipt?.gasUsed?.toString());
    
    // Check balance
    const balance = await recipient.getBalance();
    console.log("Contract balance:", ethers.formatEther(balance), "ETH");
    
    // Test withdrawal
    console.log("Testing withdrawal...");
    const withdrawTx = await recipient.withdraw();
    const withdrawReceipt = await withdrawTx.wait();
    console.log("✅ Withdrawal successful! Gas used:", withdrawReceipt?.gasUsed?.toString());
    
    // Final balance
    const finalBalance = await recipient.getBalance();
    console.log("Final contract balance:", ethers.formatEther(finalBalance), "ETH");
  } catch (error) {
    console.log("⚠️ Test functionality failed:", error);
  }

  // Create addresses.json
  const addresses = {
    chainId,
    forwarder: forwarderAddress,
    recipient: recipientAddress,
    deployedAt: new Date().toISOString(),
    network: network.name,
  };

  // Write addresses.json
  const addressesPath = path.resolve(__dirname, "../../src/chain/addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses written to:", addressesPath);

  // Copy ABI files
  const artifactsDir = path.resolve(__dirname, "../artifacts/contracts");
  const abiDir = path.resolve(__dirname, "../../src/chain/abi");
  
  // Ensure ABI directory exists
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  // Copy Recipient ABI
  const recipientArtifact = JSON.parse(
    fs.readFileSync(
      path.resolve(artifactsDir, "Recipient.sol/Recipient.json"),
      "utf8"
    )
  );
  fs.writeFileSync(
    path.resolve(abiDir, "Recipient.json"),
    JSON.stringify(recipientArtifact.abi, null, 2)
  );
  console.log("Recipient ABI copied to:", path.resolve(abiDir, "Recipient.json"));

  // Copy AppForwarder ABI
  const forwarderArtifact = JSON.parse(
    fs.readFileSync(
      path.resolve(artifactsDir, "AppForwarder.sol/AppForwarder.json"),
      "utf8"
    )
  );
  fs.writeFileSync(
    path.resolve(abiDir, "AppForwarder.json"),
    JSON.stringify(forwarderArtifact.abi, null, 2)
  );
  console.log("AppForwarder ABI copied to:", path.resolve(abiDir, "AppForwarder.json"));

  console.log("\n🎉 Deployment completed successfully!");
  console.log("Network:", network.name, "(Chain ID:", chainId, ")");
  console.log("Forwarder:", forwarderAddress);
  console.log("Recipient:", recipientAddress);
  
  if (chainId === 80002) {
    console.log("\n🔗 Amoy Testnet Explorer:");
    console.log(`https://amoy.polygonscan.com/address/${recipientAddress}`);
  } else if (chainId === 137) {
    console.log("\n🔗 Polygon Explorer:");
    console.log(`https://polygonscan.com/address/${recipientAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
