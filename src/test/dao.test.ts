// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
// import { setup } from "./setup";
// import { DaoToken, Dao, Donation } from "@typechains";
// import { expect } from "chai";
// import { ethers, network } from "hardhat";
// import { hardhatInfo } from "@constants";
// import { faker } from "@faker-js/faker";
// import { BigNumber } from "ethers";
// import { HardhatUtil } from "./lib/hardhat_utils";
// import { GAS_PER_TRANSACTION } from "./mock/mock";

// describe("Dao 테스트", () => {
//   /* Signer */
//   let admin: SignerWithAddress;
//   let users: SignerWithAddress[];

//   /* 컨트랙트 객체 */
//   let daoToken: DaoToken;
//   let dao: Dao;
//   let donation: Donation;

//   /* 테스트 스냅샷 */
//   let initialSnapshotId: number;
//   let snapshotId: number;

//   before(async () => {
//     /* 테스트에 필요한 컨트랙트 및 Signer 정보를 불러오는 함수 */
//     ({ admin, users, daoToken, dao, donation } = await setup());
//     initialSnapshotId = await network.provider.send("evm_snapshot");
//   });

//   beforeEach(async () => {
//     snapshotId = await network.provider.send("evm_snapshot");
//   });

//   afterEach(async () => {
//     await network.provider.send("evm_revert", [snapshotId]);
//   });

//   after(async () => {
//     await network.provider.send("evm_revert", [initialSnapshotId]);
//   });

//   it("Hardhat 환경 배포 테스트", () => {
//     expect(daoToken.address).to.not.be.undefined;
//     expect(donation.address).to.not.be.undefined;
//     expect(dao.address).to.not.be.undefined;
//   });

//   describe("DaoToken 초기화 테스트", () => {
//     it("DaoToken의 관리자가 정상적으로 설정되어 있는지 확인", async () => {
//       expect(await daoToken.admin()).to.equal(admin.address);
//     });

//     it("DaoToken의 초기 값이 정상적으로 설정되어 있는지 확인", async () => {
//       const { daoTokenName, daoTokenSymbol, exchangeRate } = hardhatInfo;
//       await Promise.all([
//         expect(await daoToken.name()).to.equal(daoTokenName),
//         expect(await daoToken.symbol()).to.equal(daoTokenSymbol),
//         expect(await daoToken.exchangeRate()).to.equal(exchangeRate),
//       ]);
//     });

//     it("DaoToken의 초기 공급량이 정상적으로 설정되어 있는지 확인", async () => {
//       const initialSupply = await daoToken.totalSupply();
//       expect(initialSupply).to.equal(hardhatInfo.initialSupply);

//       const adminBalance = await daoToken.balanceOf(admin.address);
//       expect(adminBalance).to.equal(initialSupply);
//     });
//   });

//   describe("Mint 함수 테스트", () => {
//     const amount = ethers.utils.parseEther(faker.datatype.number({ min: 1, max: 100 }).toString());

//     it("DaoToken의 mint 함수가 정상적으로 동작하는지 확인", async () => {
//       await daoToken.connect(admin).mint(users[0].address, amount);
//       const balance = await daoToken.balanceOf(users[0].address);
//       expect(balance).to.equal(amount);
//     });

//     it("DaoToken의 mint 함수가 관리자만 사용 가능한지 확인", async () => {
//       await expect(daoToken.connect(users[0]).mint(users[0].address, amount)).to.be.revertedWith(
//         "Only admin can mint tokens",
//       );
//     });
//   });

//   describe("BuyToken 함수 테스트", () => {
//     const amount = ethers.utils.parseEther(faker.datatype.number({ min: 1, max: 100 }).toString());

//     it("DaoToken의 buyToken 함수에서 잔고가 부족한 경우 실패하는지 확인", async () => {
//       await expect(daoToken.connect(users[0]).buyTokens()).to.be.revertedWith("You must send ETH to buy tokens");
//     });

//     it("DaoToken의 buyToken 함수 실행 시 가치 교환이 정상적으로 이루어지는지 확인", async () => {
//       await daoToken.connect(users[0]).buyTokens({ value: amount });

//       /* 사용자의 토큰 잔고 확인 */
//       const balance = await daoToken.balanceOf(users[0].address);
//       const expectedTokenBalance = HardhatUtil.divExp(amount.mul(hardhatInfo.exchangeRate));
//       expect(balance).to.equal(expectedTokenBalance);

//       /* 컨트랙트의 ETH 잔고 확인 */
//       const contractBalance = await daoToken.getContractBalance();
//       expect(contractBalance).to.equal(amount);
//     });

//     it("DaoToken의 buyToken 함수 실행 시 이벤트가 정상적으로 발생하는지 확인", async () => {
//       const expectedTokenBalance = HardhatUtil.divExp(amount.mul(hardhatInfo.exchangeRate));

//       await expect(daoToken.connect(users[0]).buyTokens({ value: amount }))
//         .to.emit(daoToken, "TokensPurchased")
//         .withArgs(users[0].address, amount, expectedTokenBalance); // 1 ETH => 100,000 DAO
//     });
//   });

//   describe("SellToken 함수 테스트", () => {
//     let tokenBalance: BigNumber;
//     beforeEach(async () => {
//       /* 토큰 구매 */
//       const amount = ethers.utils.parseEther(faker.datatype.number({ min: 1, max: 100 }).toString());
//       await daoToken.connect(users[0]).buyTokens({ value: amount });
//       tokenBalance = await daoToken.balanceOf(users[0].address);
//     });

//     it("DaoToken의 sellToken 함수 실행 시 이벤트가 정상적으로 발생하는지 확인", async () => {
//       const expectedETHAmount = HardhatUtil.mulExp(tokenBalance).div(hardhatInfo.exchangeRate);

//       await expect(daoToken.connect(users[0]).sellTokens(tokenBalance))
//         .to.emit(daoToken, "TokensWithdrawn")
//         .withArgs(users[0].address, expectedETHAmount);
//     });

//     it("sellToken 함수 실행 시 정상적으로 가치 교환이 이루어지는지 확인", async () => {
//       const expectedETHAmount = HardhatUtil.mulExp(tokenBalance).div(hardhatInfo.exchangeRate);
//       const balanceBefore = await ethers.provider.getBalance(users[0].address);

//       await daoToken.connect(users[0]).sellTokens(tokenBalance);

//       /* 사용자의 토큰 잔고 확인 */
//       const balanceAfter = await ethers.provider.getBalance(users[0].address);
//       expect(balanceAfter).to.closeTo(balanceBefore.add(expectedETHAmount), GAS_PER_TRANSACTION);

//       /* 컨트랙트의 ETH 잔고 확인 */
//       const contractBalance = await daoToken.getContractBalance();
//       expect(contractBalance).to.equal(0);
//     });

//     it("DaoToken의 sellToken 함수에서 잔고가 부족한 경우 실패하는지 확인", async () => {
//       await daoToken.connect(users[0]).sellTokens(tokenBalance);
//       await expect(daoToken.connect(users[0]).sellTokens(tokenBalance)).to.be.revertedWith("Insufficient balance");
//     });
//   });

//   it("ExchangeRate 변경이 정상적으로 이루어지는지 확인", async () => {
//     const newExchangeRate = ethers.utils.parseEther(faker.datatype.float({ min: 0.01, max: 1 }).toString());
//     await daoToken.connect(admin).setExchangeRate(newExchangeRate);

//     expect(await daoToken.exchangeRate()).to.equal(newExchangeRate);
//   });

//   describe("DAO 멤버십 테스트", () => {
//     const membershipAmount = ethers.utils.parseEther("100");

//     it("DAO 멤버십 요청이 정상적으로 동작하는지 확인", async () => {
//       const user = users[0];
//       await daoToken.connect(admin).transfer(user.address, membershipAmount);
//       await dao.connect(user).requestDaoMembership();

//       const requestStatus = await dao.membershipRequestStatus(user.address);
//       expect(requestStatus).to.equal(0); // PENDING 상태
//     });

//     it("DAO 멤버십 승인 테스트", async () => {
//       const user = users[0];
//       await daoToken.connect(admin).transfer(user.address, membershipAmount);
//       await dao.connect(user).requestDaoMembership();
//       await dao.connect(admin).handleDaoMembership(user.address, true);

//       const isMember = await dao.isDaoMember(user.address);
//       expect(isMember).to.be.true;

//       const daoMemberList = await dao.getDaoList();
//       expect(daoMemberList).to.include(user.address);
//     });

//     it("DAO 멤버십 거절 테스트", async () => {
//       const user = users[1];
//       await daoToken.connect(admin).transfer(user.address, membershipAmount);
//       await dao.connect(user).requestDaoMembership();
//       await dao.connect(admin).handleDaoMembership(user.address, false);

//       const isMember = await dao.isDaoMember(user.address);
//       expect(isMember).to.be.false;

//       const requestStatus = await dao.membershipRequestStatus(user.address);
//       expect(requestStatus).to.equal(2); // REJECTED 상태
//     });

//     describe("투표 기능 테스트", () => {
//       const goalAmount = ethers.utils.parseEther("1000");
//       const totalAmount = ethers.utils.parseEther("500");
//       let campaignId: number;

//       beforeEach(async () => {
//         // 새로운 캠페인을 생성하고 기부를 수행합니다.
//         await donation.connect(admin).launch(
//           users[0].address, // 타겟
//           "테스트 캠페인", // 제목
//           "테스트용 캠페인 설명", // 설명
//           goalAmount, // 목표 금액
//           Math.floor(new Date().getTime() / 1000) + 100, // 시작 시간
//           Math.floor(new Date().getTime() / 1000) + 200, // 종료 시간
//         );
//         campaignId = 1; // 캠페인 ID는 1로 설정했다고 가정합니다.

//         await donation.connect(admin).pledge(campaignId, totalAmount);
//       });

//       it("투표 시작 테스트", async () => {
//         await dao.connect(admin).startVote(campaignId);

//         const inProgress = await dao.voteInProgress(campaignId);
//         expect(inProgress).to.be.true;
//       });

//       it("투표 진행 중에 다시 시작하려고 하면 실패하는지 확인", async () => {
//         await dao.connect(admin).startVote(campaignId);
//         await expect(dao.connect(admin).startVote(campaignId)).to.be.revertedWith("Vote is already in progress");
//       });

//       it("투표 종료 테스트", async () => {
//         const user = users[0];
//         await daoToken.connect(admin).transfer(user.address, membershipAmount);
//         await dao.connect(user).requestDaoMembership();
//         await dao.connect(admin).handleDaoMembership(user.address, true);

//         await dao.connect(admin).startVote(campaignId);
//         await dao.connect(user).vote(campaignId, true);

//         const inProgress = await dao.voteInProgress(campaignId);
//         expect(inProgress).to.be.false;

//         const voteCountYes = await dao.voteCountYes(campaignId);
//         expect(voteCountYes).to.equal(1);
//       });

//       it("중복 투표가 불가능한지 확인", async () => {
//         const user = users[0];
//         await daoToken.connect(admin).transfer(user.address, membershipAmount);
//         await dao.connect(user).requestDaoMembership();
//         await dao.connect(admin).handleDaoMembership(user.address, true);

//         await dao.connect(admin).startVote(campaignId);
//         await dao.connect(user).vote(campaignId, true);
//         await expect(dao.connect(user).vote(campaignId, true)).to.be.revertedWith("User has already voted");
//       });
//     });
//   });
// });
