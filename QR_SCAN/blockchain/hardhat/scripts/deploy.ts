import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying contracts...");

  // Deploy AppForwarder
  const AppForwarder = await ethers.getContractFactory("AppForwarder");
  const forwarder = await AppForwarder.deploy();
  await forwarder.waitForDeployment();
  
  const forwarderAddress = await forwarder.getAddress();
  console.log("AppForwarder deployed to:", forwarderAddress);

  // Deploy Recipient
  const Recipient = await ethers.getContractFactory("Recipient");
  const recipient = await Recipient.deploy(forwarderAddress);
  await recipient.waitForDeployment();
  
  const recipientAddress = await recipient.getAddress();
  console.log("Recipient deployed to:", recipientAddress);


  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Create addresses.json
  const addresses = {
    chainId,
    forwarder: forwarderAddress,
    recipient: recipientAddress,
    deployedAt: new Date().toISOString(),
  };

  // Ensure directories exist
  const webDir = path.join(__dirname, "../../src");
  const chainDir = path.join(webDir, "chain");
  const abiDir = path.join(chainDir, "abi");
  
  if (!fs.existsSync(chainDir)) {
    fs.mkdirSync(chainDir, { recursive: true });
  }
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  // Write addresses.json
  const addressesPath = path.join(chainDir, "addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses written to:", addressesPath);

  // Copy ABI files
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  
  // Copy Recipient ABI
  const recipientArtifact = JSON.parse(
    fs.readFileSync(
      path.join(artifactsDir, "Recipient.sol/Recipient.json"),
      "utf8"
    )
  );
  fs.writeFileSync(
    path.join(abiDir, "Recipient.json"),
    JSON.stringify(recipientArtifact.abi, null, 2)
  );
  console.log("Recipient ABI copied to:", path.join(abiDir, "Recipient.json"));

  // Copy AppForwarder ABI
  const forwarderArtifact = JSON.parse(
    fs.readFileSync(
      path.join(artifactsDir, "AppForwarder.sol/AppForwarder.json"),
      "utf8"
    )
  );
  fs.writeFileSync(
    path.join(abiDir, "AppForwarder.json"),
    JSON.stringify(forwarderArtifact.abi, null, 2)
  );
  console.log("AppForwarder ABI copied to:", path.join(abiDir, "AppForwarder.json"));


  console.log("\nDeployment completed successfully!");
  console.log("Network:", network.name, "(Chain ID:", chainId, ")");
  console.log("Forwarder:", forwarderAddress);
  console.log("Recipient:", recipientAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
