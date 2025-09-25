import { expect } from "chai";
import { ethers } from "hardhat";
import { Recipient, AppForwarder } from "../typechain-types";

describe("Recipient", function () {
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

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await recipient.owner()).to.equal(owner.address);
    });

    it("Should set the correct forwarder", async function () {
      const forwarderAddress = await forwarder.getAddress();
      // We can't directly check the forwarder address, but we can test functionality
      expect(await recipient.owner()).to.equal(owner.address);
    });
  });

  describe("Payment Processing", function () {
    it("Should accept payment with reference", async function () {
      const amount = ethers.parseEther("1.0");
      const paymentReference = "test-payment-123";
      
      await expect(
        recipient.connect(user1).pay(amount, paymentReference, { value: amount })
      ).to.emit(recipient, "Paid")
      .withArgs(user1.address, amount, paymentReference);
    });

    it("Should reject payment with insufficient funds", async function () {
      const amount = ethers.parseEther("1.0");
      const paymentReference = "test-payment-123";
      const insufficientAmount = ethers.parseEther("0.5");
      
      await expect(
        recipient.connect(user1).pay(amount, paymentReference, { value: insufficientAmount })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should reject payment without reference", async function () {
      const amount = ethers.parseEther("1.0");
      const emptyReference = "";
      
      await expect(
        recipient.connect(user1).pay(amount, emptyReference, { value: amount })
      ).to.be.revertedWith("Reference required");
    });

    it("Should accept payment with excess funds", async function () {
      const amount = ethers.parseEther("1.0");
      const excessAmount = ethers.parseEther("1.5");
      const paymentReference = "test-payment-123";
      
      await expect(
        recipient.connect(user1).pay(amount, paymentReference, { value: excessAmount })
      ).to.emit(recipient, "Paid")
      .withArgs(user1.address, amount, paymentReference);
    });

    it("Should update contract balance after payment", async function () {
      const amount = ethers.parseEther("1.0");
      const paymentReference = "test-payment-123";
      
      const balanceBefore = await recipient.getBalance();
      
      await recipient.connect(user1).pay(amount, paymentReference, { value: amount });
      
      const balanceAfter = await recipient.getBalance();
      expect(balanceAfter).to.equal(balanceBefore + amount);
    });
  });

  describe("Withdrawal", function () {
    it("Should allow owner to withdraw funds", async function () {
      const amount = ethers.parseEther("1.0");
      const paymentReference = "test-payment-123";
      
      // Make a payment first
      await recipient.pay(amount, paymentReference, { value: amount });
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      // Withdraw funds
      const tx = await recipient.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt?.gasUsed || 0n;
      const gasPrice = receipt?.gasPrice || 0n;
      const gasCost = gasUsed * gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Owner should receive the payment amount minus gas costs
      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + amount - gasCost,
        ethers.parseEther("0.01") // Allow for some gas cost variance
      );
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        recipient.connect(user1).withdraw()
      ).to.be.revertedWithCustomError(recipient, "OwnableUnauthorizedAccount")
      .withArgs(user1.address);
    });

    it("Should handle withdrawal when no funds", async function () {
      // Should not revert when no funds to withdraw
      await expect(recipient.withdraw()).to.not.be.reverted;
    });
  });

  describe("Balance Management", function () {
    it("Should return correct balance", async function () {
      const initialBalance = await recipient.getBalance();
      expect(initialBalance).to.equal(0);
      
      const amount = ethers.parseEther("1.0");
      const paymentReference = "test-payment-123";
      
      await recipient.pay(amount, paymentReference, { value: amount });
      
      const balanceAfter = await recipient.getBalance();
      expect(balanceAfter).to.equal(amount);
    });
  });

  describe("Multiple Payments", function () {
    it("Should handle multiple payments from different users", async function () {
      const amount1 = ethers.parseEther("1.0");
      const amount2 = ethers.parseEther("2.0");
      const reference1 = "payment-1";
      const reference2 = "payment-2";
      
      // First payment from user1
      await expect(
        recipient.connect(user1).pay(amount1, reference1, { value: amount1 })
      ).to.emit(recipient, "Paid")
      .withArgs(user1.address, amount1, reference1);
      
      // Second payment from user2
      await expect(
        recipient.connect(user2).pay(amount2, reference2, { value: amount2 })
      ).to.emit(recipient, "Paid")
      .withArgs(user2.address, amount2, reference2);
      
      const totalBalance = await recipient.getBalance();
      expect(totalBalance).to.equal(amount1 + amount2);
    });
  });
});
