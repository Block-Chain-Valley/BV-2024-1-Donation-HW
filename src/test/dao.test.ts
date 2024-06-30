import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { setup } from "./setup";
import { DaoToken, Dao, Donation } from "@typechains";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { hardhatInfo } from "@constants";
import { faker } from "@faker-js/faker";
import { BigNumber } from "ethers";
import { HardhatUtil } from "./lib/hardhat_utils";
import { GAS_PER_TRANSACTION } from "./mock/mock";
import { mockCampaign } from "./mock/mock";

describe("Dao 테스트", () => {
  /* Signer */
  let admin: SignerWithAddress;
  let users: SignerWithAddress[];

  /* 컨트랙트 객체 */
  let daoToken: DaoToken;
  let dao: Dao;
  let donation: Donation;

  /* 테스트 스냅샷 */
  let initialSnapshotId: number;
  let snapshotId: number;

  before(async () => {
    /* 테스트에 필요한 컨트랙트 및 Signer 정보를 불러오는 함수 */
    ({ admin, users, daoToken, donation, dao } = await setup());
    initialSnapshotId = await network.provider.send("evm_snapshot");
  });

  beforeEach(async () => {
    snapshotId = await network.provider.send("evm_snapshot");
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [snapshotId]);
  });

  after(async () => {
    await network.provider.send("evm_revert", [initialSnapshotId]);
  });

  it("Hardhat 환경 배포 테스트", () => {
    expect(daoToken.address).to.not.be.undefined;
    expect(donation.address).to.not.be.undefined;
    expect(dao.address).to.not.be.undefined;
  });

  describe("startVote 테스트", () => {
    beforeEach(async () => {
      const campaignData = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignData;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
    });

    it("startVote 함수가 이미 진행 중인 투표에 대해 실패하는지 확인", async () => {
      const campaignId = 1;
      await dao.connect(admin).startVote(campaignId);
      await expect(dao.connect(admin).startVote(campaignId)).to.be.revertedWith(
        "A vote is already in progress for this campaign.",
      );
    });

    it("startVote 함수 실행 후 캠페인 정보가 정상적으로 등록되는지 확인", async () => {
      const campaignId = 1;

      await dao.connect(admin).startVote(campaignId);

      expect(await dao.voteCountYes(campaignId)).to.equal(0);
      expect(await dao.voteCountNo(campaignId)).to.equal(0);
      expect(await dao.voteInProgress(campaignId)).to.equal(true);
    });

    it("startVote 함수 실행 후 이벤트가 발생하는지 확인", async () => {
      const campaignId = 1;
      const campaignData = await donation.getCampaign(campaignId);
      const { goal, pledged } = campaignData;

      await expect(dao.connect(admin).startVote(campaignId))
        .to.emit(dao, "VoteStarted")
        .withArgs(campaignId, goal, pledged);
    });
  });

  describe("vote 테스트", () => {
    beforeEach(async () => {
      const campaignData = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignData;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      await dao.connect(admin).handleDaoMembership(users[1].address, true);
    });

    it("vote 함수가 in Progress가 아닐 때 실패하는지 확인", async () => {
      const campaignId = 1;
      const agree = faker.datatype.boolean();
      await expect(dao.connect(users[1]).vote(campaignId, agree)).to.be.revertedWith(
        "No vote in progress for this campaign.",
      );
    });

    it("vote 함수가 이미 투표한 경우 실패하는지 확인", async () => {
      const campaignId = 1;
      const agree = faker.datatype.boolean();
      await dao.connect(users[0]).startVote(campaignId);
      await dao.connect(admin).handleDaoMembership(users[1].address, true);
      await dao.connect(users[1]).vote(campaignId, agree);
      await expect(dao.connect(users[1]).vote(campaignId, agree)).to.be.revertedWith("You have already voted.");
    });

    it("vote 함수에 찬성 투표 결과가 반영되는지 확인", async () => {
      const campaignId = 1;
      await dao.connect(users[0]).startVote(campaignId);
      await dao.connect(admin).handleDaoMembership(users[1].address, true);
      const initialYesVotes = await dao.voteCountYes(campaignId);
      const initialNoVotes = await dao.voteCountNo(campaignId);

      await dao.connect(users[1]).vote(campaignId, true);

      const finalYesVotes = await dao.voteCountYes(campaignId);
      const finalNoVotes = await dao.voteCountNo(campaignId);

      expect(await dao.hasVoted(campaignId, users[1].address)).to.equal(true);
      expect(finalYesVotes).to.equal(initialYesVotes.add(1));
      expect(finalNoVotes).to.equal(initialNoVotes);
    });

    it("vote 함수에 반대 투표 결과가 반영되는지 확인", async () => {
      await dao.connect(users[0]).startVote(1);
      const campaignId = 1;
      const initialYesVotes = await dao.voteCountYes(campaignId);
      const initialNoVotes = await dao.voteCountNo(campaignId);

      await dao.connect(users[1]).vote(campaignId, false);

      const finalYesVotes = await dao.voteCountYes(campaignId);
      const finalNoVotes = await dao.voteCountNo(campaignId);

      expect(await dao.hasVoted(campaignId, users[1].address)).to.equal(true);
      expect(finalYesVotes).to.equal(initialYesVotes);
      expect(finalNoVotes).to.equal(initialNoVotes.add(1));
    });

    it("vote 함수 실행 후 이벤트가 발생하는지 확인", async () => {
      await dao.connect(users[0]).startVote(1);
      await dao.connect(admin).handleDaoMembership(users[1].address, true);
      const campaignId = 1;
      const agree = faker.datatype.boolean();

      await expect(dao.connect(users[1]).vote(campaignId, agree))
        .to.emit(dao, "Voted")
        .withArgs(campaignId, users[1].address, agree);
    });
  });

  describe("requestDaoMembership 테스트", () => {
    it("requestDaoMembership 함수가 이미 DAO 멤버인 경우 실패하는지 확인", async () => {
      await dao.connect(admin).handleDaoMembership(users[0].address, true);
      await expect(dao.connect(users[0]).requestDaoMembership()).to.be.revertedWith("User is already a DAO member");
    });

    // it("requestDaoMembership 함수가 DAO 토큰 잔액이 부족한 경우 실패하는지 확인", async () => {
    //   const daoMembershipAmount = await dao.daoMembershipAmount();
    //   const insufficientAmount = daoMembershipAmount.sub(BigNumber.from(1));
    //   await daoToken.transfer(users[1].address, insufficientAmount);
    //   await expect(dao.connect(users[1]).requestDaoMembership()).to.be.revertedWith("Insufficient DAO tokens");
    // });

    it("requestDaoMembership 함수가 정상적으로 실행되는지 확인", async () => {
      await daoToken.transfer(users[1].address, BigNumber.from(100));
      dao.daoMembershipAmount();
      await expect(dao.connect(users[1]).requestDaoMembership())
        .to.emit(dao, "DaoMembershipRequested")
        .withArgs(users[1].address, "User has requested DAO membership");

      const membershipRequests = await dao.getMembershipRequests();
      expect(membershipRequests).to.include(users[1].address);
      expect(await dao.membershipRequestStatus(users[1].address)).to.equal(1); // PENDING 상태
    });
  });

  describe("handleDaoMembership 테스트", () => {
    beforeEach(async () => {
      const daoMembershipAmount = await dao.daoMembershipAmount();
      await daoToken.transfer(users[1].address, daoMembershipAmount);
      await dao.connect(users[1]).requestDaoMembership();
    });

    it("handleDaoMembership 함수가 관리자가 아닌 경우 실패하는지 확인", async () => {
      await expect(dao.connect(users[0]).handleDaoMembership(users[1].address, true)).to.be.revertedWith(
        "Only admin can perform this action",
      );
    });

    it("handleDaoMembership 함수가 DAO 멤버십 신청을 승인하는 경우", async () => {
      await expect(dao.connect(admin).handleDaoMembership(users[1].address, true))
        .to.emit(dao, "DaoMembershipApproved")
        .withArgs(users[1].address, "User has been approved as a DAO member");

      const daoMemberList = await dao.getDaoList();
      expect(daoMemberList).to.include(users[1].address);
      expect(await dao.isDaoMember(users[1].address)).to.equal(true);
      expect(await dao.membershipRequestStatus(users[1].address)).to.equal(2); // APPROVED 상태
    });

    it("handleDaoMembership 함수가 DAO 멤버십 신청을 거절하는 경우", async () => {
      await expect(dao.connect(admin).handleDaoMembership(users[1].address, false))
        .to.emit(dao, "DaoMembershipRejected")
        .withArgs(users[1].address, "User has been rejected as a DAO member");

      expect(await dao.isDaoMember(users[1].address)).to.equal(false);
      expect(await dao.membershipRequestStatus(users[1].address)).to.equal(3); // REJECTED 상태
    });
  });

  describe("removeDaoMembership 테스트", () => {
    beforeEach(async () => {
      const daoMembershipAmount = await dao.daoMembershipAmount();
      await daoToken.transfer(users[1].address, daoMembershipAmount);
      await dao.connect(users[1]).requestDaoMembership();
      await dao.connect(admin).handleDaoMembership(users[1].address, true);
    });

    it("removeDaoMembership 함수가 DAO 멤버가 아닌 경우 실패하는지 확인", async () => {
      await expect(dao.connect(admin).removeDaoMembership(users[2].address)).to.be.revertedWith(
        "User is not a DAO member",
      );
    });

    it("removeDaoMembership 함수가 정상적으로 실행되는지 확인", async () => {
      await expect(dao.connect(admin).removeDaoMembership(users[1].address))
        .to.emit(dao, "DaoMembershipRemoved")
        .withArgs(users[1].address, "User has been removed from DAO membership");

      expect(await dao.isDaoMember(users[1].address)).to.equal(false);
      const daoMemberList = await dao.getDaoList();
      expect(daoMemberList).to.not.include(users[1].address);
    });
  });
});
