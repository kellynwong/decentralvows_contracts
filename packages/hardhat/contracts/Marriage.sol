// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./Jury.sol";

contract Marriage is Ownable {
	// State variables
	Jury public jury;
	uint256 public coupleCount;

	// Events
	event User1DepositReceived(
		uint256 indexed id,
		address indexed user1address,
		uint256 user1depositAmount
	);

	event User2DepositReceived(
		uint256 indexed id,
		address indexed user2address,
		uint256 user2depositAmount
	);

	// Struct
	struct CoupleDetails {
		uint256 id;
		bytes32 user1hashedName;
		address user1address;
		uint256 user1depositAmount;
		bytes32 user2hashedName;
		address user2address;
		uint256 user2depositAmount;
		string status;
		uint256 disputeStartTime;
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
	function addUser1(
		bytes32 _user1hashedName,
		address _user1address,
		bytes32 _user2hashedName,
		address _user2address
	) public payable {
		// Check if user is duplicated user
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID == 0,
			"Cannot add User1. Wallet address identified as part of another couple."
		);
		// Check if user is using wallet as registered at frontend
		require(
			msg.sender == _user1address,
			"Cannot add User1. Wallet address is not the same as the address registered at front end."
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
			user1hashedName: _user1hashedName,
			user1address: _user1address,
			user1depositAmount: msg.value,
			user2hashedName: _user2hashedName,
			user2address: _user2address,
			user2depositAmount: 0,
			status: "pendingDepositFromUser2",
			disputeStartTime: 0,
			ipfsHash: "",
			divorceReporterAddress: address(0),
			divorceDisputerAddress: address(0)
		});
		emit User1DepositReceived(coupleCount, msg.sender, msg.value);
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
		emit User2DepositReceived(coupleCount, msg.sender, msg.value);
	}

	function retrieveDeposit() public payable {
		// Use address to lookup ID
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID != 0,
			"Cannot retrieve deposit. Wallet address cannot be found."
		);
		// Check if User2 has deposited; cannot use "==" for direct string comparison; instead use "keccak256" hash function to hash strings and then compare resulting hashes
		CoupleDetails storage couple = couples[ID];
		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingDepositFromUser2")),
			"Cannot retrieve deposit. User2 has deposited."
		);
		// Refund User 1; "transfer" better than "send" cause "transfer" will revert tx on failure
		payable(msg.sender).transfer(5 ether);
		couple.status = "refundedUser1";
		couple.user1depositAmount = 0;
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
		couple.disputeStartTime = block.timestamp;
		couple.ipfsHash = _ipfsHash;
		couple.divorceReporterAddress = msg.sender;
	}

	function acceptDivorce(uint256 _id) public {
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID != 0,
			"Cannot accept divorce. Wallet address cannot be found."
		);
		// Must not be reporter of divorce
		CoupleDetails storage couple = couples[_id];
		require(
			msg.sender != couple.divorceReporterAddress,
			"Cannot accept divorce. Wallet address is the same as reporter of divorce."
		);
		// Check if current time is within the 7-day period after starttime
		require(
			block.timestamp <= couple.disputeStartTime + 7 days,
			"Cannot accept divorce. Deadline to accept divorce has passed. Divorce has automatically been escalated to jury for voting and resolution."
		);
		payable(couple.divorceReporterAddress).transfer(2 ether);
		payable(msg.sender).transfer(1 ether);
		couple.status = "divorced and refunded";
		couple.user1depositAmount = 0;
		couple.user2depositAmount = 0;
	}

	function disputeDivorce(uint256 _id) public {
		CoupleDetails storage couple = couples[_id];
		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingDivorce")),
			"Cannot dispute divorce. Status is still married (i.e. no divorce has been submitted)."
		);
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID != 0,
			"Cannot dispute divorce. Wallet address cannot be found."
		);
		require(
			_id > 0 && _id <= coupleCount,
			"Cannot dispute divorce. No records of ID found."
		);
		// Must not be reporter of divorce
		require(
			msg.sender != couple.divorceReporterAddress,
			"Cannot dispute divorce. Wallet address is the same as reporter of divorce."
		);
		// Check if current time is within the 7-day period after starttime
		require(
			block.timestamp <= couple.disputeStartTime + 7 days,
			"Deadline to dispute divorce has passed. Divorce has automatically been escalated to jury for voting and resolution."
		);
		couple.status = "pendingJuryToResolveDispute";
		// Initialize struct and link id to couple id
		jury.addDisputedDivorceDetails(_id);
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
}
