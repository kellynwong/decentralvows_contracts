import { expect } from "chai";
import { ethers } from "hardhat";
import { Marriage, Jury } from "../typechain-types";

const USER1ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const USER2ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

const USER3ADDRESS = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

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
  let marriage: Marriage;
  let jury: Jury;
  let deployer: { address: any },
    user1: any,
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

    // Deploy jury contract
    Jury = await ethers.getContractFactory("Jury");
    jury = await Jury.deploy();

    // Deploy marriage contract
    const Marriage = await ethers.getContractFactory("Marriage");
    marriage = await Marriage.deploy(jury.target);
  });

  describe("Deployment", () => {
    it("Sets the owner", async () => {
      let result = await marriage.owner();
      expect(result).to.equal(deployer.address);
      result = await jury.owner();
      expect(result).to.equal(deployer.address);
    });
  });

  describe("Adding of User1", () => {
    it("Should revert transaction if wallet address is identified as part of another couple", async () => {
      // Register User1 as couple ID 1
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, {
        value: ethers.parseEther("5"),
      }),
        expect(await marriage.coupleCount()).to.equal(1);
      // Register User1 again
      await expect(
        marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") }),
      ).to.be.revertedWith("Cannot add User1. Wallet address identified as part of another couple.");
    });

    it("Should revert transaction if wallet address is not the same as the address registered at front end", async () => {
      await expect(
        marriage.connect(user3).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") }),
      ).to.be.revertedWith("Cannot add User1. Wallet address is not the same as the address registered at front end.");
    });

    it("Should revert transaction if deposit amount is less than 5 eth", async () => {
      await expect(
        marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("1") }),
      ).to.be.revertedWith("Cannot add User1. Insufficient deposit.");
    });

    it("Should increase coupleCount to 1 when addUser1 is called", async () => {
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
      expect(await marriage.coupleCount()).to.equal(1);
    });

    it("Should increase coupleCount to 2 when addUser1 is called twice, once by User1 and second time by User3", async () => {
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user3).addUser1(USER3ADDRESS, USER4ADDRESS, { value: ethers.parseEther("5") });
      expect(await marriage.coupleCount()).to.equal(2);
    });

    it("Should add User1 address to mapping correctly", async () => {
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
      expect(await marriage.userAddressToId(user1.address)).to.equal(1);
    });

    it("Should initialize CoupleDetails struct correctly when addUser1 is called", async () => {
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
      // Use "()" and not "[]" to access
      const couple = await marriage.couples(1);
      expect(couple.id).to.equal(1);
      expect(couple.user1address).to.equal(USER1ADDRESS);
      expect(couple.user1depositAmount).to.equal(ethers.parseEther("5"));
      expect(couple.user2address).to.equal(USER2ADDRESS);
      expect(couple.user2depositAmount).to.equal(0);
      expect(couple.status).to.equal("pendingDepositFromUser2");
      expect(couple.disputeStartTime).to.equal(0);
      expect(couple.ipfsHash).to.equal("");
      expect(couple.divorceReporterAddress).to.equal("0x0000000000000000000000000000000000000000");
      expect(couple.divorceDisputerAddress).to.equal("0x0000000000000000000000000000000000000000");
    });
  });

  describe("Adding of User2", () => {
    beforeEach(async () => {
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
    });

    // Checks which are similar to addUser1 not tested as already tested above

    it("Should add on to couple details correctly when addUser2 is called", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      // Use "()" and not "[]" to access
      const couple = await marriage.couples(1);
      expect(couple.user2depositAmount).to.equal(ethers.parseEther("5"));
      expect(couple.status).to.equal("married");
    });

    it("Should add User1, User2, User3 and User4 addresses to mapping correctly", async () => {
      await marriage.connect(user3).addUser1(USER3ADDRESS, USER4ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await marriage.connect(user4).addUser2(2, { value: ethers.parseEther("5") });
      expect(await marriage.userAddressToId(user1.address)).to.equal(1);
      expect(await marriage.userAddressToId(user2.address)).to.equal(1);
      expect(await marriage.userAddressToId(user3.address)).to.equal(2);
      expect(await marriage.userAddressToId(user4.address)).to.equal(2);
    });
  });

  describe("Retrieval of Deposit by User1", () => {
    beforeEach(async () => {
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
    });

    it("Should revert transaction if requesting wallet is not registered", async () => {
      await expect(marriage.connect(user3).retrieveDeposit()).to.be.revertedWith(
        "Cannot retrieve deposit. Wallet address cannot be found.",
      );
    });

    it("Should revert transaction if User2 has already deposited", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await expect(marriage.connect(user1).retrieveDeposit()).to.be.revertedWith(
        "Cannot retrieve deposit. User2 has deposited.",
      );
    });

    it("Should allow User1 to retrieve deposit if User2 has not deposited", async () => {
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

    it("Should change status and amount in couple details after refunding to User1", async () => {
      await marriage.connect(user1).retrieveDeposit();
      const couple = await marriage.couples(1);
      expect(couple.status).to.equal("refundedUser1");
      expect(couple.user1depositAmount).to.equal(0);
      expect(couple.user2depositAmount).to.equal(0);
    });
  });

  describe("Submit Divorce", () => {
    beforeEach(async () => {
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
    });

    it("Should revert transaction if wallet address cannot be found", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await expect(marriage.connect(user3).submitDivorce(IPFSHASH)).to.be.revertedWith(
        "Cannot submit divorce. Wallet address cannot be found.",
      );
    });

    it("Should revert transaction if status is not married", async () => {
      await expect(marriage.connect(user1).submitDivorce(IPFSHASH)).to.be.revertedWith(
        "Cannot submit divorce. Status is not married.",
      );
    });

    it("Should update couple details after divorce is submitted", async () => {
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      const transaction = await marriage.connect(user1).submitDivorce(IPFSHASH);
      // Manipulate block time for testing
      const receipt = await transaction.wait();
      block = await ethers.provider.getBlock(receipt.blockNumber);
      const couple = await marriage.couples(1);
      expect(couple.status).to.equal("pendingDivorce");
      expect(couple.disputeStartTime).to.equal(block.timestamp);
      expect(couple.ipfsHash).to.equal(IPFSHASH);
      expect(couple.divorceReporterAddress).to.equal(user1.address);
    });
  });

  describe("Accept Divorce", () => {
    beforeEach(async () => {
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await marriage.connect(user1).submitDivorce(IPFSHASH);
    });

    it("Should revert transaction if wallet address cannot be found", async () => {
      await expect(marriage.connect(user3).acceptDivorce(1)).to.be.revertedWith(
        "Cannot accept divorce. Wallet address cannot be found.",
      );
    });

    it("Should revert transaction if wallet address is the same as reporter of divorce", async () => {
      await expect(marriage.connect(user1).acceptDivorce(1)).to.be.revertedWith(
        "Cannot accept divorce. Wallet address is the same as reporter of divorce.",
      );
    });

    it("Should revert transaction if more than 7 days has passed", async () => {
      // Move forward in time by 7 days
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS_IN_SECONDS]);
      await ethers.provider.send("evm_mine", []);
      // User2 accepts divorce
      await expect(marriage.connect(user2).acceptDivorce(1)).to.be.revertedWith(
        "Cannot accept divorce. Deadline to accept divorce has passed. Divorce has automatically been escalated to jury for voting and resolution.",
      );
    });
    it("Should allow divorce to be accepted if it is within 7 days", async () => {
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
      const user1balanceAfterDivorce = await ethers.provider.getBalance(user1.address);
      const user2balanceAfterDivorce = await ethers.provider.getBalance(user2.address);
      expect(user1balanceAfterDivorce).to.closeTo(
        user1balanceBeforeDivorce + ethers.parseEther("2") - txCost,
        ethers.parseEther("0.001"),
      );
      expect(user2balanceAfterDivorce).to.closeTo(
        user2balanceBeforeDivorce + ethers.parseEther("1") - txCost,
        ethers.parseEther("0.001"),
      );
    });
  });

  describe("Dispute Divorce", () => {
    beforeEach(async () => {
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await marriage.connect(user1).submitDivorce(IPFSHASH);
    });

    // Checks which are similar to acceptDivorce not tested as already tested above

    it("Should allow dispute to be raised within 7 days", async () => {
      // Move forward in time by 6 days
      await ethers.provider.send("evm_increaseTime", [SIX_DAYS_IN_SECONDS]);
      await ethers.provider.send("evm_mine", []);
      // User2 disputes divorce
      await marriage.connect(user2).disputeDivorce(1);
      const couple = await marriage.couples(1);
      expect(couple.status).to.equal("pendingJuryToResolveDispute");
    });

    it("Should create disputedDivorceDetails struct when disputeDivorce is called", async () => {
      await marriage.connect(user2).disputeDivorce(1);
      const divorce = await jury.disputedDivorces(1);
      expect(divorce.id).to.equal(1);
      expect(divorce.votesForDivorce).to.equal(0);
      expect(divorce.votesAgainstDivorce).to.equal(0);
      expect(divorce.votingIsLive).to.equal(true);
    });
  });

  describe("Manage Jury", () => {
    it("Should be able to add 5 addresses to the whitelist", async () => {
      await jury.connect(deployer).addToWhitelist(JURY1ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY2ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY3ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY4ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY5ADDRESS);
      expect(await jury.getJuryCount()).to.equal("5");
    });

    it("Should be able to add 2 and remove 1 address to/from the whitelist", async () => {
      await jury.connect(deployer).addToWhitelist(JURY1ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY2ADDRESS);
      await jury.connect(deployer).removeFromWhitelist(JURY1ADDRESS);
      expect(await jury.getJuryCount()).to.equal("1");
    });

    it("Should revert when adding an already whitelisted address", async () => {
      await jury.connect(deployer).addToWhitelist(JURY1ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY2ADDRESS);
      await expect(jury.connect(deployer).addToWhitelist(JURY2ADDRESS)).to.be.revertedWith(
        "Address is already whitelisted",
      );
    });

    it("Should return false if address is not whitelisted and vice versa", async () => {
      await jury.connect(deployer).addToWhitelist(user5.address);
      await jury.connect(deployer).addToWhitelist(user6.address);
      expect(await jury.connect(user7).checkAddressIsJury(user7.address)).to.equal(false);
      expect(await jury.connect(user5).checkAddressIsJury(user5.address)).to.equal(true);
    });
  });

  describe("Voting by Jury", () => {
    beforeEach(async () => {
      // Marry 2 couples
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user3).addUser1(USER3ADDRESS, USER4ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      await marriage.connect(user4).addUser2(2, { value: ethers.parseEther("5") });
      // User2 report a divorce between User1 and User2
      await marriage.connect(user2).submitDivorce(IPFSHASH);
      // User1 disputes the divorce
      await marriage.connect(user1).disputeDivorce(1);
    });

    it("Should not let a not whitelisted address to vote", async () => {
      await expect(jury.connect(user5).recordVotesByJury(1, 0)).to.be.revertedWith(
        "Cannot vote. Address has not been whitelisted to be a jury.",
      );
    });

    it("Should not let a jury vote twice for same couple", async () => {
      await jury.connect(deployer).addToWhitelist(user5);
      await jury.connect(user5).recordVotesByJury(1, 0);
      const divorce = await jury.disputedDivorces(1);
      expect(divorce.votesForDivorce).to.equal(1);
      await expect(jury.connect(user5).recordVotesByJury(1, 1)).to.be.revertedWith("Cannot vote again.");
    });

    it("Should record jury's vote and add jury to voter's array", async () => {
      await jury.connect(deployer).addToWhitelist(user5);
      await jury.connect(deployer).addToWhitelist(user6);
      await jury.connect(user5).recordVotesByJury(1, 0);
      await jury.connect(user6).recordVotesByJury(1, 1);
      const divorce = await jury.disputedDivorces(1);
      expect(divorce.votesForDivorce).to.equal(1);
      expect(divorce.votesAgainstDivorce).to.equal(1);
      expect(await jury.getVoters(1)).to.include(user5.address);
      expect(await jury.getVoters(1)).to.include(user6.address);
      expect(await jury.getJuryCount()).to.equal(2);
    });

    it("Should let the same jury vote a second time for a different couple", async () => {
      // User3 report a divorce between User3 and User4 (couple id 2)
      await marriage.connect(user3).submitDivorce(IPFSHASH2);
      // User4 disputes the divorce
      await marriage.connect(user4).disputeDivorce(2);
      // Add jury to whitelist
      await jury.connect(deployer).addToWhitelist(user5);
      // Jury vote for couple id 1
      await jury.connect(user5).recordVotesByJury(1, 0);
      const divorce1 = await jury.disputedDivorces(1);
      expect(divorce1.votesForDivorce).to.equal(1);
      // Same jury vote for couple id 2
      await jury.connect(user5).recordVotesByJury(2, 1);
      const divorce2 = await jury.disputedDivorces(2);
      expect(divorce2.votesAgainstDivorce).to.equal(1);
      expect(await jury.getVoters(1)).to.include(user5.address);
      expect(await jury.getVoters(2)).to.include(user5.address);
    });

    it("Should emit an event once quorum reached and should not let any more voting take place", async () => {
      // Whitelist 5 jury members
      await jury.connect(deployer).addToWhitelist(JURY1ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY2ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY3ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY4ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY5ADDRESS);
      // No event to be emitted after 1 vote
      await expect(jury.connect(user5).recordVotesByJury(1, 1)).to.not.emit(jury, "quorumReached");
      // No event to be emitted after 2 votes
      await expect(jury.connect(user6).recordVotesByJury(1, 1)).to.not.emit(jury, "quorumReached");
      // Event to be emitted after 3 votes
      await expect(jury.connect(user7).recordVotesByJury(1, 1)).to.emit(jury, "quorumReached").withArgs(1);
      // Voting should be closed
      const divorce = await jury.disputedDivorces(1);
      expect(divorce.votingIsLive).to.equal(false);
      await expect(jury.connect(user8).recordVotesByJury(1, 1)).to.be.revertedWith("Cannot vote. Voting has closed.");
    });

    it("Should return the correct results of the voting", async () => {
      // Whitelist 5 jury members
      await jury.connect(deployer).addToWhitelist(JURY1ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY2ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY3ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY4ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY5ADDRESS);
      await jury.connect(user5).recordVotesByJury(1, 1);
      await jury.connect(user6).recordVotesByJury(1, 1);
      await jury.connect(user7).recordVotesByJury(1, 1);
      expect(await jury.getResults(1)).to.equal(1);
    });
  });

  describe("Conclude Dispute", () => {
    let couple, reporterBalanceBeforeDivorce, disputerBalanceBeforeDivorce, txCost;
    beforeEach(async () => {
      // Marry 2 couples
      await marriage.connect(user1).addUser1(USER1ADDRESS, USER2ADDRESS, { value: ethers.parseEther("5") });
      await marriage.connect(user2).addUser2(1, { value: ethers.parseEther("5") });
      // User1 reports a divorce
      await marriage.connect(user1).submitDivorce(IPFSHASH);
      // User2 disputes the divorce
      await marriage.connect(user2).disputeDivorce(1);
      // Get initial balances
      couple = await marriage.couples(1);
      reporterBalanceBeforeDivorce = await ethers.provider.getBalance(couple.divorceReporterAddress);
      disputerBalanceBeforeDivorce = await ethers.provider.getBalance(couple.divorceDisputerAddress);
      // Adds jury to whitelist
      await jury.connect(deployer).addToWhitelist(JURY1ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY2ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY3ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY4ADDRESS);
      await jury.connect(deployer).addToWhitelist(JURY5ADDRESS);
    });

    it("Should send 2 eth to reporter as jury has voted for divorce", async () => {
      // Jury votes
      await jury.connect(user5).recordVotesByJury(1, 0);
      await jury.connect(user6).recordVotesByJury(1, 0);
      await jury.connect(user7).recordVotesByJury(1, 0);
      // Conclude dispute
      const transaction = await marriage.concludeDispute(1);
      expect(await jury.getResults(1)).to.equal(0);
      const receipt = await transaction.wait();
      // Calculate gas cost
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice;
      txCost = gasUsed * gasPrice;
      // Get final balances
      couple = await marriage.couples(1);
      const reporterBalanceAfterDivorce = await ethers.provider.getBalance(couple.divorceReporterAddress);
      const disputerBalanceAfterDivorce = await ethers.provider.getBalance(couple.divorceDisputerAddress);
      expect(reporterBalanceAfterDivorce).to.closeTo(
        reporterBalanceBeforeDivorce + ethers.parseEther("2") - txCost,
        ethers.parseEther("0.001"),
      );
      expect(disputerBalanceBeforeDivorce).to.equal(disputerBalanceAfterDivorce);
    });

    it("Should send 1 eth to disputer as jury has voted against divorce", async () => {
      // Jury votes
      await jury.connect(user5).recordVotesByJury(1, 1);
      await jury.connect(user6).recordVotesByJury(1, 1);
      await jury.connect(user7).recordVotesByJury(1, 0);
      // Conclude dispute
      const transaction = await marriage.concludeDispute(1);
      expect(await jury.getResults(1)).to.equal(1);
      const receipt = await transaction.wait();
      // Calculate gas cost
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice;
      const txCost = gasUsed * gasPrice;
      // Get final balances
      couple = await marriage.couples(1);
      const reporterBalanceAfterDivorce = await ethers.provider.getBalance(couple.divorceReporterAddress);
      const disputerBalanceAfterDivorce = await ethers.provider.getBalance(couple.divorceDisputerAddress);
      expect(disputerBalanceAfterDivorce).to.closeTo(
        disputerBalanceBeforeDivorce + ethers.parseEther("1") - txCost,
        ethers.parseEther("0.001"),
      );
      expect(reporterBalanceBeforeDivorce).to.equal(reporterBalanceAfterDivorce);
    });
  });
});
