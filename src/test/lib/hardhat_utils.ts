import { network, ethers } from "hardhat";
import { BigNumber } from "ethers";

export class HardhatUtil {
  static async mineNBlocks(n: number) {
    await network.provider.send("hardhat_mine", [ethers.utils.hexValue(n)]);
  }

  static setNextBlockTimestamp(timeStamp: number) {
    return network.provider.send("evm_setNextBlockTimestamp", [timeStamp]);
  }

  static blockNumber(): Promise<number> {
    return ethers.provider.getBlockNumber();
  }

  static async blockTimeStamp(): Promise<number> {
    return (await ethers.provider.getBlock("latest")).timestamp;
  }

  static async passNSeconds(seconds: number): Promise<number> {
    const blockTimeStamp = await HardhatUtil.blockTimeStamp();
    const currentBlockTimeStamp = blockTimeStamp + seconds;
    await HardhatUtil.setNextBlockTimestamp(currentBlockTimeStamp);
    await network.provider.send("hardhat_mine", [ethers.utils.hexValue(1)]);

    return currentBlockTimeStamp;
  }

  static ToBig(num: number): BigNumber {
    return BigNumber.from(num);
  }

  static ToETH(num: number): BigNumber {
    return ethers.utils.parseEther(num.toString());
  }

  static ToBigForStr(str: string): BigNumber {
    return BigNumber.from(str);
  }

  static ToETHForStr(str: string): BigNumber {
    return ethers.utils.parseEther(str);
  }

  static get1e18(): BigNumber {
    return BigNumber.from(1e10).mul(BigNumber.from(1e8));
  }

  static get1e36(): BigNumber {
    return BigNumber.from(1e10).mul(BigNumber.from(1e8)).mul(BigNumber.from(1e10)).mul(BigNumber.from(1e8));
  }

  static asciiToHex(str: string): string {
    const shortHexString = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(str));
    return ethers.utils.hexZeroPad(shortHexString, 32);
  }

  static mulExp(bigNum: BigNumber): BigNumber {
    return bigNum.mul(1e10).mul(1e8);
  }

  static mulDouble(bigNum: BigNumber): BigNumber {
    return bigNum.mul(1e10).mul(1e10).mul(1e8).mul(1e8);
  }

  static divExp(bigNum: BigNumber): BigNumber {
    return bigNum.div(1e10).div(1e8);
  }

  static divDouble(bigNum: BigNumber): BigNumber {
    return bigNum.div(1e10).div(1e10).div(1e8).div(1e8);
  }
}
