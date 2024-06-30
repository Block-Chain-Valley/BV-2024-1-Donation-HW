import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { setup } from "./setup";
import { DaoToken, Dao, Donation } from "@typechains";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { HardhatUtil } from "./lib/hardhat_utils";
import { mockCampaign } from "./mock/mock";

describe("Donation 테스트", () => {
  /* Signer */
  let admin: SignerWithAddress;
  let users: SignerWithAddress[];

  /* 컨트랙트 객체 */
  let daoToken: DaoToken;
  let donation: Donation;

  /* 테스트 스냅샷 */
  let initialSnapshotId: number;
  let snapshotId: number;

  before(async () => {
    /* 테스트에 필요한 컨트랙트 및 Signer 정보를 불러오는 함수 */
    ({ admin, users, daoToken, donation } = await setup());
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
  });

  describe("캠페인 생성(Launch) 테스트", () => {
    it("launch 함수가 시작 시간이 현재 시간보다 이전인 경우 실패하는지 확인", async () => {
      const campaignData = mockCampaign({ startAt: Math.floor(Date.now() / 1000) - 1000 });
      const { target, title, description, goal, startAt, endAt } = campaignData;

      await expect(
        donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt),
      ).to.be.revertedWith("start at < now");
    });

    it("launch 함수가 종료 시간이 시작 시간보다 이전인 경우 실패하는지 확인", async () => {
      const campaignData = mockCampaign({
        startAt: Math.floor(Date.now() / 1000) + 1000,
        endAt: Math.floor(Date.now() / 1000) - 1000,
      });
      const { target, title, description, goal, startAt, endAt } = campaignData;

      await expect(
        donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt),
      ).to.be.revertedWith("end at < start at");
    });

    it("launch 함수가 종료 시간이 90일을 초과하는 경우 실패하는지 확인", async () => {
      const campaignData = mockCampaign({ endAt: Math.floor(Date.now() / 1000) + 100 * 24 * 60 * 60 });
      const { target, title, description, goal, startAt, endAt } = campaignData;

      await expect(
        donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt),
      ).to.be.revertedWith("end at > max duration");
    });

    it("launch 함수 실행 후 캠페인 정보가 정상적으로 등록되는지 확인", async () => {
      const campaignData = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignData;

      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);

      const campaign = await donation.campaigns(1);
      expect(campaign.creator).to.equal(users[0].address);
      expect(campaign.target).to.equal(target);
      expect(campaign.title).to.equal(title);
      expect(campaign.description).to.equal(description);
      expect(campaign.goal).to.equal(goal);
      expect(campaign.startAt).to.equal(startAt);
      expect(campaign.endAt).to.equal(endAt);
      expect(campaign.pledged).to.equal(0);
      expect(campaign.claimed).to.equal(false);

      expect(await donation.count()).to.equal(1);
    });

    it("launch 함수 실행 후 이벤트가 정상적으로 발생하는지 확인", async () => {
      const campaignData = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignData;

      await expect(donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt))
        .to.emit(donation, "Launch")
        .withArgs(1, [users[0].address, target, title, description, goal, 0, startAt, endAt, false]);
    });
  });

  describe("캠페인 취소(Cancel) 테스트", () => {
    beforeEach(async () => {
      const campaignData = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignData;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
    });

    it("cancel 함수가 캠페인 생성자에 의해 호출되지 않는 경우 실패하는지 확인", async () => {
      await expect(donation.connect(users[1]).cancel(1)).to.be.revertedWith("not creator");
    });

    it("cancel 함수가 캠페인이 시작된 후 호출되는 경우 실패하는지 확인", async () => {
      const campaign = await donation.campaigns(1);
      const currentTime = await HardhatUtil.blockTimeStamp();
      const startInFuture = campaign.startAt - currentTime + 10;

      await HardhatUtil.passNSeconds(startInFuture);

      await expect(donation.connect(users[0]).cancel(1)).to.be.revertedWith("started");
    });

    it("cancel 함수가 정상적으로 실행되는지 확인", async () => {
      const newCampaignData = mockCampaign({ startAt: Math.floor(Date.now() / 1000) + 5000 });
      const { target, title, description, goal, startAt, endAt } = newCampaignData;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);

      await donation.connect(users[0]).cancel(2);
      const campaign = await donation.campaigns(2);

      expect(campaign.creator).to.equal(ethers.constants.AddressZero);
    });

    it("cancel 함수 실행 후 이벤트가 정상적으로 발생하는지 확인", async () => {
      const newCampaignData = mockCampaign({ startAt: Math.floor(Date.now() / 1000) + 5000 });
      const { target, title, description, goal, startAt, endAt } = newCampaignData;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);

      await expect(donation.connect(users[0]).cancel(2)).to.emit(donation, "Cancel").withArgs(2);
    });
  });

  describe("기부(Pledge) 테스트", () => {
    beforeEach(async () => {
      const campaignData = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignData;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await HardhatUtil.mineNBlocks(1);
    });

    it("pledge 함수가 캠페인이 종료된 경우 실패하는지 확인", async () => {
      const amount = HardhatUtil.ToETH(1);
      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);

      await HardhatUtil.setNextBlockTimestamp((await donation.campaigns(1)).endAt);

      await expect(donation.connect(users[1]).pledge(1, amount)).to.be.revertedWith("Campaign ended");
    });

    it("pledge 함수가 0 이상의 금액을 기부하는지 확인", async () => {
      const amount = HardhatUtil.ToETH(0);

      await expect(donation.connect(users[1]).pledge(1, amount)).to.be.revertedWith("Amount must be greater than zero");
    });

    it("pledge 함수 실행 후 캠페인에 기부금이 정상적으로 반영되는지 확인", async () => {
      const amount = HardhatUtil.ToETH(1);
      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);

      await donation.connect(users[1]).pledge(1, amount);
      const campaign = await donation.campaigns(1);

      expect(campaign.pledged).to.equal(amount);
    });

    it("pledge 함수 실행 후 이벤트가 정상적으로 발생하는지 확인", async () => {
      const amount = HardhatUtil.ToETH(1);
      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);

      await expect(donation.connect(users[1]).pledge(1, amount))
        .to.emit(donation, "Pledge")
        .withArgs(1, users[1].address, amount, amount);
    });
  });

  describe("기부 취소(Unpledge) 테스트", () => {
    beforeEach(async () => {
      const campaignData = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignData;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await HardhatUtil.mineNBlocks(1);

      const amount = HardhatUtil.ToETH(1);
      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);
      await donation.connect(users[1]).pledge(1, amount);
    });

    it("unpledge 함수가 0 이상의 금액을 기부 취소하는지 확인", async () => {
      const amount = HardhatUtil.ToETH(0);

      await expect(donation.connect(users[1]).unpledge(1, amount)).to.be.revertedWith(
        "Amount must be greater than zero",
      );
    });

    it("unpledge 함수가 캠페인이 종료된 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp((await donation.campaigns(1)).endAt);

      await expect(donation.connect(users[1]).unpledge(1, HardhatUtil.ToETH(1))).to.be.revertedWith("Campaign ended");
    });

    it("unpledge 함수 실행 후 캠페인에 기부 취소 금액이 정상적으로 반영되는지 확인", async () => {
      const amount = HardhatUtil.ToETH(1);

      await donation.connect(users[1]).unpledge(1, amount);
      const campaign = await donation.campaigns(1);

      expect(campaign.pledged).to.equal(HardhatUtil.ToETH(0));
    });

    it("unpledge 함수 실행 후 이벤트가 정상적으로 발생하는지 확인", async () => {
      const amount = HardhatUtil.ToETH(1);

      await expect(donation.connect(users[1]).unpledge(1, amount))
        .to.emit(donation, "Unpledge")
        .withArgs(1, users[1].address, amount, HardhatUtil.ToETH(0));
    });
  });

  describe("기부금 수령(Claim) 테스트", () => {
    beforeEach(async () => {
      const campaignData = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignData;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await HardhatUtil.mineNBlocks(1);

      const amount = HardhatUtil.ToETH(10);
      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);
      await donation.connect(users[1]).pledge(1, amount);
    });

    it("claim 함수가 캠페인이 종료되지 않은 경우 실패하는지 확인", async () => {
      await expect(donation.connect(users[0]).claim(1)).to.be.revertedWith("Campaign not ended");
    });

    it("claim 함수가 이미 수령된 캠페인에서 호출된 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp((await donation.campaigns(1)).endAt);

      await donation.connect(users[0]).claim(1);

      await expect(donation.connect(users[0]).claim(1)).to.be.revertedWith("claimed");
    });

    it("claim 함수 실행 후 기부금이 정상적으로 수령되는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp((await donation.campaigns(1)).endAt);
      await donation.connect(users[0]).claim(1);

      const campaign = await donation.campaigns(1);
      expect(campaign.claimed).to.be.true;
    });

    it("claim 함수 실행 후 이벤트가 정상적으로 발생하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp((await donation.campaigns(1)).endAt);
      await expect(donation.connect(users[0]).claim(1))
        .to.emit(donation, "Claim")
        .withArgs(1, true, HardhatUtil.ToETH(10));
    });
  });

  describe("환불(Refund) 테스트", () => {
    beforeEach(async () => {
      const campaignData = mockCampaign();
      const { target, title, description, goal, startAt, endAt } = campaignData;
      await donation.connect(users[0]).launch(target, title, description, goal, startAt, endAt);
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await HardhatUtil.mineNBlocks(1);

      const amount = HardhatUtil.ToETH(1);
      await daoToken.transfer(users[1].address, amount);
      await daoToken.connect(users[1]).approve(donation.address, amount);
      await donation.connect(users[1]).pledge(1, amount);
    });

    it("refund 함수가 캠페인이 종료되지 않은 경우 실패하는지 확인", async () => {
      await expect(donation.connect(users[1]).refund(1)).to.be.revertedWith("Campaign not ended");
    });

    it("refund 함수 실행 후 기부자가 환불받는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp((await donation.campaigns(1)).endAt);

      const initialBalance = await daoToken.balanceOf(users[1].address);

      await donation.connect(users[1]).refund(1);
      const finalBalance = await daoToken.balanceOf(users[1].address);

      expect(finalBalance).to.equal(initialBalance.add(HardhatUtil.ToETH(1)));
    });

    it("refund 함수 실행 후 이벤트가 정상적으로 발생하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp((await donation.campaigns(1)).endAt);

      await expect(donation.connect(users[1]).refund(1))
        .to.emit(donation, "Refund")
        .withArgs(1, users[1].address, HardhatUtil.ToETH(1));
    });
  });
});
