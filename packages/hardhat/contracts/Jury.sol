// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Jury is Ownable {
	// State variable
	uint256 public juryCount = 0;

	// Struct
	struct DisputedDivorceDetails {
		uint256 id;
		uint256 votesForDivorce;
		uint256 votesAgainstDivorce;
		address[] voters;
		bool votingIsLive;
	}

	// Mappings
	mapping(address => bool) public whitelist;
	mapping(uint256 => DisputedDivorceDetails) public disputedDivorces;

	// Event
	event quorumReached(uint256 indexed id);

	// Functionality related to adding dispute details
	// ==========================================================
	function addDisputedDivorceDetails(uint256 _id) public {
		disputedDivorces[_id] = DisputedDivorceDetails({
			id: _id,
			votesForDivorce: 0,
			votesAgainstDivorce: 0,
			voters: new address[](0),
			votingIsLive: true
		});
	}

	// Functionality related to voting
	// ==========================================================
	function recordVotesByJury(uint256 _id, uint256 _vote) public {
		DisputedDivorceDetails storage divorce = disputedDivorces[_id];

		// Check if address is jury member
		require(
			checkAddressIsJury(msg.sender),
			"Cannot vote. Address has not been whitelisted to be a jury."
		);
		// Check if id exists
		require(divorce.id != 0, "ID does not exist.");

		// Check if voted before; note cannot directly access elements of array using an address as index, need to iterate through array and compare to msg.sender
		for (uint256 i = 0; i < divorce.voters.length; i++) {
			if (divorce.voters[i] == msg.sender) {
				revert("Cannot vote again.");
			}
		}
		// Check that voting is live
		require(
			divorce.votingIsLive == true,
			"Cannot vote. Voting has closed."
		);
		// Record vote
		if (_vote == 0) {
			divorce.votesForDivorce++;
		} else {
			divorce.votesAgainstDivorce++;
		}
		// Record voter
		divorce.voters.push(msg.sender);
		// Calculate quorum
		DisputedDivorceDetails storage divorceAfterVoting = disputedDivorces[
			_id
		];
		uint256 votersCount = divorceAfterVoting.voters.length;
		uint256 totalJury = getJuryCount();
		uint256 quorum = (totalJury / 2) + 1;
		if (votersCount >= quorum) {
			divorceAfterVoting.votingIsLive = false;
			emit quorumReached(_id);
		}
	}

	// Get results of voting
	function getResults(uint256 _id) public view returns (uint256) {
		DisputedDivorceDetails storage divorce = disputedDivorces[_id];
		if (divorce.votesForDivorce > divorce.votesAgainstDivorce) {
			return 0;
		} else {
			return 1;
		}
	}

	// Functionality related to managing jury
	// ==========================================================
	function addToWhitelist(address account) public onlyOwner {
		// Check if the address is already whitelisted
		require(!whitelist[account], "Address is already whitelisted");
		whitelist[account] = true;
		juryCount++;
	}

	function removeFromWhitelist(address account) public onlyOwner {
		// Check if the address is in the whitelist
		require(whitelist[account], "Address is not whitelisted");
		delete whitelist[account];
		juryCount--;
	}

	// Check if address is whitelisted as jury
	function checkAddressIsJury(address account) public view returns (bool) {
		return whitelist[account];
	}

	// Get count of jury
	function getJuryCount() public view returns (uint256) {
		return juryCount;
	}

	// Get voters
	function getVoters(uint256 _id) public view returns (address[] memory) {
		return disputedDivorces[_id].voters;
	}
}
