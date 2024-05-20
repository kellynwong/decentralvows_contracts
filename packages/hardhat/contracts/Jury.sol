// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Jury is Ownable {
	// State variables
	bool public enabled = false;
	uint256 public whitelistedCount = 0;

	// Mappings
	mapping(address => bool) public whitelist;
	mapping(uint256 => bool) public isJuryEnabled;

	function addToWhitelist(address account) public onlyOwner {
		// Check if the address is already whitelisted
		require(!whitelist[account], "Address is already whitelisted");
		whitelist[account] = true;
		whitelistedCount++;
	}

	function removeFromWhitelist(address account) public onlyOwner {
		// Check if the address is in the whitelist
		require(whitelist[account], "Address is not whitelisted");
		delete whitelist[account];
		whitelistedCount--;
	}

	function isAllowed(address account) public view returns (bool) {
		if (enabled) {
			return whitelist[account];
		}
		return true;
	}

	// Enable/Disable
	function enableWhitelist(uint256 _id) public onlyOwner {
		isJuryEnabled[_id] = true;
	}

	function disableWhitelist(uint256 _id) public onlyOwner {
		isJuryEnabled[_id] = false;
	}

	// Get count of jury whitelisted
	function getWhitelistedCount() public view returns (uint256) {
		return whitelistedCount;
	}
}
