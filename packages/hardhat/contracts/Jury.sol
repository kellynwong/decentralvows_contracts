// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

// need to whitelist by couple id

contract Jury is Ownable {
	mapping(address => bool) public whitelist;
	bool public enabled = false;
	uint256 public whitelistedCount = 0;

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
	function enableWhitelist() public onlyOwner {
		enabled = true;
	}

	function disableWhitelist() public onlyOwner {
		enabled = false;
	}

	// Get count of jury whitelisted
	function getWhitelistedCount() public view returns (uint256) {
		return whitelistedCount;
	}
}
