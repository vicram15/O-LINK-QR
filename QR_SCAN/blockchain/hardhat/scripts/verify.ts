import { run } from "hardhat";

async function main() {
  console.log("Verifying contracts...");

  // Read addresses from the generated file
  const addressesPath = path.join(__dirname, "../../src/chain/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

  try {
    // Verify AppForwarder
    console.log("Verifying AppForwarder...");
    await run("verify:verify", {
      address: addresses.forwarder,
      constructorArguments: [],
    });
    console.log("AppForwarder verified successfully");
  } catch (error) {
    console.log("AppForwarder verification failed:", error);
  }

  try {
    // Verify Recipient
    console.log("Verifying Recipient...");
    await run("verify:verify", {
      address: addresses.recipient,
      constructorArguments: [addresses.forwarder],
    });
    console.log("Recipient verified successfully");
  } catch (error) {
    console.log("Recipient verification failed:", error);
  }

  console.log("Verification completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

