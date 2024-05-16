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
const IPFSHASH = "QmTzQ1fuh7xsqAW3YYWxsaMDP5JmVTTiE9nF7FQV5dxEGA";
let block;
const SIX_DAYS_IN_SECONDS = 6 * 24 * 60 * 60;
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

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
    it("Should revert transaction if depositing wallet is identified as part of another couple", async () => {
      // Register User1 as couple ID 1
      await marriage.connect(user1).addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, {
        value: ethers.parseEther("5"),
      }),
        expect(await marriage.coupleCount()).to.equal(1);

      // Register User1 again
      await expect(
        marriage
          .connect(user1)
          .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") }),
      ).to.be.revertedWith("Cannot proceed as your wallet is identified as part of another couple.");
    });

    it("Should revert transaction if depositing wallet is not registered", async () => {
      await expect(
        marriage
          .connect(user3)
          .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") }),
      ).to.be.revertedWith("Please submit deposit using registered wallet.");
    });

    it("Should revert transaction if deposit amount is less than 5 eth", async () => {
      await expect(
        marriage
          .connect(user1)
          .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("1") }),
      ).to.be.revertedWith("Insufficient deposit.");
    });

    it("Should increase coupleCount to 1 when addUser1 is called", async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
      expect(await marriage.coupleCount()).to.equal(1);
    });

    it("Should add User1 address to mapping", async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
      expect(await marriage.userAddressToId(user1.address)).to.equal(1);
    });

    it("Should initialize CoupleDetails struct correctly when addUser1 is called", async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
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
      expect(couple.divorceReporterAddress).to.equal("0x0000000000000000000000000000000000000000");
    });
  });

  describe("Deposit by User2", () => {
    beforeEach(async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
    });

    it("Should revert transaction if depositing wallet is identified as part of another couple", async () => {
      // Register User2 as couple ID 1
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });

      // Register User2 again
      await expect(marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") })).to.be.revertedWith(
        "Cannot proceed as your wallet is identified as part of another couple.",
      );
    });

    it("Should revert transaction if ID is out of range", async () => {
      await expect(marriage.connect(user2).addUser2(ID, { value: ethers.parseEther("5") })).to.be.revertedWith(
        "Please use a valid URL for depositing.",
      );
    });

    it("Should revert transaction if depositing wallet is not registered", async () => {
      await expect(marriage.connect(user3).addUser2(1, { value: ethers.parseEther("5") })).to.be.revertedWith(
        "Please submit deposit using registered wallet.",
      );
    });

    it("Should revert transaction if deposit amount is less than 5 eth", async () => {
      await expect(marriage.connect(user2).addUser2(1, { value: ethers.parseEther("1") })).to.be.revertedWith(
        "Insufficient deposit.",
      );
    });

    it("Should add User2 address to mapping", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      expect(await marriage.userAddressToId(user2.address)).to.equal(1);
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
      expect(couple.divorceReporterAddress).to.equal("0x0000000000000000000000000000000000000000");
    });
  });

  describe("Retrieve Deposit by User1", () => {
    beforeEach(async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
    });

    it("Should revert transaction if requesting wallet is not registered", async () => {
      await expect(marriage.connect(user3).retrieveDeposit()).to.be.revertedWith(
        "Please submit retrieval request using registered wallet.",
      );
    });

    it("Should revert transaction if User2 has already deposited", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await expect(marriage.connect(user1).retrieveDeposit()).to.be.revertedWith(
        "User2 has deposited. You can't withdraw now. Your vows are now bound by code.",
      );
    });

    it("Should allow refund of deposit to User1 if User2 has not deposited", async () => {
      const user1balanceBeforeRefund = await ethers.provider.getBalance(user1.address);
      const transaction = await marriage.connect(user1).retrieveDeposit();
      const receipt = await transaction.wait();

      // Calculate gas cost
      console.log(receipt);
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice;
      const txCost = gasUsed * gasPrice;

      const user1balanceAfterRefund = await ethers.provider.getBalance(user1.address);
      expect(user1balanceAfterRefund).to.equal(user1balanceBeforeRefund + ethers.parseEther("5") - txCost);
    });

    it("Should change status and amount in couple details after refund to User1", async () => {
      await marriage.connect(user1).retrieveDeposit();
      // Use "()" and not "[]" to access
      const couple = await marriage.couples(1);
      expect(couple.id).to.equal(1);
      expect(couple.user1hashedName).to.equal(USER1HASHEDNAME);
      expect(couple.user1address).to.equal(USER1ADDRESS);
      expect(couple.user1depositAmount).to.equal(0);
      expect(couple.user2hashedName).to.equal(USER2HASHEDNAME);
      expect(couple.user2address).to.equal(USER2ADDRESS);
      expect(couple.user2depositAmount).to.equal(0);
      expect(couple.status).to.equal("refundedUser1");
      expect(couple.startTime).to.equal(0);
      expect(couple.ipfsHash).to.equal("");
    });
  });

  describe("Submit Divorce", () => {
    beforeEach(async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
    });

    it("Should revert transaction if requesting wallet is not registered", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await expect(marriage.connect(user3).submitDivorce(IPFSHASH)).to.be.revertedWith(
        "Please submit divorce using registered wallet.",
      );
    });

    it("Should revert if status is not married", async () => {
      await expect(marriage.connect(user1).submitDivorce(IPFSHASH)).to.be.revertedWith(
        "Status not married, hence divorce not applicable.",
      );
    });

    it("Should update status and ipfsHash and trigger startTime", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      const transaction = await marriage.connect(user1).submitDivorce(IPFSHASH);
      // Manipulate block time for testing
      const receipt = await transaction.wait();
      block = await ethers.provider.getBlock(receipt.blockNumber);
      const couple = await marriage.couples(1);
      expect(couple.id).to.equal(1);
      expect(couple.user1hashedName).to.equal(USER1HASHEDNAME);
      expect(couple.user1address).to.equal(USER1ADDRESS);
      expect(couple.user1depositAmount).to.equal(ethers.parseEther("5"));
      expect(couple.user2hashedName).to.equal(USER2HASHEDNAME);
      expect(couple.user2address).to.equal(USER2ADDRESS);
      expect(couple.user2depositAmount).to.equal(ethers.parseEther("5"));
      expect(couple.status).to.equal("pendingDivorce");
      expect(couple.startTime).to.equal(block.timestamp);
      expect(couple.ipfsHash).to.equal(IPFSHASH);
      expect(couple.divorceReporterAddress).to.equal(user1.address);
    });
  });

  describe("Accept Divorce", () => {
    beforeEach(async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await marriage.connect(user1).submitDivorce(IPFSHASH);
    });

    it("Should revert transaction if accepting wallet is not registered", async () => {
      await expect(marriage.connect(user3).acceptDivorce(1)).to.be.revertedWith(
        "Please accept divorce using registered wallet.",
      );
    });

    it("Should revert transaction if ID is out of range", async () => {
      await expect(marriage.connect(user2).acceptDivorce(ID)).to.be.revertedWith(
        "Please use a valid URL for accepting the divorce.",
      );
    });

    it("Should revert transaction if acceptor of divorce is the same as the one who reported the divorce", async () => {
      await expect(marriage.connect(user1).acceptDivorce(1)).to.be.revertedWith(
        "Cannot accept divorce because you are the reporter of the divorce!",
      );
    });

    it("Should allow divorce to be accepted within 7 days by checking status has been updated to divorced", async () => {
      // Move forward in time by 6 days
      await ethers.provider.send("evm_increaseTime", [SIX_DAYS_IN_SECONDS]);
      await ethers.provider.send("evm_mine", []);
      // User2 accepts divorce
      await marriage.connect(user2).acceptDivorce(1);
      const couple = await marriage.couples(1);
      expect(couple.status).to.equal("divorced");
    });

    // it("Should only allow 1 user to accept the divorce", async () => {
    //   // User2 accepts divorce
    //   await marriage.connect(user2).acceptDivorce(1);
    //   await expect(marriage.connect(user1).acceptDivorce(1)).to.be.revertedWith("No divorce pending. Please recheck.");
    // });

    it("Should transfer 1 eth to acceptor and 2 eth to reporter", async () => {
      // Get initial balances, assumes user1 is the reporter
      const user1balanceBeforeDivorce = await ethers.provider.getBalance(user1.address);
      const user2balanceBeforeDivorce = await ethers.provider.getBalance(user2.address);
      const transaction = await marriage.connect(user2).acceptDivorce(1);
      const receipt = await transaction.wait();

      // Calculate gas cost
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice;
      const txCost = gasUsed * gasPrice;

      // Get final balances
      const user1balancAfterDivorce = await ethers.provider.getBalance(user1.address);
      const user2balancAfterDivorce = await ethers.provider.getBalance(user2.address);

      expect(user1balancAfterDivorce).to.closeTo(
        user1balanceBeforeDivorce + ethers.parseEther("2") - txCost,
        ethers.parseEther("0.001"),
      );
      expect(user2balancAfterDivorce).to.closeTo(
        user2balanceBeforeDivorce + ethers.parseEther("1") - txCost,
        ethers.parseEther("0.001"),
      );
    });

    it("Should revert transaction if more than 7 days has passed", async () => {
      // Move forward in time by 7 days
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS_IN_SECONDS]);
      await ethers.provider.send("evm_mine", []);
      // User2 accepts divorce
      await expect(marriage.connect(user2).acceptDivorce(1)).to.be.revertedWith(
        "You have exceeded 7 days. Divorce case has been escalated to the jury. Please wait for their decision.",
      );
    });
  });
});
