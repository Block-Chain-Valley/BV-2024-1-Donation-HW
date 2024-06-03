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

  describe("Donation 초기화 테스트", () => {
    it("Donation 관리자가 정상적으로 설정되어 있는지 확인", async () => {
      expect(await donation.admin()).to.equal(admin.address);
    });

    it("Donation의 daotoken이 정상적으로 설정되어 있는지 확인", async () => {
      expect(await donation.daoToken()).to.not.be.undefined;
    });
  });

  describe("Launch 함수 테스트", async () => {
    const now = await HardhatUtil.blockTimeStamp();
    const today = Math.floor(now / 86400);
    const startAt = today + 1; // 1일 후 시작
    const endAt = startAt + 10; // 10일 후 종료
    const goal = ethers.utils.parseEther(faker.datatype.number({ min: 1, max: 100 }).toString());

    it("Donation의 Launch 함수에서 시작 시간이 현재 시간보다 빠르면 실패하는지 확인", async () => {
      await expect(
        donation.connect(admin).launch(users[0].address, "title", "description", goal, today - 1, endAt),
      ).to.be.revertedWith("start at < now");
    });

    it("Donation의 Launch 함수에서 종료 시간이 시작 시간보다 빠르면 실패하는지 확인", async () => {
      await expect(
        donation.connect(admin).launch(users[0].address, "title", "description", goal, endAt + 1, endAt),
      ).to.be.revertedWith("end at < start at");
    });

    it("Donation의 Launch 함수 실행 시 count가 1 증가하는지 확인", async () => {
      const initialCount = await donation.count();
      await donation.connect(admin).launch(users[0].address, "title", "description", goal, startAt, endAt);
      expect(await donation.count()).to.equal(initialCount.add(1));
    });

    it("campaign의 초기 값이 정상적으로 설정되어 있는지 확인", async () => {
      await donation.connect(admin).launch(users[0].address, "title", "description", goal, startAt, endAt);
      const count = await donation.count();
      const campaign = await donation.campaigns(count);
      await Promise.all([
        expect(campaign.creator).to.equal(admin.address),
        expect(campaign.target).to.equal(users[0].address),
        expect(campaign.title).to.equal("title"),
        expect(campaign.description).to.equal("description"),
        expect(campaign.goal).to.equal(goal),
        expect(campaign.startAt).to.equal(startAt),
        expect(campaign.endAt).to.equal(endAt),
        expect(campaign.pledged).to.equal(0),
        expect(campaign.claimed).to.be.false,
      ]);
    });

    it("Donation의 Launch 함수 실행 시 이벤트가 정상적으로 발생하는지 확인", async () => {
      const count = await donation.count();

      await expect(donation.connect(admin).launch(users[0].address, "title", "description", goal, startAt, endAt))
        .to.emit(donation, "Launch")
        .withArgs(donation.count(), donation.campaigns(count.add(1)));
    });
  });
});
