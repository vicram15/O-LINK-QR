import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy AppForwarder
  console.log("Deploying AppForwarder...");
  const AppForwarder = await ethers.getContractFactory("AppForwarder");
  const forwarder = await AppForwarder.deploy();
  await forwarder.waitForDeployment();
  
  const forwarderAddress = await forwarder.getAddress();
  console.log("AppForwarder deployed to:", forwarderAddress);

  // Deploy Recipient
  console.log("Deploying Recipient...");
  const Recipient = await ethers.getContractFactory("Recipient");
  const recipient = await Recipient.deploy(forwarderAddress);
  await recipient.waitForDeployment();
  
  const recipientAddress = await recipient.getAddress();
  console.log("Recipient deployed to:", recipientAddress);

  // Deploy ProfileSBT
  console.log("Deploying ProfileSBT...");
  const ProfileSBT = await ethers.getContractFactory("ProfileSBT");
  const profileSBT = await ProfileSBT.deploy(forwarderAddress);
  await profileSBT.waitForDeployment();
  
  const profileSBTAddress = await profileSBT.getAddress();
  console.log("ProfileSBT deployed to:", profileSBTAddress);

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Create addresses.json
  const addresses = {
    chainId,
    forwarder: forwarderAddress,
    recipient: recipientAddress,
    profileSBT: profileSBTAddress,
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
  fs.writeFileSync(
    path.join(chainDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("Addresses written to:", path.join(chainDir, "addresses.json"));

  // Copy ABIs
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");

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

  // Copy ProfileSBT ABI
  const profileSBTArtifact = JSON.parse(
    fs.readFileSync(
      path.join(artifactsDir, "ProfileSBT.sol/ProfileSBT.json"),
      "utf8"
    )
  );
  fs.writeFileSync(
    path.join(abiDir, "ProfileSBT.json"),
    JSON.stringify(profileSBTArtifact.abi, null, 2)
  );
  console.log("ProfileSBT ABI copied to:", path.join(abiDir, "ProfileSBT.json"));

  console.log("\nDeployment completed successfully!");
  console.log("Network:", network.name, "(Chain ID:", chainId, ")");
  console.log("Forwarder:", forwarderAddress);
  console.log("Recipient:", recipientAddress);
  console.log("ProfileSBT:", profileSBTAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
