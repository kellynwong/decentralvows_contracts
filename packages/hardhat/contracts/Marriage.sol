// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Marriage {
	address public owner;
	uint256 public coupleCount;

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

	struct CoupleDetails {
		uint256 id;
		bytes32 user1hashedName;
		address user1address;
		uint256 user1depositAmount;
		bytes32 user2hashedName;
		address user2address;
		uint256 user2depositAmount;
		string status;
		uint256 startTime;
		string ipfsHash;
	}

	mapping(uint256 => CoupleDetails) public couples;

	constructor() {
		owner = msg.sender;
	}

	function addUser1(
		bytes32 _user1hashedName,
		address _user1address,
		bytes32 _user2hashedName,
		address _user2address
	) public payable {
		require(
			msg.sender == _user1address,
			"Please submit deposit using registered wallet"
		);
		require(msg.value >= 5 ether, "Insufficient deposit");

		coupleCount++;

		couples[coupleCount] = CoupleDetails({
			id: coupleCount,
			user1hashedName: _user1hashedName,
			user1address: _user1address,
			user1depositAmount: msg.value,
			user2hashedName: _user2hashedName,
			user2address: _user2address,
			user2depositAmount: 0,
			status: "pendingDepositFromUser2",
			startTime: 0,
			ipfsHash: ""
		});

		emit User1DepositReceived(coupleCount, msg.sender, msg.value);
	}

	// Mark function as payable to allow it to handle ether transfers
	function addUser2(uint256 _id) public payable {
		require(
			_id > 0 && _id <= coupleCount,
			"Please use a valid URL for depositing"
		);

		// Access couple details via storage and id
		CoupleDetails storage couple = couples[_id];

		require(
			msg.sender == couple.user2address,
			"Please submit deposit using registered wallet"
		);
		require(msg.value >= 5 ether, "Insufficient deposit");

		couple.status = "married";
		couple.user2depositAmount = 5 ether;

		emit User2DepositReceived(coupleCount, msg.sender, msg.value);
	}

	function retrieveDeposit(uint256 _id) public payable {
		require(_id > 0 && _id <= coupleCount, "Please enter a valid ID");

		CoupleDetails storage couple = couples[_id];

		require(
			msg.sender == couple.user1address,
			"Please submit retrieval request using a registered wallet"
		);

		// Cannot use "==" for direct string comparison; instead use "keccak256" hash function to hash strings and then compare resulting hashes
		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingDepositFromUser2")),
			"User2 has deposited. You can't withdraw now. Your vows are now bound by code."
		);

		// "transfer" better than "send" cause "transfer" will revert tx on failure
		payable(msg.sender).transfer(5 ether);
	}
}
