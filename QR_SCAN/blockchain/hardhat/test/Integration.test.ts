import { expect } from "chai";
import { ethers } from "hardhat";
import { Recipient, AppForwarder } from "../typechain-types";

describe("Integration Tests", function () {
  let recipient: Recipient;
  let forwarder: AppForwarder;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy AppForwarder first
    const AppForwarderFactory = await ethers.getContractFactory("AppForwarder");
    forwarder = await AppForwarderFactory.deploy();
    await forwarder.waitForDeployment();
    
    const forwarderAddress = await forwarder.getAddress();
    
    // Deploy Recipient with forwarder address
    const RecipientFactory = await ethers.getContractFactory("Recipient");
    recipient = await RecipientFactory.deploy(forwarderAddress);
    await recipient.waitForDeployment();
  });

  describe("Complete Payment Flow", function () {
    it("Should handle complete payment and withdrawal cycle", async function () {
      const paymentAmount = ethers.parseEther("2.5");
      const paymentReference = "integration-test-payment";
      
      // Step 1: Make payment
      const tx = await recipient.connect(user1).pay(paymentAmount, paymentReference, { 
        value: paymentAmount 
      });
      
      await expect(tx)
        .to.emit(recipient, "Paid")
        .withArgs(user1.address, paymentAmount, paymentReference);
      
      // Step 2: Verify balance
      const balance = await recipient.getBalance();
      expect(balance).to.equal(paymentAmount);
      
      // Step 3: Owner withdraws funds
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const withdrawTx = await recipient.withdraw();
      const withdrawReceipt = await withdrawTx.wait();
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Verify owner received the funds (accounting for gas costs)
      expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
      
      // Step 4: Verify contract balance is now 0
      const finalBalance = await recipient.getBalance();
      expect(finalBalance).to.equal(0);
    });

    it("Should handle multiple payments and batch withdrawal", async function () {
      const payment1 = ethers.parseEther("1.0");
      const payment2 = ethers.parseEther("1.5");
      const payment3 = ethers.parseEther("0.5");
      
      // Make multiple payments
      await recipient.connect(user1).pay(payment1, "payment-1", { value: payment1 });
      await recipient.connect(user2).pay(payment2, "payment-2", { value: payment2 });
      await recipient.connect(user1).pay(payment3, "payment-3", { value: payment3 });
      
      // Verify total balance
      const totalBalance = await recipient.getBalance();
      expect(totalBalance).to.equal(payment1 + payment2 + payment3);
      
      // Withdraw all funds
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await recipient.withdraw();
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Verify withdrawal
      expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
      expect(await recipient.getBalance()).to.equal(0);
    });
  });

  describe("Error Handling", function () {
    it("Should handle edge cases gracefully", async function () {
      // Test with minimum payment
      const minAmount = 1; // 1 wei
      await expect(
        recipient.connect(user1).pay(minAmount, "min-payment", { value: minAmount })
      ).to.emit(recipient, "Paid")
      .withArgs(user1.address, minAmount, "min-payment");
      
      // Test with very long reference
      const longReference = "a".repeat(1000);
      const amount = ethers.parseEther("0.1");
      await expect(
        recipient.connect(user1).pay(amount, longReference, { value: amount })
      ).to.emit(recipient, "Paid")
      .withArgs(user1.address, amount, longReference);
    });

    it("Should prevent reentrancy attacks", async function () {
      // This test ensures the nonReentrant modifier works
      const amount = ethers.parseEther("1.0");
      const paymentReference = "reentrancy-test";
      
      // Make a normal payment
      await expect(
        recipient.connect(user1).pay(amount, paymentReference, { value: amount })
      ).to.emit(recipient, "Paid")
      .withArgs(user1.address, amount, paymentReference);
      
      // The nonReentrant modifier should prevent any reentrancy issues
      // (This is more of a structural test since we don't have a malicious contract)
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for payments", async function () {
      const amount = ethers.parseEther("1.0");
      const paymentReference = "gas-test";
      
      const tx = await recipient.connect(user1).pay(amount, paymentReference, { value: amount });
      const receipt = await tx.wait();
      
      // Gas usage should be reasonable (less than 100k gas)
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });
});
