import { expect } from "chai";
import { ContractTransactionResponse } from "ethers";
import { AddressLike } from "ethers";
import { ethers } from "hardhat";
import { Marriage } from "../typechain-types";

const USER1HASHEDNAME = ethers.encodeBytes32String("elephant");
const USER1ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const USER2HASHEDNAME = ethers.encodeBytes32String("tiger");
const USER2ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const ID = 9;
// const IPFSHASH = "QmTzQ1fuh7xsqAW3YYWxsaMDP5JmVTTiE9nF7FQV5dxEGA";
// let block: Block | null;

describe("Marriage", () => {
  let marriage: Marriage & { deploymentTransaction(): ContractTransactionResponse };
  let deployer: { address: any }, user1: { address: AddressLike }, user2: any, user3: any;
  beforeEach(async () => {
    // Setup accounts
    [deployer, user1, user2, user3] = await ethers.getSigners();

    // Deploy contract
    const Marriage = await ethers.getContractFactory("Marriage");
    marriage = await Marriage.deploy();
  });

  describe("Deployment", () => {
    it("Sets the owner", async () => {
      const result = await marriage.owner();
      expect(result).to.equal(deployer.address);
    });
  });

  describe("Deposit by User1", () => {
    it("Should revert transaction if depositing wallet is not registered", async () => {
      await expect(
        marriage
          .connect(user3)
          .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") }),
      ).to.be.revertedWith("Please submit deposit using registered wallet");
    });

    it("Should revert transaction if deposit amount is less than 5 eth", async () => {
      await expect(
        marriage
          .connect(user1)
          .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("1") }),
      ).to.be.revertedWith("Insufficient deposit");
    });

    it("Should increase coupleCount to 1 when addUser1 is called", async () => {
      const transaction = await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
      await transaction.wait();
      expect(await marriage.coupleCount()).to.equal(1);
    });

    it("Should initialize CoupleDetails struct correctly when addUser1 is called", async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
      // // Manipulate block time for testing
      // const receipt = await transaction.wait();
      // block = await ethers.provider.getBlock(receipt.blockNumber);
      // Use "()" and not "[]" to access
      const couple = await marriage.couples(1);
      expect(couple.id).to.equal(1);
      expect(couple.user1hashedName).to.equal(USER1HASHEDNAME);
      expect(couple.user1address).to.equal(USER1ADDRESS);
      expect(couple.user1depositAmount).to.equal(ethers.parseEther("5"));
      expect(couple.user2hashedName).to.equal(USER2HASHEDNAME);
      expect(couple.user2address).to.equal(USER2ADDRESS);
      expect(couple.user2depositAmount).to.equal(0);
      expect(couple.status).to.equal("pendingDepositFromUser2");
      expect(couple.startTime).to.equal(0);
      expect(couple.ipfsHash).to.equal("");
    });
  });

  describe("Deposit by User2", () => {
    beforeEach(async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
    });

    it("Should revert transaction if ID is out of range", async () => {
      await expect(marriage.connect(user2).addUser2(ID, { value: ethers.parseEther("5") })).to.be.revertedWith(
        "Please use a valid URL for depositing",
      );
    });

    it("Should revert transaction if depositing wallet is not registered", async () => {
      await expect(marriage.connect(user3).addUser2(1, { value: ethers.parseEther("5") })).to.be.revertedWith(
        "Please submit deposit using registered wallet",
      );
    });

    it("Should revert transaction if deposit amount is less than 5 eth", async () => {
      await expect(marriage.connect(user2).addUser2(1, { value: ethers.parseEther("1") })).to.be.revertedWith(
        "Insufficient deposit",
      );
    });

    it("Should add on to couple details correctly when addUser2 is called", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      // Use "()" and not "[]" to access
      const couple = await marriage.couples(1);
      expect(couple.id).to.equal(1);
      expect(couple.user1hashedName).to.equal(USER1HASHEDNAME);
      expect(couple.user1address).to.equal(USER1ADDRESS);
      expect(couple.user1depositAmount).to.equal(ethers.parseEther("5"));
      expect(couple.user2hashedName).to.equal(USER2HASHEDNAME);
      expect(couple.user2address).to.equal(USER2ADDRESS);
      expect(couple.user2depositAmount).to.equal(ethers.parseEther("5"));
      expect(couple.status).to.equal("married");
      expect(couple.startTime).to.equal(0);
      expect(couple.ipfsHash).to.equal("");
    });
  });

  describe("Retrieve Deposit by User1", () => {
    beforeEach(async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
    });

    it("Should revert transaction if ID is out of range", async () => {
      await expect(marriage.connect(user1).retrieveDeposit(ID)).to.be.revertedWith("Please enter a valid ID");
    });

    it("Should revert transaction if requesting wallet is not registered", async () => {
      await expect(marriage.connect(user3).retrieveDeposit(1)).to.be.revertedWith(
        "Please submit retrieval request using a registered wallet",
      );
    });

    it("Should revert transaction if User2 has already deposited", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await expect(marriage.connect(user1).retrieveDeposit(1)).to.be.revertedWith(
        "User2 has deposited. You can't withdraw now. Your vows are now bound by code.",
      );
    });

    it("Should allow refund of deposit to User1 if User2 has not deposited", async () => {
      const user1balanceBeforeRefund = await ethers.provider.getBalance(user1.address);
      const transaction = await marriage.connect(user1).retrieveDeposit(1);
      const receipt = await transaction.wait();

      // Calculate gas cost
      console.log(receipt);
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice;
      const txCost = gasUsed * gasPrice;

      const user1balanceAfterRefund = await ethers.provider.getBalance(user1.address);
      expect(user1balanceAfterRefund).to.equal(user1balanceBeforeRefund + ethers.parseEther("5") - txCost);
    });
  });
});
