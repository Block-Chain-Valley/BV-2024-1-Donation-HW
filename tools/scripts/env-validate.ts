import { Network } from "@constants";

enum Command {
  COMPILE = "compile",
  TEST = "test",
}

const { NETWORK, DEVELOPER_ACCOUNT, DEVELOPER_PRIVATE_KEY, CHAIN_ID, PROVIDER_URL } = process.env;

export const validateEnv = () => {
  const isBuilding = process.argv[2] === Command.COMPILE;
  const isTesting = process.argv[2] === Command.TEST;

  if (isBuilding || isTesting) return;

  if (!NETWORK || !Object.values(Network).includes(NETWORK as Network))
    throw new Error("[Error] 네트워크를 설정하세요.");

  if (DEVELOPER_ACCOUNT === undefined || DEVELOPER_PRIVATE_KEY === undefined) {
    throw new Error("[Error] 환경변수 설정 오류입니다 (개발자 account 설정).");
  }

  if (NETWORK !== Network.hardhat.toString()) {
    if (!CHAIN_ID || !PROVIDER_URL) {
      throw new Error("[Error] 환경변수 설정 오류입니다 (PROVIDER_URL 설정).");
    }
  }
};

validateEnv();
