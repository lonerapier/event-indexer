// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SampleToken is ERC20 {
	constructor() ERC20("SampleToken", "ST") {
		_mint(msg.sender, 1e18);
	}
}