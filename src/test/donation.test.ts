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

describe("Dao Token 테스트", () => {
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
    // expect(dao.address).to.not.be.undefined;
    expect(donation.address).to.not.be.undefined;
  });

  describe("launch함수 테스트", () => {
    // 정상케이스 테스트
    // 1. Count 변수가 정상적으로 반영되었는가
    it("Count 변수가 정상적으로 반영되었는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      expect(await donation.count()).to.equal(1);
    });
    // 2. campaign 객체가 정상적으로 반영되었는가
    it("campaign 객체가 정상적으로 반영되었는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const campaign = await donation.getCampaign(1);

      expect(campaign.creator).to.equal(users[0].address);
      expect(campaign.target).to.equal(users[1].address);
      expect(campaign.title).to.equal("test");
      expect(campaign.description).to.equal("test description");
      expect(campaign.goal.toString()).to.equal(goal.toString());
      expect(campaign.startAt).to.equal(startAt);
      expect(campaign.endAt).to.equal(endAt);
      expect(campaign.claimed).to.be.false;
    });
    // 3. launch 이벤트가 발생하였는가
    it("launch 이벤트가 발생하였는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await expect(
        donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt),
      )
        .to.emit(donation, "Launch")
        .withArgs(1, await donation.getCampaign(1));
    });
    // 오류케이스 테스트
    // 1. 시작시간이 현재시간보다 빠르면 에러가 발생하는가
    it("시작시간이 현재시간보다 빠르면 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime - 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      expect(
        donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt),
      ).to.be.revertedWith("start at < now");
    });
    // 2. 종료시간이 시작시간보다 빠르면 에러가 발생하는가
    it("종료시간이 시작시간보다 빠르면 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 8;
      const goal = ethers.utils.parseUnits("1000", 18);

      expect(
        donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt),
      ).to.be.revertedWith("end at < start at");
    });
    // 3. 캠페인 기간이 90일을 넘으면 에러가 발생하는가
    it("캠페인 기간이 90일을 넘으면 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 2678400; // 31 days
      const goal = ethers.utils.parseUnits("1000", 18);

      expect(
        donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt),
      ).to.be.revertedWith("The maximum allowed campaign duration is 90 days.");
    });
  });
  describe("cancel함수 테스트", () => {
    // 정상케이스 테스트
    // 1. 캠페인이 정상적으로 삭제되는가?
    it("캠페인이 정상적으로 삭제되는가?", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      await donation.connect(users[0]).cancel(1);

      const campaign = await donation.getCampaign(1);

      expect(campaign.creator).to.equal("0x0000000000000000000000000000000000000000");
      expect(campaign.target).to.equal("0x0000000000000000000000000000000000000000");
      expect(campaign.title).to.equal("");
      expect(campaign.description).to.equal("");
      expect(campaign.goal.toString()).to.equal("0");
      expect(campaign.pledged.toString()).to.equal("0");
      expect(campaign.startAt).to.equal(0);
      expect(campaign.endAt).to.equal(0);
      expect(campaign.claimed).to.be.false;
    });
    // 2 cancel 이벤트가 발생하였는가
    it("cancel 이벤트가 발생하였는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const campaign = await donation.getCampaign(1);

      await expect(donation.connect(users[0]).cancel(1)).to.emit(donation, "Cancel").withArgs(1);
    });
    // 오류케이스 테스트
    // 1. creater 외 호출시 에러가 발생하는가
    it("creater 외 호출시 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      await expect(donation.connect(users[1]).cancel(1)).to.revertedWith("Only creater can cancel");
    });
    // 2. 시작시간이 현재시간보다 빠르면 에러가 발생하는가
    it("시작시간이 현재시간보다 빠르면 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      await HardhatUtil.passNSeconds(100);

      await expect(donation.connect(users[0]).cancel(1)).to.revertedWith("Already Started");
    });
  });
  describe("pledge함수 테스트", () => {
    // 정상케이스 테스트
    // 1. 기부금액 ( pledged )가 정상적으로 업데이트 되는가?
    it("기부금액 ( pledged )가 정상적으로 업데이트 되는가?", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await donation.connect(users[1]).pledge(1, _amount);

      const campaign = await donation.getCampaign(1);

      expect(campaign.pledged.toString()).to.equal(_amount.toString());
    });
    // 2. 캠페인 아이디와 기부자의 기부금액이 기록되는가?
    it("캠페인 아이디와 기부자의 기부금액이 기록되는가?", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await donation.connect(users[1]).pledge(1, _amount);

      const campaign = await donation.getCampaign(1);

      const pledgedAmount = await donation.pledgedUserToAmount(1, users[1].address);
      expect(pledgedAmount.toString()).to.equal(_amount.toString());
    });
    // 3. 기부자로부터 컨트랙트로 DAO 토큰이 전송되는갸?
    it("기부자로부터 컨트랙트로 DAO 토큰이 전송되는갸?", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await donation.connect(users[1]).pledge(1, _amount);

      await expect((await daoToken.balanceOf(donation.address)).toString()).to.equal(_amount.toString());
    });
    // 4. Pledge 이벤트가 발생하는가?
    it("Pledge 이벤트가 발생하는가?", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);

      expect(await donation.connect(users[1]).pledge(1, _amount))
        .to.emit(donation, "Pledge")
        .withArgs(1, _amount);
    });
    // 오류케이스 테스트
    // 1. 캠페인 시작 전 실행시 에러가 발생하는가
    it("캠페인 시작 전 실행시 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 1000;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await expect(donation.connect(users[1]).pledge(1, _amount)).to.revertedWith("not started");
    });
    // 2. 종료된 캠페인에 기부시 에러가 발생하는가
    it("종료된 캠페인에 기부시 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 10;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(30);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await expect(donation.connect(users[1]).pledge(1, _amount)).to.revertedWith("Campaign ended");
    });
    // 3. 기부금액이 0 원이면 에러가 발생하는가
    it("기부금액이 0 원이면 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 1000;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(30);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await expect(donation.connect(users[1]).pledge(1, 0)).to.revertedWith("Amount must be greater than zero");
    });
  });
  describe("unpledge함수 테스트", () => {
    // 정상케이스 테스트
    // 1. 기부금액 ( unpledged )가 정상적으로 업데이트 되는가?
    it("기부금액 ( unpledged )가 정상적으로 업데이트 되는가?", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await donation.connect(users[1]).pledge(1, _amount);

      await donation.connect(users[1]).unpledge(1, _amount);

      const campaign = await donation.getCampaign(1);

      expect(campaign.pledged.toString()).to.equal("0");
    });
    // 3. 컨트랙트로부터 기부자의 주소로 DAO 토큰이 전송되는갸?
    it("컨트랙트로부터 기부자의 주소로 DAO 토큰이 전송되는갸?", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await donation.connect(users[1]).pledge(1, _amount);

      await donation.connect(users[1]).unpledge(1, _amount);

      const campaign = await donation.getCampaign(1);

      expect(await daoToken.balanceOf(donation.address)).to.equal(0);
    });
    // 4. UnPledge 이벤트가 발생하는가?
    it("UnPledge 이벤트가 발생하는가?", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await donation.connect(users[1]).pledge(1, _amount);

      const campaign = await donation.getCampaign(1);

      expect(await donation.connect(users[1]).unpledge(1, _amount))
        .to.emit(donation, "Unpledge")
        .withArgs(1, users[1].address, _amount, campaign.pledged);
    });
    // 오류케이스 테스트
    // 1. 취소금액이 0 보다 작으면 에러가 발생하는가

    it("취소금액이 0 보다 작으면 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await donation.connect(users[1]).pledge(1, _amount);

      expect(donation.connect(users[1]).unpledge(1, 0)).to.revertedWith("Amount must be greater than zero");
    });
    // 2. 종료된 캠페인에 기부취소시 에러가 발생하는가
    it("종료된 캠페인에 기부취소시 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 10;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await HardhatUtil.passNSeconds(10);
      await donation.connect(users[1]).pledge(1, _amount);

      await HardhatUtil.passNSeconds(30);
      expect(donation.connect(users[1]).unpledge(1, _amount)).to.revertedWith("Campaign ended");
    });
    // 3. 기존에 냈던 금액보다 크게 취소할 시 에러가 발생하는가
    it("기존에 냈던 금액보다 크게 취소할 시 에러가 발생하는가", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const startAt = currentTime + 10;
      const endAt = startAt + 3600;
      const goal = ethers.utils.parseUnits("1000", 18);

      await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);

      const _amount = ethers.utils.parseUnits("10", 18);
      const _bigAmount = ethers.utils.parseUnits("20", 18);

      await HardhatUtil.passNSeconds(12);

      await daoToken.connect(admin).transfer(users[1].address, _amount);

      await daoToken.connect(users[1]).approve(donation.address, _amount);
      await donation.connect(users[1]).pledge(1, _amount);

      expect(donation.connect(users[1]).unpledge(1, _bigAmount)).to.revertedWith(
        "Unpledge amount must be smaller than the amount you pledged",
      );
    });
  });
  //   describe("claim함수 테스트", () => {
  //     // 정상케이스 테스트
  //     // 1. 캠페인 타켓 주소로 DAO 토큰이 전송되는가?
  //     // 2. 캠페인의 클레임 상태가 업데이트 되는가?
  //     // 3. Claim 이벤트가 발생하는가?
  //     // 4. UnPledge 이벤트가 발생하는가?
  //     // 오류케이스 테스트
  //     // 1. 캠페인 종료 전 실행시 오류가 발생하는가
  //     // 2. 이미 claimed 된 캠페인에 호출시 에러가 발생하는가
  //   });
  //   describe("refund함수 테스트", () => {
  //     // 정상케이스 테스트
  //     // 1. 기부자의 기부 금액이 0으로 초기화 되는가?
  //     // 2. 컨트랙트로부터 기부자에게 DAO 토큰이 전송되는가?
  //     // 3. Refund 이벤트가 발생하는가?
  //     // 오류케이스 테스트
  //     // 1. 캠페인 종료 전 실행시 오류가 발생하는가
  //   });

  //   describe("claim 함수 테스트", () => {
  //     let admin: SignerWithAddress;
  //     let users: SignerWithAddress[];
  //     let donation: Donation;
  //     let daoToken: DaoToken;
  //     let startAt: number;
  //     let endAt: number;
  //     let goal: BigNumber;

  //     beforeEach(async () => {
  //       const currentTime = Math.floor(Date.now() / 1000);
  //       startAt = currentTime + 100;
  //       endAt = startAt + 3600;
  //       goal = ethers.utils.parseUnits("100", 18);

  //       await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);
  //       await donation.connect(users[1]).pledge(1, goal);
  //       await HardhatUtil.passNSeconds(3700);
  //     });

  //     it("캠페인 타겟 주소로 DAO 토큰이 전송되는가?", async () => {
  //       const initialBalance: BigNumber = await daoToken.balanceOf(users[1].address);
  //       await donation.connect(users[0]).claim(1);
  //       const finalBalance: BigNumber = await daoToken.balanceOf(users[1].address);
  //       expect(finalBalance.sub(initialBalance)).to.equal(goal);
  //     });

  //     it("Claim 이벤트가 발생하는가?", async () => {
  //       await expect(donation.connect(users[0]).claim(1)).to.emit(donation, "Claim").withArgs(1, true, goal);
  //     });

  //     it("Claim 호출 후 캠페인의 claimed 상태가 업데이트 되는가?", async () => {
  //       await donation.connect(users[0]).claim(1);
  //       const campaign = await donation.getCampaign(1);
  //       expect(campaign.claimed).to.be.true;
  //     });
  //   });

  //   describe("refund 함수 테스트", () => {
  //     let startAt: number;
  //     let endAt: number;
  //     let goal: BigNumber;

  //     beforeEach(async () => {
  //       const currentTime = Math.floor(Date.now() / 1000);
  //       startAt = currentTime + 100;
  //       endAt = startAt + 3600;
  //       goal = ethers.utils.parseUnits("100", 18);

  //       await donation.connect(users[0]).launch(users[1].address, "test", "test description", goal, startAt, endAt);
  //       await donation.connect(users[1]).pledge(1, goal);
  //       await HardhatUtil.passNSeconds(3700);
  //     });

  //     it("기부자의 기부 금액이 0으로 초기화 되는가?", async () => {
  //       await donation.connect(users[1]).refund(1);
  //       const pledgedAmount: BigNumber = await donation.pledgedUserToAmount(1, users[1].address);
  //       expect(pledgedAmount).to.equal(0);
  //     });

  //     it("컨트랙트로부터 기부자에게 DAO 토큰이 전송되는가?", async () => {
  //       const initialBalance: BigNumber = await daoToken.balanceOf(users[1].address);
  //       await donation.connect(users[1]).refund(1);
  //       const finalBalance: BigNumber = await daoToken.balanceOf(users[1].address);
  //       expect(finalBalance.sub(initialBalance)).to.equal(goal);
  //     });

  //     it("Refund 이벤트가 발생하는가?", async () => {
  //       await expect(donation.connect(users[1]).refund(1))
  //         .to.emit(donation, "Refund")
  //         .withArgs(1, users[1].address, goal);
  //     });
  //   });
});
