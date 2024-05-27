import { DaoToken, Dao, Donation, Users } from "@typechains";
import { ethers, getNamedAccounts, network } from "hardhat";

const main = async () => {
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.getSigner(deployer);

  const daoToken: DaoToken = await ethers.getContract<DaoToken>("DaoToken");
  const dao: Dao = await ethers.getContract<Dao>("Dao");
  const donation: Donation = await ethers.getContract<Donation>("Donation");
  const users: Users = await ethers.getContract<Users>("Users");

  console.log("DaoToken address:", daoToken.address);
  console.log("Dao address:", dao.address);
  console.log("Donation address:", donation.address);
  console.log("Users address:", users.address);

  // 예시: 사용자 멤버십 요청
  const userAddress = signer.address;
  await users.connect(signer).requestDaoMembership();
  console.log(`${userAddress} has requested DAO membership.`);

  // 예시: 관리자 계정으로 사용자 멤버십 승인
  await dao.connect(signer).approveDaoMembership(userAddress);
  console.log(`${userAddress} has been approved for DAO membership.`);

  // 예시: 사용자 ETH -> DAO 토큰 교환
  const ethAmount = ethers.utils.parseEther("0.01");
  await users.connect(signer).exchange({ value: ethAmount });
  console.log(`Exchanged ${ethAmount.toString()} ETH for DAO tokens.`);

  // 예시: 기부 캠페인 시작
  const goal = ethers.utils.parseEther("100");
  const startAt = (await ethers.provider.getBlock("latest")).timestamp;
  const endAt = startAt + 86400; // 1일 후
  await donation.connect(signer).launch(userAddress, goal, startAt, endAt);
  console.log(`Started a donation campaign with goal ${goal.toString()} DAO tokens.`);

  // 예시: 기부하기
  const pledgeAmount = ethers.utils.parseEther("50");
  await daoToken.connect(signer).approve(donation.address, pledgeAmount);
  await donation.connect(signer).pledge(1, pledgeAmount);
  console.log(`Pledged ${pledgeAmount.toString()} DAO tokens to the campaign.`);

  // 예시: 투표 시작
  await dao.connect(signer).startVote(1);
  console.log("Started a vote for the campaign.");

  // 예시: 투표하기
  await dao.connect(signer).vote(1, true);
  console.log("Voted in favor of the campaign.");

  // 예시: 투표 종료 후 확인 및 청구
  await network.provider.send("evm_increaseTime", [3600]);
  await network.provider.send("evm_mine");
  await dao.connect(signer).finalizeVote(1);
  await donation.connect(signer).finalizeClaim(1);
  console.log("Finalized the vote and claimed the donation.");
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
