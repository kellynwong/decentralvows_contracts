import { expect } from "chai";
import { ContractTransactionResponse } from "ethers";
import { AddressLike } from "ethers";
import { ethers } from "hardhat";
import { Marriage, Jury } from "../typechain-types";

const USER1HASHEDNAME = ethers.encodeBytes32String("elephant");
const USER1ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const USER2HASHEDNAME = ethers.encodeBytes32String("tiger");
const USER2ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const USER3HASHEDNAME = ethers.encodeBytes32String("lion");
const USER3ADDRESS = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const USER4HASHEDNAME = ethers.encodeBytes32String("zebra");
const USER4ADDRESS = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
const JURY1ADDRESS = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
const JURY2ADDRESS = "0x976EA74026E726554dB657fA54763abd0C3a0aa9";
const JURY3ADDRESS = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955";
const JURY4ADDRESS = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f";
const JURY5ADDRESS = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";
const IPFSHASH = "QmTzQ1fuh7xsqAW3YYWxsaMDP5JmVTTiE9nF7FQV5dxEGA";
const IPFSHASH2 = "KmRzQ1fuh7xsqAW3YYWxsaMDP5JmAABiE9nF7FQV5dxANT";
let block;
const SIX_DAYS_IN_SECONDS = 6 * 24 * 60 * 60;
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

describe("Marriage", () => {
  let marriage: Marriage & { deploymentTransaction(): ContractTransactionResponse };
  let jury: Jury;
  let deployer: { address: any },
    user1: { address: AddressLike },
    user2: any,
    user3: any,
    user4: any,
    user5: any,
    user6: any,
    user7: any,
    user8: any;
  beforeEach(async () => {
    // Setup accounts
    [deployer, user1, user2, user3, user4, user5, user6, user7, user8] = await ethers.getSigners();

    // Deploy Jury contract
    Jury = await ethers.getContractFactory("Jury");
    jury = await Jury.deploy();

    // Deploy marriage contract
    const Marriage = await ethers.getContractFactory("Marriage");
    marriage = await Marriage.deploy(jury.target);

    // Transfer ownership of Jury contract to Marriage contract
    await jury.transferOwnership(marriage.target);
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

    it("Should increase coupleCount to 2 when addUser1 is called twice, once by User1 and second time by User3", async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
      await marriage
        .connect(user3)
        .addUser1(USER3HASHEDNAME, USER3ADDRESS, USER4HASHEDNAME, USER4ADDRESS, { value: ethers.parseEther("5") });
      expect(await marriage.coupleCount()).to.equal(2);
    });

    it("Should add User1 address to mapping correctly", async () => {
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

    it("Should add User1, User2, User3 and User4 addresses to mapping correctly", async () => {
      await marriage
        .connect(user3)
        .addUser1(USER3HASHEDNAME, USER3ADDRESS, USER4HASHEDNAME, USER4ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await marriage.connect(user4).addUser2(2, { value: ethers.parseEther("5") });
      expect(await marriage.userAddressToId(user1.address)).to.equal(1);
      expect(await marriage.userAddressToId(user2.address)).to.equal(1);
      expect(await marriage.userAddressToId(user3.address)).to.equal(2);
      expect(await marriage.userAddressToId(user4.address)).to.equal(2);
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

  describe("Retrieval of Deposit by User1", () => {
    beforeEach(async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
    });

    it("Should revert transaction if requesting wallet is not registered", async () => {
      await expect(marriage.connect(user3).retrieveDeposit()).to.be.revertedWith("No records of ID found.");
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

  describe("Submitting a Divorce Process", () => {
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

  describe("Accepting a Divorce Process", () => {
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
      expect(couple.status).to.equal("divorced and refunded");
    });

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

  // Will not test scenarios which are the same as above - accept divorce
  describe("Disputing a Divorce Process", () => {
    beforeEach(async () => {
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await marriage.connect(user1).submitDivorce(IPFSHASH);
    });

    it("Should allow dispute to be raised within 7 days by checking status has been updated to pendingDispute", async () => {
      // Move forward in time by 6 days
      await ethers.provider.send("evm_increaseTime", [SIX_DAYS_IN_SECONDS]);
      await ethers.provider.send("evm_mine", []);
      // User2 disputes divorce
      await marriage.connect(user2).addDisputeDivorce(1);
      const couple = await marriage.couples(1);
      expect(couple.status).to.equal("pendingJuryToResolveDispute");
    });

    it("Should enable jury whitelist when addDisputeDivorce is called", async () => {
      await marriage.connect(user2).addDisputeDivorce(1);
      expect(await jury.isJuryEnabled(1)).to.equal(true);
    });
  });

  describe("Jury and Voting Process", () => {
    beforeEach(async () => {
      // Marry 2 couples
      await marriage
        .connect(user1)
        .addUser1(USER1HASHEDNAME, USER1ADDRESS, USER2HASHEDNAME, USER2ADDRESS, { value: ethers.parseEther("5") });
      await marriage
        .connect(user3)
        .addUser1(USER3HASHEDNAME, USER3ADDRESS, USER4HASHEDNAME, USER4ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await marriage.connect(user4).addUser2(2, { value: ethers.parseEther("5") });
      // User2 report a divorce between User1 and User2
      await marriage.connect(user2).submitDivorce(IPFSHASH);
      // User1 disputes the divorce
      await marriage.connect(user1).addDisputeDivorce(1);
    });

    it("Should allow deployer to add 5 jury addresses to the whitelist", async () => {
      await marriage.connect(deployer).addToWhitelist(JURY1ADDRESS);
      await marriage.connect(deployer).addToWhitelist(JURY2ADDRESS);
      await marriage.connect(deployer).addToWhitelist(JURY3ADDRESS);
      await marriage.connect(deployer).addToWhitelist(JURY4ADDRESS);
      await marriage.connect(deployer).addToWhitelist(JURY5ADDRESS);
      expect(await jury.getWhitelistedCount()).to.equal("5");
    });

    it("Should revert when adding an already whitelisted address", async () => {
      await marriage.connect(deployer).addToWhitelist(JURY1ADDRESS);
      await marriage.connect(deployer).addToWhitelist(JURY2ADDRESS);
      await expect(marriage.connect(deployer).addToWhitelist(JURY2ADDRESS)).to.be.revertedWith(
        "Address is already whitelisted",
      );
    });

    it("Should allow a jury to retrieve and view the ipfs of the disputed divorce", async () => {
      await marriage.connect(deployer).addToWhitelist(user5);
      expect(await jury.isAllowed(user5.address)).to.be.true;
      // Error: contract runner does not support calling (operation="call", code=UNSUPPORTED_OPERATION, version=6.10.0) - to use user5 (hardhat account)
      const retrievedIpfsHash = await marriage.connect(user5).retrieveIpfsByJury();
      expect(retrievedIpfsHash).to.equal(IPFSHASH);
    });

    it("Should record jury's vote and add jury to voter's array", async () => {
      await marriage.connect(deployer).addToWhitelist(user5);
      await marriage.connect(deployer).addToWhitelist(user6);
      await marriage.connect(user5).recordVotesByJury(1, 0);
      await marriage.connect(user6).recordVotesByJury(1, 1);
      const disputedDivorce = await marriage.disputedDivorces(1);
      expect(disputedDivorce.votesForDivorce).to.equal(1);
      expect(disputedDivorce.votesAgainstDivorce).to.equal(1);
      expect(await marriage.getVoters(1)).to.include(user5.address);
      expect(await marriage.getVoters(1)).to.include(user6.address);
    });

    it("Should not let a jury vote twice", async () => {
      await marriage.connect(deployer).addToWhitelist(user5);
      await marriage.connect(user5).recordVotesByJury(1, 0);
      const disputedDivorce = await marriage.disputedDivorces(1);
      expect(disputedDivorce.votesForDivorce).to.equal(1);
      await expect(marriage.connect(user5).recordVotesByJury(1, 1)).to.be.revertedWith("You have voted before.");
    });

    it("Should let a jury vote a second time for a different couple and voter records are updated correctly", async () => {
      // User3 report a divorce between User3 and User4 (couple id 2)
      await marriage.connect(user3).submitDivorce(IPFSHASH2);
      // User4 disputes the divorce
      await marriage.connect(user4).addDisputeDivorce(2);
      await marriage.connect(deployer).addToWhitelist(user5);
      // Voting for couple id 1
      await marriage.connect(user5).recordVotesByJury(1, 0);
      const disputedDivorceCouple1 = await marriage.disputedDivorces(1);
      expect(disputedDivorceCouple1.votesForDivorce).to.equal(1);
      // Voting for couple id 2
      await marriage.connect(user5).recordVotesByJury(2, 1);
      const disputedDivorceCouple2 = await marriage.disputedDivorces(2);
      expect(disputedDivorceCouple2.votesAgainstDivorce).to.equal(1);
      expect(await marriage.getVoters(1)).to.include(user5.address);
      expect(await marriage.getVoters(2)).to.include(user5.address);
    });

    it("Should call tallyVotes once quorum reached", async () => {
      // Status before voting
      // let couple = await marriage.couples(1);
      // expect(couple.status).to.equal("pendingJuryToResolveDispute");
      // Whitelist 5 jury members
      await marriage.connect(deployer).addToWhitelist(JURY1ADDRESS);
      await marriage.connect(deployer).addToWhitelist(JURY2ADDRESS);
      await marriage.connect(deployer).addToWhitelist(JURY3ADDRESS);
      await marriage.connect(deployer).addToWhitelist(JURY4ADDRESS);
      await marriage.connect(deployer).addToWhitelist(JURY5ADDRESS);

      // Status after 1 voter to remain unchanged as quorum not reached
      await marriage.connect(user5).recordVotesByJury(1, 1);
      // const disputedDivorce = await marriage.disputedDivorces(1);
      // expect(disputedDivorce.votesForDivorce).to.equal(1);
      // expect(disputedDivorce.votesAgainstDivorce).to.equal(0);
      // expect(await jury.getWhitelistedCount()).to.equal("5");
      let couple = await marriage.couples(1);
      expect(couple.status).to.equal("pendingJuryToResolveDispute");
      expect(await jury.isJuryEnabled(1)).to.equal(true);

      // Status after 2 voters to remain unchanged as quorum not reached
      await marriage.connect(user6).recordVotesByJury(1, 1);
      couple = await marriage.couples(1);
      expect(couple.status).to.equal("pendingJuryToResolveDispute");
      expect(await jury.isJuryEnabled(1)).to.equal(true);

      // a) Changing above votes to 1, 1, and vote 3 as 0, status after 3 votes to change to "juryVotesForDivorce, penalized disputer and refunded reporter"
      // await marriage.connect(user7).recordVotesByJury(1, 0);
      // couple = await marriage.couples(1);
      // expect(couple.status).to.equal("juryVotesForDivorce, penalized disputer and refunded reporter");

      // b) Changing above votes to 1, 1, and vote 3 as 0, status after 3 votes to change to "juryVotesAgainstDivorce, penalized reporter and refunded disputer"
      await marriage.connect(user7).recordVotesByJury(1, 0);
      couple = await marriage.couples(1);
      expect(couple.status).to.equal("juryVotesAgainstDivorce, penalized reporter and refunded disputer");
      expect(await jury.isJuryEnabled(1)).to.equal(false);

      // If 4th voter tried to vote after quorum has reached (and hence jury has been disabled), to be reverted with error message
      await expect(marriage.connect(user8).recordVotesByJury(1, 0)).to.be.revertedWith("Voting has ended.");
    });
  });
});
