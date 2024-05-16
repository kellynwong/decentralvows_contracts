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
		address divorceReporterAddress;
	}

	struct DivorceDetails {
		uint256 id;
		uint256 votesForDivorce;
		uint256 votesAgainstDivorce;
		address[] voters;
	}

	mapping(uint256 => CoupleDetails) public couples;
	mapping(address => uint256) public userAddressToId;

	constructor() {
		owner = msg.sender;
	}

	function addUser1(
		bytes32 _user1hashedName,
		address _user1address,
		bytes32 _user2hashedName,
		address _user2address
	) public payable {
		// Check not duplicated
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID == 0,
			"Cannot proceed as your wallet is identified as part of another couple."
		);

		require(
			msg.sender == _user1address,
			"Please submit deposit using registered wallet."
		);
		require(msg.value >= 5 ether, "Insufficient deposit.");

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
			startTime: 0,
			ipfsHash: "",
			divorceReporterAddress: address(0)
		});

		emit User1DepositReceived(coupleCount, msg.sender, msg.value);
	}

	// Mark function as payable to allow it to handle ether transfers
	function addUser2(uint256 _id) public payable {
		// Check not duplicated
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID == 0,
			"Cannot proceed as your wallet is identified as part of another couple."
		);

		require(
			_id > 0 && _id <= coupleCount,
			"Please use a valid URL for depositing."
		);

		// Access couple details via storage and id
		CoupleDetails storage couple = couples[_id];

		require(
			msg.sender == couple.user2address,
			"Please submit deposit using registered wallet."
		);
		require(msg.value >= 5 ether, "Insufficient deposit.");

		couple.status = "married";
		couple.user2depositAmount = 5 ether;
		userAddressToId[msg.sender] = _id;

		emit User2DepositReceived(coupleCount, msg.sender, msg.value);
	}

	function retrieveDeposit() public payable {
		// To access mapping and save value to a var; will return default value for uint256 (which is 0) if key does not exist, i.e. wallet does not exist
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID != 0,
			"Please submit retrieval request using registered wallet."
		);
		CoupleDetails storage couple = couples[ID];

		require(
			msg.sender == couple.user1address,
			"Please submit retrieval request using registered wallet."
		);

		// Cannot use "==" for direct string comparison; instead use "keccak256" hash function to hash strings and then compare resulting hashes
		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingDepositFromUser2")),
			"User2 has deposited. You can't withdraw now. Your vows are now bound by code."
		);

		// "transfer" better than "send" cause "transfer" will revert tx on failure
		payable(msg.sender).transfer(5 ether);

		couple.status = "refundedUser1";
		couple.user1depositAmount = 0;
	}

	function submitDivorce(string memory _ipfsHash) public {
		uint256 ID = userAddressToId[msg.sender];
		require(ID != 0, "Please submit divorce using registered wallet.");

		CoupleDetails storage couple = couples[ID];

		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("married")),
			"Status not married, hence divorce not applicable."
		);

		couple.status = "pendingDivorce";
		couple.startTime = block.timestamp;
		couple.ipfsHash = _ipfsHash;
		couple.divorceReporterAddress = msg.sender;
	}

	function acceptDivorce(uint256 _id) public {
		uint256 ID = userAddressToId[msg.sender];
		require(ID != 0, "Please accept divorce using registered wallet.");

		require(
			_id > 0 && _id <= coupleCount,
			"Please use a valid URL for accepting the divorce."
		);

		// Access couple details via storage and id
		CoupleDetails storage couple = couples[_id];

		// Must not be reporter of divorce
		require(
			msg.sender != couple.divorceReporterAddress,
			"Cannot accept divorce because you are the reporter of the divorce!"
		);

		// Check if current time is within the 7-day period after starttime
		require(
			block.timestamp <= couple.startTime + 7 days,
			"You have exceeded 7 days. Divorce case has been escalated to the jury. Please wait for their decision."
		);

		couple.status = "divorced";
		payable(couple.divorceReporterAddress).transfer(2 ether);
		payable(msg.sender).transfer(1 ether);
	}

	function disputeDivorce(uint256 _id) public {}
}
