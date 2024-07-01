// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
// import { setup } from "./setup";
// import { DaoToken, Dao, Donation } from "@typechains";
// import { expect } from "chai";
// import { ethers, network } from "hardhat";
// import { hardhatInfo } from "@constants";
// import { faker } from "@faker-js/faker";
// import { BigNumber } from "ethers";
// import { HardhatUtil } from "./lib/hardhat_utils";
// import { GAS_PER_TRANSACTION, mockCampaign } from "./mock/mock";

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
//     expect(dao.address).to.not.be.undefined;
//     expect(donation.address).to.not.be.undefined;
//   });

//   describe("startVote 함수 테스트", () => {
//     beforeEach(async () => {
//       const campaignData = mockCampaign();
//       const { target, title, description, goal, startAt, endAt } = campaignData;
//       await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
//     });

//     it("이미 진행 중인 투표에 대해 실패하는지 확인", async () => {
//       const campaignId = 1;
//       await dao.connect(admin).startVote(campaignId);
//       await expect(dao.connect(admin).startVote(campaignId)).to.be.revertedWith(
//         "A vote is already in progress for this campaign",
//       );
//     });

//     it("캠패인 정보가 정상적으로 등록되는지 확인", async () => {
//       const campaignId = 1;
//       await dao.connect(admin).startVote(campaignId);

//       expect(await dao.voteCountYes(campaignId)).to.equal(0);
//       expect(await dao.voteCountNo(campaignId)).to.equal(0);
//       expect(await dao.voteInProgress(campaignId)).to.equal(true);
//     });

//     it("VoteStarted 이벤트가 정상적으로 발생하는지 확인", async () => {
//       const campaignId = 1;
//       const campaignData = await donation.getCampaign(campaignId);
//       const { goal, pledged } = campaignData;

//       await expect(dao.connect(admin).startVote(campaignId))
//         .to.emit(dao, "VoteStarted")
//         .withArgs(campaignId, goal, pledged);
//     });
//   });

//   describe("vote 함수 테스트", () => {
//     beforeEach(async () => {
//       const campaignData = mockCampaign();
//       const { target, title, description, goal, startAt, endAt } = campaignData;
//       await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
//       await dao.connect(users[0]).requestDaoMembership();
//       await dao.connect(admin).handleDaoMembership(users[0].address, true);
//       await dao.connect(admin).startVote(1);
//     });

//     it("DAO 멤버가 아닌 사용자가 투표할 수 없는지 확인", async () => {
//       await expect(dao.connect(users[2]).vote(1, true)).to.be.revertedWith("Only Dao members can perform this action");
//     });

//     it("투표가 진행 중이지 않을 때 실패하는지 확인", async () => {
//       const newCampaignId = 2;
//       await expect(dao.connect(users[0]).vote(newCampaignId, true)).to.be.revertedWith(
//         "No vote in progress for this campaign.",
//       );
//     });

//     it("이미 투표한 경우 실패하는 지 확인", async () => {
//       await dao.connect(users[0]).vote(1, true);
//       await expect(dao.connect(users[0]).vote(1, false)).to.be.revertedWith("You have already voted.");
//     });

//     it("찬성 투표 결과가 반영되는지 확인", async () => {
//       await dao.connect(users[0]).vote(1, true);

//       const yesVotes = await dao.voteCountYes(1);
//       expect(yesVotes).to.equal(BigNumber.from(1));

//       const noVotes = await dao.voteCountNo(1);
//       expect(noVotes).to.equal(BigNumber.from(0));
//     });

//     it("반대 투표 결과가 반영되는지 확인", async () => {
//       await dao.connect(users[0]).vote(1, false);

//       const yesVotes = await dao.voteCountYes(1);
//       expect(yesVotes).to.equal(BigNumber.from(0));

//       const noVotes = await dao.voteCountNo(1);
//       expect(noVotes).to.equal(BigNumber.from(1));
//     });

//     // Solidity에서 내부 함수 호출을 직접적으로 확인 불가
//     // voteEnd 함수 내에서 발생하는 이벤트를 통해 호출 여부를 검증
//     it("모든 DAO 멤버가 투표를 완료했을 때 voteEnd가 호출되는지 확인", async () => {
//       // 새로운 사용자를 추가하여 총 2명의 DAO 멤버가 되도록 설정
//       await dao.connect(users[1]).requestDaoMembership();
//       await dao.connect(admin).handleDaoMembership(users[1].address, true);
//       const daoMembers = await dao.connect(admin).getDaoList();
//       expect(daoMembers).to.include.members([users[0].address, users[1].address]);
//       expect(daoMembers.length).to.equal(2);

//       await dao.connect(users[0]).vote(1, true);
//       expect(await dao.voteInProgress(1)).to.equal(true); // 투표가 진행 중인지 확인

//       const lastVoteTx = await dao.connect(users[1]).vote(1, false);
//       expect(await dao.voteInProgress(1)).to.equal(false); // 투표가 종료되었는지 확인

//       const voteYes = await dao.voteCountYes(1);
//       const agreePercentage = voteYes.mul(ethers.utils.parseUnits("1", 18)).div(2);

//       await expect(lastVoteTx)
//         .to.emit(dao, "VoteEnded")
//         .withArgs(1, false, agreePercentage, "The campaign was declined for claim.");
//     });
//     it("Voted 이벤트가 발생하는지 확인", async () => {
//       await expect(dao.connect(users[0]).vote(1, true)).to.emit(dao, "Voted").withArgs(1, users[1].address, true);
//     });
//   });

//   describe("voteEnd 함수 테스트", () => {
//     beforeEach(async () => {
//       // 새로운 사용자를 추가하여 총 2명의 DAO 멤버가 되도록 설정
//       await dao.connect(admin).handleDaoMembership(users[2].address, true);
//       const daoMembers = await dao.connect(admin).getDaoList();
//       expect(daoMembers).to.include.members([users[1].address, users[2].address]);
//       expect(daoMembers.length).to.equal(2);

//       const campaignData = mockCampaign();
//       const { target, title, description, goal, startAt, endAt } = campaignData;
//       await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
//     });

//     it("투표가 종료되지 않은 상태에서 voteEnd가 호출되려 할 때 실패하는지 확인", async () => {
//       await dao.connect(admin).startVote(1);

//       await dao.connect(users[1]).vote(1, true);
//       expect(await dao.voteInProgress(1)).to.equal(true);

//       await expect(dao.connect(users[1]).vote(1, true)).to.not.emit(dao, "VoteEnded");
//     });

//     it("투표 종료 후 찬성 비율이 70% 미만인 경우 claim이 거부되는지 확인", async () => {
//       await dao.connect(admin).startVote(1);

//       await dao.connect(users[1]).vote(1, false);
//       const lastVoteTx = await dao.connect(users[2]).vote(1, false);

//       expect(await dao.voteInProgress(1)).to.equal(false);

//       const voteYes = await dao.voteCountYes(1);
//       const agreePercentage = voteYes.mul(ethers.utils.parseUnits("1", 18)).div(2);

//       await expect(lastVoteTx)
//         .to.emit(dao, "VoteEnded")
//         .withArgs(1, false, agreePercentage, "The campaign was declined for claim.");
//     });

//     it("투표 종료 후 찬성 비율이 70% 이상인 경우 claim이 승인되는지 확인", async () => {
//       await dao.connect(admin).startVote(1);

//       await dao.connect(users[1]).vote(1, true);
//       const lastVoteTx = await dao.connect(users[2]).vote(1, true);

//       expect(await dao.voteInProgress(1)).to.equal(false);

//       const voteYes = await dao.voteCountYes(1);
//       const agreePercentage = voteYes.mul(ethers.utils.parseUnits("1", 18)).div(2);

//       // donation.claim 호출 여부 확인 (확인을 위해 spy 또는 stub을 사용할 수 있습니다)
//       await expect(lastVoteTx)
//         .to.emit(donation, "CampaignClaimed") // CampaignClaimed 이벤트가 발생하는지 확인
//         .withArgs(1); // 캠페인 ID

//       await expect(lastVoteTx)
//         .to.emit(dao, "VoteEnded")
//         .withArgs(1, true, agreePercentage, "The campaign has been approved for claim.");
//     });
//   });

//   describe("setDaoMembershipAmount 함수 테스트", () => {
//     it("관리자가 daoMembershipAmount를 설정할 수 있는지 확인", async () => {
//       const newAmount = ethers.utils.parseEther("100");
//       await dao.connect(admin).setDaoMembershipAmount(newAmount);

//       const amount = await dao.daoMembershipAmount();
//       expect(amount).to.equal(newAmount);
//     });

//     it("관리자가 아닌 사용자가 시도할 때 실패하는지 확인", async () => {
//       const newAmount = ethers.utils.parseEther("100");

//       await expect(dao.connect(users[1]).setDaoMembershipAmount(newAmount)).to.be.revertedWith(
//         "Only admin can perform this action",
//       );

//       const amount = await dao.daoMembershipAmount();
//       expect(amount).to.not.equal(newAmount);
//     });
//   });
//   describe("requestDaoMembership 함수 테스트", () => {
//     beforeEach(async () => {
//       await daoToken.mint(users[1].address, ethers.utils.parseUnits("100", 18));
//       const daoMembershipAmount = ethers.utils.parseUnits("50", 18);

//       await dao.connect(admin).setDaoMembershipAmount(daoMembershipAmount);
//     });

//     it("이미 DAO 멤버인 경우 실패하는지 확인", async () => {
//       await dao.connect(admin).handleDaoMembership(users[1].address, true);
//       await expect(dao.connect(users[1]).requestDaoMembership()).to.be.revertedWith("User is already a Dao member.");
//     });

//     it("DAO 토큰 수량이 부족한 경우 실패하는지 확인", async () => {
//       await daoToken.connect(users[1]).transfer(admin.address, ethers.utils.parseUnits("60", 18));

//       await expect(dao.connect(users[1]).requestDaoMembership()).to.be.revertedWith("Insufficient Dao tokens");
//     });

//     it("DAO 멤버가 아니고 충분한 토큰을 보유한 경우 성공하는지 확인", async () => {
//       await expect(dao.connect(users[1]).requestDaoMembership()).to.not.be.reverted;

//       const requestStatus = await dao.membershipRequestStatus(users[1].address);
//       expect(requestStatus).to.equal(1);
//     });

//     it("요청 성공시 DaoMembershipRequested 이벤트가 발생하는지 확인", async () => {
//       await expect(dao.connect(users[1]).requestDaoMembership())
//         .to.emit(dao, "DaoMembershipRequested")
//         .withArgs(users[1].address, "User has requested DAO membership");
//     });
//   });

//   describe("handleDaoMembership 함수 테스트", () => {
//     beforeEach(async () => {
//       await dao.connect(users[0]).requestDaoMembership();
//     });
//     it("관리자가 아닌 사용자가 시도할 때 실패하는지 확인", async () => {
//       await expect(dao.connect(users[0]).handleDaoMembership(users[0].address, true)).to.be.revertedWith(
//         "Only admin can perform this action",
//       );
//     });
//     it("이미 DAO 멤버인 사용자의 멤버십 신청을 처리할 때 실패하는지 확인", async () => {
//       await dao.connect(admin).handleDaoMembership(users[0].address, true);

//       const isMember = await dao.isDaoMember(users[0].address);
//       expect(isMember).to.be.true;

//       const requestStatus = await dao.membershipRequestStatus(users[0].address);
//       expect(requestStatus).to.equal(2);

//       await expect(dao.connect(admin).handleDaoMembership(users[0].address, true)).to.be.revertedWith(
//         "No pending request",
//       );
//     });
//     it("관리자가 멤버십 신청을 승인할 수 있는지 확인", async () => {
//       await dao.connect(admin).handleDaoMembership(users[0].address, true);

//       const isMember = await dao.isDaoMember(users[0].address);
//       expect(isMember).to.be.true;

//       const requestStatus = await dao.membershipRequestStatus(users[0].address);
//       expect(requestStatus).to.equal(2);

//       await expect(dao)
//         .to.emit(dao, "DaoMembershipApproved")
//         .withArgs(users[0].address, "User has been approved as a Dao member");
//     });

//     it("관리자가 멤버십 신청을 거절할 수 있는지 확인", async () => {
//       await dao.connect(admin).handleDaoMembership(users[0].address, false);

//       const isMember = await dao.isDaoMember(users[0].address);
//       expect(isMember).to.be.false;

//       const requestStatus = await dao.membershipRequestStatus(users[0].address);
//       expect(requestStatus).to.equal(3);

//       await expect(dao)
//         .to.emit(dao, "DaoMembershipRejected")
//         .withArgs(users[0].address, "User has been rejected as a Dao member");
//     });
//   });
//   describe("removeDaoMembership 함수 테스트", () => {
//     beforeEach(async () => {
//       await dao.connect(admin).handleDaoMembership(users[0].address, true);
//       await dao.connect(admin).handleDaoMembership(users[1].address, true);
//     });

//     it("DAO 멤버가 아닌 사용자를 삭제할 때 실패하는지 확인", async () => {
//       await expect(dao.connect(admin).removeDaoMembership(users[2].address)).to.be.revertedWith(
//         "User is not a Dao member.",
//       );
//     });

//     it("DAO 멤버를 삭제할 때 daoMemberList가 제대로 업데이트되는지 확인", async () => {
//       await dao.connect(admin).removeDaoMembership(users[0].address);

//       const isMember = await dao.isDaoMember(users[0].address);
//       expect(isMember).to.be.false;

//       const daoMembers = await dao.getDaoList();
//       expect(daoMembers).to.not.include(users[0].address);
//     });

//     it("DAO 멤버를 삭제할 때 DaoMembershipRemoved 이벤트를 emit하는지 확인", async () => {
//       const tx = await dao.connect(admin).removeDaoMembership(users[0].address);

//       await expect(tx)
//         .to.emit(dao, "DaoMembershipRemoved")
//         .withArgs(users[0].address, "User has been removed from Dao membership");
//     });

//     it("마지막 DAO 멤버를 삭제할 때 daoMemberList가 제대로 업데이트되는지 확인", async () => {
//       await dao.connect(admin).removeDaoMembership(users[1].address);

//       const isMember = await dao.isDaoMember(users[1].address);
//       expect(isMember).to.be.false;

//       const daoMembers = await dao.getDaoList();
//       expect(daoMembers).to.not.include(users[1].address);
//     });
//   });
// });
