import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { setup } from "./setup";
import { DaoToken, Donation, Dao } from "@typechains";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { HardhatUtil } from "./lib/hardhat_utils";
import { CampaignInfo, mockCampaign } from "./mock/mock";

describe("Donation 테스트", () => {
  /* Signer */
  let admin: SignerWithAddress;
  let users: SignerWithAddress[];

  /* 컨트랙트 객체 */
  let daoToken: DaoToken;
  let donation: Donation;
  let dao: Dao;

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

  describe("Launch 함수 테스트", () => {
    it("시작 시간이 현재 시간보다 빠를 경우 실패하는지 확인", async () => {
      const startTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      const campaignInfo: CampaignInfo = mockCampaign({ startAt: startTime });
      const { target, title, description, goal, startAt, endAt } = campaignInfo;

      await expect(donation.launch(target, title, description, goal, startAt, endAt)).to.be.revertedWith(
        "start at < now",
      );
    });

    it("종료 시간이 시작 시간보다 빠를 경우 실패하는지 확인", async () => {
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const endTime = Math.floor(Date.now() / 1000);
      const campaignInfo: CampaignInfo = mockCampaign({ startAt: startTime, endAt: endTime });

      const { target, title, description, goal, startAt, endAt } = campaignInfo;

      await expect(donation.launch(target, title, description, goal, startAt, endAt)).to.be.revertedWith(
        "end at < start at",
      );
    });

    it("캠페인 기간이 90일을 넘길 경우 실패하는지 확인", async () => {
      const endTime = Math.floor(Date.now() / 1000) + 100 * 24 * 60 * 60; // 90 days later
      const campaignInfo: CampaignInfo = mockCampaign({ endAt: endTime });

      const { target, title, description, goal, startAt, endAt } = campaignInfo;

      await expect(donation.launch(target, title, description, goal, startAt, endAt)).to.be.revertedWith(
        "The maximum allowed campaign duration is 90 days.",
      );
    });

    it("DaoToken의 초기 값이 정상적으로 설정되어 있는지 확인", async () => {
      const campaignInfo: CampaignInfo = mockCampaign();

      const { target, title, description, goal, startAt, endAt } = campaignInfo;

      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      const campaign = await donation.campaigns(1);
      await Promise.all([
        expect(campaign.creator).to.equal(users[0].address),
        expect(campaign.target).to.equal(target),
        expect(campaign.title).to.equal(title),
        expect(campaign.description).to.equal(description),
        expect(campaign.goal).to.equal(goal),
        expect(campaign.startAt).to.equal(startAt),
        expect(campaign.endAt).to.equal(endAt),
        expect(campaign.pledged).to.equal(0),
        expect(campaign.claimed).to.equal(false),

        expect(await donation.count()).to.equal(1),
      ]);
    });

    it("Launch 함수 실행 시 이벤트가 정상적으로 발생하는지 확인", async () => {
      const campaignInfo: CampaignInfo = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignInfo;

      await expect(donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt))
        .to.emit(donation, "Launch")
        .withArgs(1, [users[0].address, target, title, description, goal, 0, startAt, endAt, false]);
    });
  });

  describe("Cancel 함수 테스트", () => {
    const campaignInfo = mockCampaign();
    const { target, title, description, goal, startAt, endAt } = campaignInfo;
    beforeEach(async () => {
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
    });
    it("캠페인 생성자만이 캠페인을 취소할 수 있는지 확인", async () => {
      await expect(donation.connect(users[1]).cancel(1)).to.be.revertedWith("Only creator can cancel");
    });

    it("캠페인이 이미 시작된 경우 캠페인을 취소할 수 없는지 확인", async () => {
      const campaign = await donation.campaigns(1);
      const currentTime = await HardhatUtil.blockTimeStamp();
      const startInFuture = campaign.startAt - currentTime + 10;

      await HardhatUtil.passNSeconds(startInFuture);
      await expect(donation.connect(users[0]).cancel(1)).to.be.revertedWith("Already Started");
    });

    it("cancel 함수가 정상적으로 실행되는지 확인", async () => {
      const campaignInfo = mockCampaign({ startAt: Math.floor(Date.now() / 1000) + 3600 });
      const { target, title, description, goal, startAt, endAt } = campaignInfo;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);

      await donation.connect(users[0]).cancel(2);
      const campaign = await donation.campaigns(2);

      expect(campaign.creator).to.equal(ethers.constants.AddressZero);
    });

    it("cancel 함수 실행시 Event가 정상적으로 발생하는지 확인", async () => {
      const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour later
      const campaignInfo: CampaignInfo = mockCampaign({ startAt: startTime });
      const { target, title, description, goal, startAt, endAt } = campaignInfo;

      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      await expect(donation.connect(users[0]).cancel(2)).to.emit(donation, "Cancel").withArgs(2);
    });
  });

  describe("Pledge 함수 테스트", () => {
    const amount = HardhatUtil.ToETH(1);
    const campaignInfo = mockCampaign({ goal: ethers.utils.parseEther("10") });
    const { target, title, description, goal, startAt, endAt } = campaignInfo;

    beforeEach(async () => {
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await HardhatUtil.mineNBlocks(1);

      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);
    });

    it("시작하지 않은 캠페인에 대해 기부하면 실패하는지 확인", async () => {
      const currentTime = await HardhatUtil.blockTimeStamp();
      const startTime = currentTime + 3600;
      const campaignInfo = mockCampaign({ startAt: startTime });
      const { target, title, description, goal, startAt, endAt } = campaignInfo;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);

      await expect(donation.connect(users[1]).pledge(2, amount)).to.be.revertedWith("Not started");
    });

    it("종료된 캠페인에 대해 기부하면 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp((await donation.campaigns(1)).endAt);

      await expect(donation.connect(users[1]).pledge(1, amount)).to.be.revertedWith("Campaign ended");
    });

    it("기부 금액이 0보다 클 때에만 성공하는지 확인", async () => {
      const amount = HardhatUtil.ToETH(0);
      await expect(donation.connect(users[1]).pledge(1, amount)).to.be.revertedWith("Amount must be greater than zero");
    });

    it("기부 총액이 목표액을 초과했을 때 기부에 실패하는지 확인", async () => {
      await donation.connect(users[1]).pledge(1, HardhatUtil.ToETH(1));

      const amount = HardhatUtil.ToETH(10);
      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);

      await expect(donation.connect(users[1]).pledge(1, amount)).to.be.revertedWith(
        "Total pledged cannot exceed the goal.",
      );
    });

    it("기부 금액이 목표액을 초과했을 때 기부에 실패하는지 확인", async () => {
      const amount = HardhatUtil.ToETH(11);
      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);

      await expect(donation.connect(users[1]).pledge(1, amount)).to.be.revertedWith("Amount cannot exceed the goal.");
    });

    it("캠페인에 기부금이 정상적으로 반영되는지 확인", async () => {
      await donation.connect(users[1]).pledge(1, amount);
      const campaign = await donation.campaigns(1);

      expect(campaign.pledged).to.equal(amount);
    });

    it("Pledge 함수 실행 시 이벤트가 정상적으로 발생하는지 확인", async () => {
      await expect(donation.connect(users[1]).pledge(1, amount))
        .to.emit(donation, "Pledge")
        .withArgs(1, users[1].address, amount, amount);
    });
  });

  describe("Unpledge 함수 테스트", () => {
    const amount = HardhatUtil.ToETH(1);
    const campaignInfo = mockCampaign();
    const { target, title, description, goal, startAt, endAt } = campaignInfo;

    beforeEach(async () => {
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await HardhatUtil.mineNBlocks(1);

      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);

      await donation.connect(users[1]).pledge(1, amount);
    });

    it("기부 취소 금액이 0보다 큰지 확인", async () => {
      const amount = HardhatUtil.ToETH(0);

      await expect(donation.connect(users[1]).unpledge(1, amount)).to.be.revertedWith(
        "Amount must be greater than zero",
      );
    });

    it("기부 취소 금액이 기부한 금액보다 작은지 확인", async () => {
      const amount = HardhatUtil.ToETH(10);

      await expect(donation.connect(users[1]).unpledge(1, amount)).to.be.revertedWith(
        "Unpledge amount must be smaller than the amount you pledged",
      );
    });

    it("캠페인이 종료된 경우 기부 취소가 실패하는지 확인", async () => {
      const endTime = (await donation.campaigns(1)).endAt;
      await HardhatUtil.setNextBlockTimestamp(endTime);

      await expect(donation.connect(users[1]).unpledge(1, amount)).to.be.revertedWith("Campaign ended");
    });

    it("캠페인에 기부 취소 금액이 정상적으로 반영되는지 확인", async () => {
      const amount = HardhatUtil.ToETH(0.5);
      const campaignBeforeUnpledge = await donation.campaigns(1);
      const pledgeBeforeUnpledge = campaignBeforeUnpledge.pledged;

      await donation.connect(users[1]).unpledge(1, amount);
      const campaignAfterUnpledge = await donation.campaigns(1);

      const pledgeAfterUnpledge = campaignAfterUnpledge.pledged;

      expect(pledgeAfterUnpledge).to.equal(pledgeBeforeUnpledge.sub(amount));
    });

    it("unpledge 함수 실행 후 이벤트가 정상적으로 발생하는지 확인", async () => {
      const amount = HardhatUtil.ToETH(0.5);

      await expect(donation.connect(users[1]).unpledge(1, amount))
        .to.emit(donation, "Unpledge")
        .withArgs(1, users[1].address, amount, amount);
    });
  });
  // describe("Claim 함수 테스트", () => {
  //   const amount = HardhatUtil.ToETH(10);
  //   const campaignInfo = mockCampaign();
  //   const { target, title, description, goal, startAt, endAt } = campaignInfo;

  //   beforeEach(async () => {
  //     await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
  //     await HardhatUtil.setNextBlockTimestamp(startAt);
  //     await HardhatUtil.mineNBlocks(1);

  //     await daoToken.transfer(users[1].address, amount);
  //     await daoToken.connect(users[1]).approve(donation.address, amount);
  //     await donation.connect(users[1]).pledge(1, amount);
  //   });

  //   it("claim 함수가 DAO 멤버의 호출에만 실행되는지 확인", async () => {
  //     await expect(donation.connect(users[0]).claim(1)).to.be.revertedWith("Only DAO contract can perform this action");
  //   });

  //   it("캠페인이 종료되지 않은 경우 기부금 수령에 실패하는지 확인", async () => {
  //     await dao.connect(users[0]).requestDaoMembership();
  //     await dao.connect(admin).handleDaoMembership(users[0].address, true);
  //     await expect(donation.connect(users[0]).claim(1)).to.be.revertedWith("Campaign not ended");
  //   });

  //   it("이미 기부금 수령된 캠페인에서 호출된 경우 실패하는지 확인", async () => {
  //     await dao.connect(users[0]).requestDaoMembership();
  //     await dao.connect(admin).handleDaoMembership(users[0].address, true);

  //     const endTime = (await donation.campaigns(1)).endAt;
  //     await HardhatUtil.setNextBlockTimestamp(endTime);

  //     await donation.connect(users[0]).claim(1);
  //     await expect(donation.connect(users[0]).claim(1)).to.be.revertedWith("claimed");
  //   });

  //   it("기부금이 정상적으로 수령되는지 확인", async () => {
  //     const endTime = (await donation.campaigns(1)).endAt;

  //     await HardhatUtil.setNextBlockTimestamp(endTime);

  //     await dao.connect(users[0]).requestDaoMembership();
  //     await dao.connect(admin).handleDaoMembership(users[0].address, true);
  //     await donation.connect(users[0]).claim(1);

  //     const campaign = await donation.campaigns(1);
  //     expect(campaign.claimed).to.be.true;
  //   });

  //   it("함수 실행 시 이벤트가 정상적으로 발생하는지 확인", async () => {
  //     const endTime = (await donation.campaigns(1)).endAt;

  //     await HardhatUtil.setNextBlockTimestamp(endTime);

  //     await dao.connect(users[0]).requestDaoMembership();
  //     await dao.connect(admin).handleDaoMembership(users[0].address, true);

  //     await expect(donation.connect(users[0]).claim(1))
  //       .to.emit(donation, "Claim")
  //       .withArgs(1, true, HardhatUtil.ToETH(10));
  //   });
  // });
  describe("Refund 함수 테스트", () => {
    const amount = HardhatUtil.ToETH(1);
    const campaignInfo = mockCampaign();
    const { target, title, description, goal, startAt, endAt } = campaignInfo;

    beforeEach(async () => {
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await HardhatUtil.mineNBlocks(1);

      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);
      await donation.connect(users[1]).pledge(1, amount);
    });

    it("refund 함수가 캠페인이 종료되지 않은 경우 실패하는지 확인", async () => {
      await expect(donation.connect(users[1]).refund(1)).to.be.revertedWith("Campaign not ended");
    });

    it("refund 함수 실행 후 기부자가 환불받는지 확인", async () => {
      const endTime = (await donation.campaigns(1)).endAt;
      await HardhatUtil.setNextBlockTimestamp(endTime);

      const initialBalance = await daoToken.balanceOf(users[1].address);

      await donation.connect(users[1]).refund(1);
      const finalBalance = await daoToken.balanceOf(users[1].address);

      expect(finalBalance).to.equal(initialBalance.add(amount));
    });

    it("함수 실행 후 기부자에 대한 기부액 기록이 0이 되는지 확인", async () => {
      const endTime = (await donation.campaigns(1)).endAt;
      await HardhatUtil.setNextBlockTimestamp(endTime);

      await donation.connect(users[1]).refund(1);
      const balance = await donation.pledgedUserToAmount(1, users[1].address);

      expect(balance).to.equal(0);
    });

    it("refund 함수 실행 후 이벤트가 정상적으로 발생하는지 확인", async () => {
      const endTime = (await donation.campaigns(1)).endAt;
      await HardhatUtil.setNextBlockTimestamp(endTime);

      await expect(donation.connect(users[1]).refund(1))
        .to.emit(donation, "Refund")
        .withArgs(1, users[1].address, amount);
    });
  });
});
