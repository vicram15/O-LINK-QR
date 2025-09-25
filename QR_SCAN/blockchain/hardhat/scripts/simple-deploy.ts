import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting simple deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

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
  
  // Test payment
  const testAmount = ethers.parseEther("0.1");
  const testReference = "test-payment";
  
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

  console.log("\n🎉 Deployment and testing completed successfully!");
  console.log("Network:", await ethers.provider.getNetwork());
  console.log("Forwarder:", forwarderAddress);
  console.log("Recipient:", recipientAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });