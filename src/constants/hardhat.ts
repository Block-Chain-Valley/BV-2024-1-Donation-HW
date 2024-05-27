import { ethers } from "hardhat";

export const hardhatInfo = {
  daoTokenName: "DaoToken",
  daoTokenSymbol: "DAO",
  exchangeRate: ethers.utils.parseEther("0.01"), // 1 ETH = 100 DAO
  initialSupply: ethers.utils.parseEther("1000"), // 1000 DAO
};
