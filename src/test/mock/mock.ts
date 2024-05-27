import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { faker } from "@faker-js/faker";
import { HardhatUtil } from "../lib/hardhat_utils";

export const GAS_PER_TRANSACTION = ethers.utils.parseEther("0.001");

export interface CampaignInfo {
  target: string;
  title: string;
  description: string;
  goal: BigNumber;
  startAt: number;
  endAt: number;
}

export const mockCampaign = (data?: Partial<CampaignInfo>) => {
  const interval = 60 * 60 * 24;
  return {
    target: ethers.Wallet.createRandom().address,
    title: faker.lorem.words(),
    description: faker.lorem.sentence(),
    goal: ethers.utils.parseEther(faker.datatype.number({ min: 1, max: 1000 }).toString()),
    startAt: Math.floor(Date.now() / 1000) + interval,
    endAt: Math.floor(Date.now() / 1000) + interval * 31,
    ...data,
  };
};
