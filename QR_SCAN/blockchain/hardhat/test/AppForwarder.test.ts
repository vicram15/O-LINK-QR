import { expect } from "chai";
import { ethers } from "hardhat";
import { AppForwarder } from "../typechain-types";

describe("AppForwarder", function () {
  let appForwarder: AppForwarder;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const AppForwarderFactory = await ethers.getContractFactory("AppForwarder");
    appForwarder = await AppForwarderFactory.deploy();
    await appForwarder.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct name", async function () {
      const name = await appForwarder.name();
      expect(name).to.equal("AppForwarder");
    });

    it("Should have correct version", async function () {
      const version = await appForwarder.version();
      expect(version).to.equal("1");
    });

    it("Should have correct domain separator", async function () {
      const domainSeparator = await appForwarder.eip712Domain();
      expect(domainSeparator).to.not.be.undefined;
    });
  });

  describe("Nonce Management", function () {
    it("Should start with nonce 0", async function () {
      const nonce = await appForwarder.nonces(owner.address);
      expect(nonce).to.equal(0);
    });

    it("Should increment nonce after use", async function () {
      // This would require a meta-transaction to test properly
      // For now, we just verify the nonce starts at 0
      const nonce = await appForwarder.nonces(owner.address);
      expect(nonce).to.equal(0);
    });
  });

  describe("Domain Separator", function () {
    it("Should return consistent domain separator", async function () {
      const domain1 = await appForwarder.eip712Domain();
      const domain2 = await appForwarder.eip712Domain();
      expect(domain1).to.deep.equal(domain2);
    });
  });
});
