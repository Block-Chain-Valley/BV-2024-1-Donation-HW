// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface DaoTokenInterface {
    function transfer(address recipient, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function mint(address to, uint256 amount) external;

    function buyTokens() external view returns (uint256);

    function sellTokens(uint256 amount) external view returns (uint256);

    function getContractBalance() external view returns (uint256);
}
