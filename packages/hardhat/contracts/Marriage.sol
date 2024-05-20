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

	// Structs
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
		address divorceDisputerAddress;
	}

	struct DisputedDivorceDetails {
		uint256 id;
		uint256 votesForDivorce;
		uint256 votesAgainstDivorce;
		address[] voters;
	}

	// Mappings
	mapping(uint256 => CoupleDetails) public couples;
	mapping(address => uint256) public userAddressToId;
	mapping(uint256 => DisputedDivorceDetails) public disputedDivorces;

	// mapping(address => uint256) public juryAddressToId;

	//Constructor
	constructor(address _juryAddress) {
		// Initializes jury variable of type Jury, assigns deployed Jury contract to variable so that marriage contract can call functions from Jury contract
		jury = Jury(_juryAddress);
		// Sets deployer as owner of marriage contract
		transferOwnership(msg.sender);
	}

	// Functionality related to marriages
	// **********************************
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
			"Cannot proceed as your wallet is identified as part of another couple."
		);
		// Check if user is using wallet as registered at frontend
		require(
			msg.sender == _user1address,
			"Please submit deposit using registered wallet."
		);
		// Check if deposit is correct
		require(msg.value >= 5 ether, "Insufficient deposit.");
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
			startTime: 0,
			ipfsHash: "",
			divorceReporterAddress: address(0),
			divorceDisputerAddress: address(0)
		});
		userAddressToId[msg.sender] = coupleCount;
		emit User1DepositReceived(coupleCount, msg.sender, msg.value);
	}

	function addUser2(uint256 _id) public payable {
		// Check if user is duplicated user
		uint256 ID = userAddressToId[msg.sender];
		require(
			ID == 0,
			"Cannot proceed as your wallet is identified as part of another couple."
		);
		// Check if user is using wallet as registered at frontend
		CoupleDetails storage couple = couples[_id];
		require(
			msg.sender == couple.user2address,
			"Please submit deposit using registered wallet."
		);
		// Check if deposit is correct
		require(msg.value >= 5 ether, "Insufficient deposit.");
		// Record details
		couple.status = "married";
		couple.user2depositAmount = 5 ether;
		userAddressToId[msg.sender] = _id;
		emit User2DepositReceived(coupleCount, msg.sender, msg.value);
	}

	function retrieveDeposit() public payable {
		// Use address to lookup ID
		uint256 ID = userAddressToId[msg.sender];
		require(ID != 0, "No records of ID found.");
		// Check if User2 has deposited; cannot use "==" for direct string comparison; instead use "keccak256" hash function to hash strings and then compare resulting hashes
		CoupleDetails storage couple = couples[ID];
		require(
			keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingDepositFromUser2")),
			"User2 has deposited. You can't withdraw now. Your vows are now bound by code."
		);
		// Refund User 1; "transfer" better than "send" cause "transfer" will revert tx on failure
		payable(msg.sender).transfer(5 ether);
		couple.status = "refundedUser1";
		couple.user1depositAmount = 0;
	}

	// Functionality related to divorces
	// **********************************
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
		payable(couple.divorceReporterAddress).transfer(2 ether);
		payable(msg.sender).transfer(1 ether);
		couple.status = "divorced and refunded";
		couple.user1depositAmount = 0;
		couple.user2depositAmount = 0;
	}

	function addDisputeDivorce(uint256 _id) public {
		uint256 ID = userAddressToId[msg.sender];
		require(ID != 0, "Please dispute divorce using registered wallet.");
		require(
			_id > 0 && _id <= coupleCount,
			"Please use a valid URL for disputing the divorce."
		);
		CoupleDetails storage couple = couples[_id];
		// Must not be reporter of divorce
		require(
			msg.sender != couple.divorceReporterAddress,
			"Cannot dispute divorce because you are the reporter of the divorce!"
		);
		couple.divorceDisputerAddress = msg.sender;
		// Check if current time is within the 7-day period after starttime
		require(
			block.timestamp <= couple.startTime + 7 days,
			"You have exceeded 7 days. Divorce case has been escalated to the jury. Please wait for their decision."
		);
		couple.status = "pendingJuryToResolveDispute";
		// Initialize struct and link id to couple id
		disputedDivorces[couple.id] = DisputedDivorceDetails({
			id: couple.id,
			votesForDivorce: 0,
			votesAgainstDivorce: 0,
			voters: new address[](0)
		});
		// Enable jury whitelist
		_enableWhitelist(_id);
	}

	// Functionality related to voting
	// ********************************
	function retrieveIpfsByJury() public view returns (string memory) {
		// Check if whitelisted as jury
		require(jury.isAllowed(msg.sender), "You are not a jury.");
		// Find and display pendingDispute cases for jury
		for (uint256 i = 1; i <= coupleCount; i++) {
			CoupleDetails storage couple = couples[i];
			if (
				keccak256(abi.encodePacked(couple.status)) ==
				keccak256(abi.encodePacked("pendingJuryToResolveDispute"))
			) {
				return couple.ipfsHash;
			}
		}
		// If no pending dispute is found, return an empty string
		return "";
	}

	function recordVotesByJury(uint256 _id, uint256 _vote) public {
		// Check if whitelisted as jury
		require(jury.isAllowed(msg.sender), "You are not a jury.");
		// Check if id exists
		DisputedDivorceDetails storage divorce = disputedDivorces[_id];
		require(divorce.id != 0, "ID does not exist.");
		// Check if vote before
		// Cannot directly access elements of array using an address as index, need to iterate through array and compare to msg.sender
		for (uint256 i = 0; i < divorce.voters.length; i++) {
			if (divorce.voters[i] == msg.sender) {
				revert("You have voted before.");
			}
		}
		// Record vote
		if (_vote == 0) {
			divorce.votesForDivorce++;
		} else {
			divorce.votesAgainstDivorce++;
		}
		// Record voter
		divorce.voters.push(msg.sender);
		// Check if quorum reach
		checkQuorum(_id);
	}

	// Helper Functions
	// ********************************
	function _enableWhitelist(uint256 _id) internal {
		jury.enableWhitelist(_id);
	}

	function _disableWhitelist(uint256 _id) internal {
		jury.disableWhitelist(_id);
	}

	function addToWhitelist(address _address) public onlyOwner {
		jury.addToWhitelist(_address);
	}

	function removeFromWhitelist(address _address) public onlyOwner {
		jury.removeFromWhitelist(_address);
	}

	function getVoters(uint256 _id) public view returns (address[] memory) {
		return disputedDivorces[_id].voters;
	}

	function checkQuorum(uint256 _id) public {
		DisputedDivorceDetails storage divorce = disputedDivorces[_id];
		uint256 votersCount = divorce.voters.length;
		uint256 whitelistedCount = jury.getWhitelistedCount();
		uint256 quorum = (whitelistedCount / 2) + 1;
		if (votersCount >= quorum) {
			tallyVotesByJury(_id);
		} else {
			return;
		}
	}

	function tallyVotesByJury(uint256 _id) public {
		require(jury.isJuryEnabled(_id) == true, "Voting has ended.");
		DisputedDivorceDetails storage divorce = disputedDivorces[_id];
		CoupleDetails storage couple = couples[_id];
		if (divorce.votesForDivorce > divorce.votesAgainstDivorce) {
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
		// Disable jury whitelist
		_disableWhitelist(_id);
	}
}
