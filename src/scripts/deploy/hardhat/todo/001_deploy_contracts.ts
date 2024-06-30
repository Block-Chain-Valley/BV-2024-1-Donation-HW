//001_deploy_contracts.ts

import { hardhatInfo } from "@constants";
import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;
  const { deploy } = deployments;
  const [developer] = await ethers.getSigners();

  const DaoTokenContract = await deploy("DaoToken", {
    from: developer.address,
    contract: "DaoToken",
    args: [hardhatInfo.daoTokenName, hardhatInfo.daoTokenSymbol, hardhatInfo.exchangeRate, hardhatInfo.initialSupply],
    log: true,
    autoMine: true,
  });

  const DonationContract = await deploy("Donation", {
    from: developer.address,
    contract: "Donation",
    args: [DaoTokenContract.address],
    log: true,
    autoMine: true,
  });

  const initializeParams = [DaoTokenContract.address, DonationContract.address];

  await deploy("Dao", {
    from: developer.address,
    contract: "Dao",
    proxy: {
      execute: {
        init: {
          methodName: "initialize",
          args: initializeParams,
        },
      },
    },
    log: true,
    autoMine: true,
  });

  // 이후 업그레이드 시 사용
  // await deploy("Dao", {
  //   from: developer.address,
  //   contract: "Dao",
  //   proxy: true,
  //   log: true,
  //   autoMine: true,
  // });

  // const donation = await ethers.getContractAt("Donation", DonationContract.address);
  // await donation.connect(developer).setDaoAddress(DaoContract.address);
};

export default func;
func.tags = ["001_deploy_contracts"];
