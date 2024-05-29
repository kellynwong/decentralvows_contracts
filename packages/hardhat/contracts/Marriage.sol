// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./Jury.sol";
import "hardhat/console.sol";

contract Marriage is Ownable {
	// State variables
	Jury public jury;
	uint256 public coupleCount;

	// Events
	event UpdateCoupleDetails(
		uint256 id,
		address user1Address,
		uint256 user1DepositAmount,
		address user2Address,
		uint256 user2DepositAmount,
		string status,
		uint256 marriageStartTime,
		uint256 divorceReportTime,
		string ipfsHash,
		address divorceReporterAddress,
		address divorceDisputerAddress
	);

	event SubmitDivorce(
		string status,
		uint256 divorceReportTime,
		string ipfsHash,
		address divorceReporterAddress
	);

	// Struct
	struct CoupleDetails {
		uint256 id;
		address user1address;
		uint256 user1depositAmount;
		address user2address;
		uint256 user2depositAmount;
		string status;
		uint256 marriageStartTime;
		uint256 divorceReportTime;
		string ipfsHash;
		address divorceReporterAddress;
		address divorceDisputerAddress;
	}

	// Mappings
	mapping(uint256 => CoupleDetails) public couples;
	mapping(address => uint256) public userAddressToId;

	//Constructor
	constructor(address _juryAddress) {
		// Initializes variable of type Jury, assigns deployed Jury contract to variable so that marriage contract can call functions from Jury contract
		jury = Jury(_juryAddress);
		// Sets deployer as owner of marriage contract
		transferOwnership(msg.sender);
	}

	// Functionality related to marriages
	// ==========================================================
	function addUser1(address _user2address) public payable {
		// Check if user is duplicated user
		uint256 idUser1 = userAddressToId[msg.sender];
		require(
			idUser1 == 0,
			"Cannot add User1. Wallet address identified as part of another couple."
		);

		// Check if user2 is duplicated user
		uint256 idUser2 = userAddressToId[_user2address];
		require(
			idUser2 == 0,
			"Cannot add User2. Wallet address identified as part of another couple."
		);

		// Check if deposit is correct
		require(
			msg.value >= 5 ether,
			"Cannot add User1. Insufficient deposit."
		);
		// Increase coupleCount to assign ID and record details
		coupleCount++;
		userAddressToId[msg.sender] = coupleCount;
		couples[coupleCount] = CoupleDetails({
			id: coupleCount,
			user1address: msg.sender,
			user1depositAmount: msg.value,
			user2address: _user2address,
			user2depositAmount: 0,
			status: "pendingDepositFromUser2",
			marriageStartTime: block.timestamp,
			divorceReportTime: 0,
			ipfsHash: "",
			divorceReporterAddress: address(0),
			divorceDisputerAddress: address(0)
		});
		console.log("User1 deposit received, couple ID: %s", coupleCount);
		CoupleDetails storage couple = couples[coupleCount];
		console.log("Add User 1: ", couple.user1address);
		emit UpdateCoupleDetails(
			couple.id,
			couple.user1address,
			couple.user1depositAmount,
			couple.user2address,
			couple.user2depositAmount,
			couple.status,
			couple.marriageStartTime,
			couple.divorceReportTime,
			couple.ipfsHash,
			couple.divorceReporterAddress,
			couple.divorceDisputerAddress
		);
	}

	function addUser2(uint256 _id) public payable {
		// Check if user is duplicated user
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID == 0,
			"Cannot add User2. Wallet address identified as part of another couple."
		);
		// Check if user is using wallet as registered at frontend
		CoupleDetails storage couple = couples[_id];
		require(
			msg.sender == couple.user2address,
			"Cannot add User2. Wallet address is not the same as the address registered at front end."
		);
		// Check if deposit is correct
		require(
			msg.value >= 5 ether,
			"Cannot add User2. Insufficient deposit."
		);
		// Record details
		couple.status = "married";
		couple.user2depositAmount = 5 ether;
		userAddressToId[msg.sender] = _id;
		CoupleDetails storage coupleUpdated = couples[couple.id];
		console.log("Add User 2: ", couple.user1address);
		emit UpdateCoupleDetails(
			coupleUpdated.id,
			coupleUpdated.user1address,
			coupleUpdated.user1depositAmount,
			coupleUpdated.user2address,
			coupleUpdated.user2depositAmount,
			coupleUpdated.status,
			coupleUpdated.marriageStartTime,
			coupleUpdated.divorceReportTime,
			coupleUpdated.ipfsHash,
			coupleUpdated.divorceReporterAddress,
			coupleUpdated.divorceDisputerAddress
		);
	}

	function retrieveDeposit() public payable {
		// Use address to lookup ID
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID != 0,
			"Cannot retrieve deposit. Wallet address cannot be found."
		);
		// Check if user has claimed before
		CoupleDetails storage couple = couples[ID];
		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingDepositFromUser2")),
			"Cannot retrieve deposit. User1 has claimed already."
		);
		// Check if User2 has deposited; cannot use "==" for direct string comparison; instead use "keccak256" hash function to hash strings and then compare resulting hashes

		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingDepositFromUser2")),
			"Cannot retrieve deposit. User2 has deposited."
		);
		// Refund User 1; "transfer" better than "send" cause "transfer" will revert tx on failure
		payable(msg.sender).transfer(5 ether);
		couple.status = "refundedUser1";
		couple.user1depositAmount = 0;
		CoupleDetails storage coupleUpdated = couples[couple.id];
		console.log("Retrieve Deposit: ", couple.user1address);
		emit UpdateCoupleDetails(
			coupleUpdated.id,
			coupleUpdated.user1address,
			coupleUpdated.user1depositAmount,
			coupleUpdated.user2address,
			coupleUpdated.user2depositAmount,
			coupleUpdated.status,
			coupleUpdated.marriageStartTime,
			coupleUpdated.divorceReportTime,
			coupleUpdated.ipfsHash,
			coupleUpdated.divorceReporterAddress,
			coupleUpdated.divorceDisputerAddress
		);
	}

	// Functionality related to submit, accept and dispute divorce
	// ==========================================================
	function submitDivorce(string memory _ipfsHash) public {
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID != 0,
			"Cannot submit divorce. Wallet address cannot be found."
		);
		CoupleDetails storage couple = couples[ID];
		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("married")),
			"Cannot submit divorce. Status is not married."
		);
		couple.status = "pendingDivorce";
		couple.divorceReportTime = block.timestamp;
		couple.ipfsHash = _ipfsHash;
		couple.divorceReporterAddress = msg.sender;
		CoupleDetails storage coupleUpdated = couples[couple.id];
		console.log("Submit Divorce: ", coupleUpdated.ipfsHash);

		emit UpdateCoupleDetails(
			coupleUpdated.id,
			coupleUpdated.user1address,
			coupleUpdated.user1depositAmount,
			coupleUpdated.user2address,
			coupleUpdated.user2depositAmount,
			coupleUpdated.status,
			coupleUpdated.marriageStartTime,
			coupleUpdated.divorceReportTime,
			coupleUpdated.ipfsHash,
			coupleUpdated.divorceReporterAddress,
			coupleUpdated.divorceDisputerAddress
		);
		console.log(
			"Emitted event for submitDivorce: ",
			coupleUpdated.divorceReportTime
		);
	}

	function acceptDivorce() public {
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID != 0,
			"Cannot accept divorce. Wallet address cannot be found."
		);
		// Must not be reporter of divorce
		CoupleDetails storage couple = couples[ID];
		require(
			msg.sender != couple.divorceReporterAddress,
			"Cannot accept divorce. Wallet address is the same as reporter of divorce."
		);
		// Check if current time is within the 7-day period after starttime
		require(
			block.timestamp <= couple.divorceReportTime + 7 days,
			"Cannot accept divorce. Deadline to accept divorce has passed. Divorce has automatically been escalated to jury for voting and resolution."
		);
		payable(couple.divorceReporterAddress).transfer(2 ether);
		payable(msg.sender).transfer(1 ether);
		couple.status = "divorced and refunded";
		couple.user1depositAmount = 0;
		couple.user2depositAmount = 0;
	}

	function disputeDivorce() public {
		uint256 ID = userAddressToId[msg.sender];
		CoupleDetails storage couple = couples[ID];
		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingDivorce")),
			"Cannot dispute divorce. Status is still married (i.e. no divorce has been submitted)."
		);

		require(
			ID != 0,
			"Cannot dispute divorce. Wallet address cannot be found."
		);
		// require(
		// 	ID > 0 && ID <= coupleCount,
		// 	"Cannot dispute divorce. No records of ID found."
		// );

		// Must not be reporter of divorce
		require(
			msg.sender != couple.divorceReporterAddress,
			"Cannot dispute divorce. Wallet address is the same as reporter of divorce."
		);
		// Check if current time is within the 7-day period after starttime
		require(
			block.timestamp <= couple.divorceReportTime + 7 days,
			"Deadline to dispute divorce has passed. Divorce has automatically been escalated to jury for voting and resolution."
		);
		couple.status = "pendingJuryToResolveDispute";
		couple.divorceDisputerAddress = msg.sender;
		// Initialize struct and link id to couple id

		jury.addDisputeDivorceDetails(ID, couple.ipfsHash);
	}

	// Functionality related to conclusion of disputed divorce
	// ==========================================================
	function concludeDispute(uint256 _id) public {
		CoupleDetails storage couple = couples[_id];
		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingJuryToResolveDispute"))
		);
		if (jury.getResults(_id) == 0) {
			payable(couple.divorceReporterAddress).transfer(2 ether);
			couple
				.status = "juryVotesForDivorce, penalized disputer and refunded reporter";
			couple.user1depositAmount = 0;
			couple.user2depositAmount = 0;
		} else {
			payable(couple.divorceDisputerAddress).transfer(1 ether);
			couple
				.status = "juryVotesAgainstDivorce, penalized reporter and refunded disputer";
			couple.user1depositAmount = 0;
			couple.user2depositAmount = 0;
		}
	}

	// Helper functions
	// ==========================================================
	function getId(address _userAddress) public view returns (uint256 _id) {
		return userAddressToId[_userAddress];
	}

	function getCoupleDetails(uint256 _id)
		public
		view
		returns (CoupleDetails memory)
	{
		return couples[_id];
	}
}
