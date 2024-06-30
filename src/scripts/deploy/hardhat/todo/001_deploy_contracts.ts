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
          methodName: "initialize", // initializer modifier가 붙은 함수의 이름
          args: initializeParams, // initialize 실행 시 필요한 파라미터, 배열로 전달
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
  //이곳에 코드를 추가할 예정입니다.
};

export default func;
func.tags = ["001_deploy_contracts"];
