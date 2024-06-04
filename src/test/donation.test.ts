import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { setup } from "./setup";
import { DaoToken, Donation } from "@typechains";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { faker } from "@faker-js/faker";
import { BigNumber } from "ethers";
import { HardhatUtil } from "./lib/hardhat_utils";
import { GAS_PER_TRANSACTION, mockCampaign } from "./mock/mock";

describe("Dao Token 테스트", () => {
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

  describe("Donation 초기화 테스트", () => {
    it("Donation의 초기 값이 정상적으로 설정되어 있는지 확인", async () => {
      expect(await donation.admin()).to.equal(admin.address);
      expect(await donation.daoToken()).to.equal(daoToken.address);
    });
  });

  describe("Launch 함수 테스트", () => {
    const { target, title, description, goal, startAt, endAt } = mockCampaign();

    it("시작 시간이 현재 시간 이전일 경우 실패하는지 확인", async () => {
      await expect(
        donation.connect(admin).launch(target, title, description, goal, Math.floor(Date.now() / 1000) - 1000, endAt),
      ).to.be.revertedWith("start at < now");
    });

    it("종료 시간이 시작 시간보다 빠른 경우 실패하는지 확인", async () => {
      await expect(donation.connect(admin).launch(target, title, description, goal, endAt, startAt)).to.be.revertedWith(
        "end at < start at",
      );
    });

    it("캠페인 기간이 90일을 넘는 경우 실패하는지 확인", async () => {
      await expect(
        donation.connect(admin).launch(target, title, description, goal, startAt, endAt + 90 * 60 * 60 * 24),
      ).to.be.revertedWith("The maximum allowed campaign duration is 90 days.");
    });

    it("Launch 함수 실행 시 campaign이 순서대로 생성되는지 확인", async () => {
      const TITLE1 = "TEST 1";
      const TITLE2 = "TEST 2";

      await donation.connect(admin).launch(target, TITLE1, description, goal, startAt, endAt);
      await donation.connect(admin).launch(target, TITLE2, description, goal, startAt, endAt);

      expect((await donation.getCampaign(1)).title).to.deep.equal(TITLE1);
      expect((await donation.getCampaign(2)).title).to.deep.equal(TITLE2);
    });

    it("Launch 함수 실행 시 Launch 이벤트가 정상적으로 발생하는지 확인", async () => {
      await expect(donation.connect(admin).launch(target, title, description, goal, startAt, endAt))
        .to.emit(donation, "Launch")
        .withArgs(1, [admin.address, target, title, description, goal, 0, startAt, endAt, false]);
    });
  });

  describe("Cancel 함수 테스트", () => {
    const { target, title, description, goal, startAt, endAt } = mockCampaign();

    beforeEach(async () => {
      await donation.connect(admin).launch(target, title, description, goal, startAt, endAt);
    });

    it("캠페인 생성자와 호출자가 다른 경우 실패하는지 확인", async () => {
      await expect(donation.connect(users[0]).cancel(1)).to.be.revertedWith("Only creator can cancel");
    });

    it("시작 시간 이후에 Cancel 함수를 호출하는 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt + 60);
      await expect(donation.connect(admin).cancel(1)).to.be.revertedWith("Already Started");
    });

    it("Cancel 함수 실행 시 캠페인이 정상적으로 삭제되는지 확인", async () => {
      await donation.connect(admin).cancel(1);
      expect(await donation.getCampaignCreator(1)).to.equal(ethers.constants.AddressZero);
    });

    it("Cancel 함수 실행 시 Cancel 이벤트가 정상적으로 발생하는지 확인", async () => {
      await expect(donation.connect(admin).cancel(1)).to.emit(donation, "Cancel").withArgs(1);
    });
  });

  describe("Pledge 함수 테스트", () => {
    const { target, title, description, startAt, endAt } = mockCampaign();

    beforeEach(async () => {
      await daoToken.connect(users[0]).buyTokens({ value: ethers.utils.parseEther("1").mul(100) });
      await daoToken.connect(users[1]).buyTokens({ value: ethers.utils.parseEther("1").mul(100) });
      await daoToken.connect(users[0]).approve(donation.address, ethers.utils.parseEther("1").mul(100));
      await daoToken.connect(users[1]).approve(donation.address, ethers.utils.parseEther("1").mul(100));

      const goal = 100;
      await donation.connect(admin).launch(target, title, description, goal, startAt, endAt);
    });

    it("캠페인 시작 전에 Pledge 함수를 호출하는 경우 실패하는지 확인", async () => {
      await expect(donation.connect(users[0]).pledge(1, 10)).to.be.revertedWith("not started");
    });

    it("캠페인 종료시간 후에 Pledge 함수를 호출하는 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(endAt + 60);
      await expect(donation.connect(users[0]).pledge(1, 10)).to.be.revertedWith("Campaign ended");
    });

    it("기부금액 모집이 완료된 후에 Pledge 함수를 호출하는 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);
      const goal = await donation.connect(admin).getCampaignGoal(1);
      await donation.connect(users[0]).pledge(1, goal.toNumber());

      await expect(donation.connect(users[1]).pledge(1, 10)).to.be.revertedWith("Campaign ended");
    });

    it("기부 금액이 0인 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await expect(donation.connect(users[0]).pledge(1, 0)).to.be.revertedWith("Amount must be greater than zero");
    });

    it("Pledge 함수 실행 시 기부금액이 정상적으로 전달되는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);

      await donation.connect(users[0]).pledge(1, 10);
      await donation.connect(users[1]).pledge(1, 20);

      const totalAmount = await donation.connect(admin).getCampaignTotalAmount(1);
      const userAmount = await donation.connect(admin).pledgedUserToAmount(1, users[0].address);

      expect(totalAmount).to.equal(30);
      expect(userAmount).to.equal(10);
      expect(await daoToken.connect(admin).balanceOf(users[0].address)).to.equal(ethers.utils.parseEther("1").sub(10));
      expect(await daoToken.connect(admin).balanceOf(users[1].address)).to.equal(ethers.utils.parseEther("1").sub(20));
    });

    it("Pledge 함수 실행 시 Pledge 이벤트가 정상적으로 발생하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await expect(await donation.connect(users[0]).pledge(1, 10))
        .to.emit(donation, "Pledge")
        .withArgs(1, users[0].address, 10, 10);
    });
  });

  describe("Unpledge 함수 테스트", () => {
    const { target, title, description, startAt, endAt } = mockCampaign();

    beforeEach(async () => {
      await daoToken.connect(users[0]).buyTokens({ value: ethers.utils.parseEther("1").mul(100) });
      await daoToken.connect(users[0]).approve(donation.address, ethers.utils.parseEther("1").mul(100));

      const goal = 100;
      await donation.connect(admin).launch(target, title, description, goal, startAt, endAt);
    });

    it("취소 금액이 0인 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await donation.connect(users[0]).pledge(1, 10);
      await expect(donation.connect(users[0]).unpledge(1, 0)).to.be.revertedWith("Amount must be greater than zero");
    });

    it("캠페인 종료시간 후에 Unpledge 함수를 호출하는 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await donation.connect(users[0]).pledge(1, 10);
      await HardhatUtil.setNextBlockTimestamp(endAt + 60);
      await expect(donation.connect(users[0]).unpledge(1, 10)).to.be.revertedWith("Campaign ended");
    });

    it("기부금액 모집이 완료된 후에 Unpledge 함수를 호출하는 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);
      const goal = await donation.connect(admin).getCampaignGoal(1);
      await donation.connect(users[0]).pledge(1, goal.toNumber());

      await expect(donation.connect(users[0]).unpledge(1, 10)).to.be.revertedWith("Campaign ended");
    });

    it("기부금액보다 많은 금액을 취소하는 경우 실패하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await donation.connect(users[0]).pledge(1, 10);
      await expect(donation.connect(users[0]).unpledge(1, 20)).to.be.revertedWith(
        "Unpledge amount must be smaller than the amount you pledged",
      );
    });

    it("Unpledge 함수 실행 시 기부금액이 정상적으로 취소되는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await donation.connect(users[0]).pledge(1, 10);
      await donation.connect(users[0]).unpledge(1, 10);

      const totalAmount = await donation.connect(admin).getCampaignTotalAmount(1);
      const userAmount = await donation.connect(admin).pledgedUserToAmount(1, users[0].address);

      expect(totalAmount).to.equal(0);
      expect(userAmount).to.equal(0);
      expect(await daoToken.connect(admin).balanceOf(users[0].address)).to.equal(ethers.utils.parseEther("1"));
    });

    it("Unpledge 함수 실행 시 Unpledge 이벤트가 정상적으로 발생하는지 확인", async () => {
      await HardhatUtil.setNextBlockTimestamp(startAt);
      await donation.connect(users[0]).pledge(1, 10);
      await expect(await donation.connect(users[0]).unpledge(1, 10))
        .to.emit(donation, "Unpledge")
        .withArgs(1, users[0].address, 10, 0);
    });
  });

  describe("Claim 함수 테스트", () => {
    const { target, title, description, startAt, endAt } = mockCampaign();

    beforeEach(async () => {
      await daoToken.connect(users[0]).buyTokens({ value: ethers.utils.parseEther("1").mul(100) });
      await daoToken.connect(users[1]).buyTokens({ value: ethers.utils.parseEther("1").mul(100) });
      await daoToken.connect(users[0]).approve(donation.address, ethers.utils.parseEther("1").mul(100));
      await daoToken.connect(users[1]).approve(donation.address, ethers.utils.parseEther("1").mul(100));

      const goal = 100;
      await donation.connect(admin).launch(target, title, description, goal, startAt, endAt);
      await HardhatUtil.setNextBlockTimestamp(startAt);
    });

    it("캠페인이 종료되지 않은 경우 실패하는지 확인", async () => {
      await expect(donation.connect(admin).claim(1)).to.be.revertedWith("Campaign not ended");
    });

    it("모금 금액을 달성하지 못한 경우 실패하는지 확인", async () => {
      const goal = await donation.connect(admin).getCampaignGoal(1);
      await donation.connect(users[0]).pledge(1, goal.sub(1));
      await HardhatUtil.setNextBlockTimestamp(endAt);
      await expect(donation.connect(admin).claim(1)).to.be.revertedWith("Campaign not reached goal");
    });

    it("캠페인이 claim 된 경우 실패하는지 확인", async () => {
      const goal = await donation.connect(admin).getCampaignGoal(1);
      await donation.connect(users[0]).pledge(1, goal);
      await donation.connect(admin).claim(1);
      await expect(donation.connect(users[0]).claim(1)).to.be.revertedWith("claimed");
    });

    it("claim이 정상적으로 처리되는지 확인", async () => {
      const goal = await donation.connect(admin).getCampaignGoal(1);
      await donation.connect(users[0]).pledge(1, goal.div(2));
      await donation.connect(users[1]).pledge(1, goal.div(2));
      const targetBalanceBefore = await daoToken.connect(admin).balanceOf(target);

      expect(await donation.connect(admin).getCampaignTotalAmount(1)).to.equal(goal);
      await donation.connect(admin).claim(1);
      const donationObj = await donation.connect(admin).getCampaign(1);
      expect(donationObj.claimed).to.be.true;
      expect(await daoToken.connect(admin).balanceOf(target)).to.equal(targetBalanceBefore.add(goal));
    });

    it("Claim 함수 실행 시 Claim 이벤트가 정상적으로 발생하는지 확인", async () => {
      const goal = await donation.connect(admin).getCampaignGoal(1);
      await donation.connect(users[0]).pledge(1, goal);
      await expect(await donation.connect(admin).claim(1))
        .to.emit(donation, "Claim")
        .withArgs(1, true, goal);
    });
  });

  describe("Refund 함수 테스트", () => {
    const { target, title, description, startAt, endAt } = mockCampaign();

    beforeEach(async () => {
      await daoToken.connect(users[0]).buyTokens({ value: ethers.utils.parseEther("1").mul(100) });
      await daoToken.connect(users[0]).approve(donation.address, ethers.utils.parseEther("1").mul(100));

      const goal = 100;
      await donation.connect(admin).launch(target, title, description, goal, startAt, endAt);
      await HardhatUtil.setNextBlockTimestamp(startAt);
    });

    it("캠페인이 종료되지 않은 경우 실패하는지 확인", async () => {
      await donation.connect(users[0]).pledge(1, 10);
      await expect(donation.connect(users[0]).refund(1)).to.be.revertedWith("Campaign not ended");
    });

    it("환불 금액이 0인 경우 실패하는지 확인", async () => {
      await donation.connect(users[0]).pledge(1, 10);
      await HardhatUtil.setNextBlockTimestamp(endAt);
      await expect(donation.connect(users[1]).refund(1)).to.be.revertedWith("Pledged amount must be more than zero");
    });

    it("환불이 정상적으로 처리되는지 확인", async () => {
      await donation.connect(users[0]).pledge(1, 10);
      const userBalanceBefore = await daoToken.connect(admin).balanceOf(users[0].address);
      await HardhatUtil.setNextBlockTimestamp(endAt);
      await donation.connect(users[0]).refund(1);

      expect(await donation.connect(admin).pledgedUserToAmount(1, users[0].address)).to.equal(0);
      expect(await donation.connect(admin).getCampaignTotalAmount(1)).to.equal(0);
      expect(await daoToken.connect(admin).balanceOf(users[0].address)).to.equal(userBalanceBefore.add(10));
    });

    it("Refund 함수 실행 시 Refund 이벤트가 정상적으로 발생하는지 확인", async () => {
      await donation.connect(users[0]).pledge(1, 10);
      await HardhatUtil.setNextBlockTimestamp(endAt);
      await expect(donation.connect(users[0]).refund(1)).to.emit(donation, "Refund").withArgs(1, users[0].address, 10);
    });
  });
});
